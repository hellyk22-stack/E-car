import express from 'express'
import Showroom from '../models/Showroom.js'
import ShowroomAvailability from '../models/ShowroomAvailability.js'
import TestDriveBooking from '../models/TestDriveBooking.js'
import User from '../models/User.js'
import Car from '../models/Car.js'
import PriceAlert from '../models/PriceAlert.js'
import verifyToken from '../middleware/verifyToken.js'
import { attachPlanContext, checkFeature } from '../middleware/checkFeature.js'
import { upload } from '../middleware/upload.js'
import { asyncHandler, buildBookingId, normalizeDateOnly, paginatedResponse, parsePagination } from '../utils/api.js'
import { createNotification, logActivity, reserveSlot, releaseSlot } from '../utils/services.js'
import { uploadToCloudinary } from '../utils/uploadToCloudinary.js'
import { sendEmailSafe } from '../utils/mailer.js'
import { isUnlimited } from '../utils/subscriptionHelpers.js'
import { ensureAvailabilityForDate } from '../utils/showroomSchedule.js'

const router = express.Router()

const normalizeBookingType = (value) => {
    if (value === 'home') return 'home_delivery'
    if (value === 'showroom') return 'at_showroom'
    return value
}

const matchesShowroomBrand = (showroom, brand) => {
    if (!brand) return true
    const normalizedBrand = String(brand).trim().toLowerCase()
    if (!normalizedBrand) return true

    const explicitBrands = Array.isArray(showroom.brands) ? showroom.brands : []
    if (explicitBrands.some((item) => String(item).toLowerCase() === normalizedBrand)) {
        return true
    }

    return (showroom.cars || []).some((item) => String(item?.carId?.brand || '').toLowerCase() === normalizedBrand)
}

const applyShowroomRanking = (items, { brand, pincode, city, carId }) => items
    .map((showroom) => {
        let score = 0

        if (carId && showroom.availableCars?.some((item) => String(item) === String(carId))) score += 5
        if (brand && matchesShowroomBrand(showroom, brand)) score += 3
        if (pincode && showroom.servicePincodes?.includes(String(pincode).trim())) score += 2
        if (city && String(showroom.address?.city || '').toLowerCase() === String(city).trim().toLowerCase()) score += 1

        return { ...showroom, matchScore: score }
    })
    .filter((showroom) => (!brand || showroom.matchScore > 0 || matchesShowroomBrand(showroom, brand)))
    .sort((a, b) => b.matchScore - a.matchScore || new Date(b.createdAt) - new Date(a.createdAt))

const listShowroomsHandler = asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req)
    const brand = String(req.query.brand || '').trim()
    const city = String(req.query.city || '').trim()
    const pincode = String(req.query.pincode || '').trim()
    const carId = String(req.query.carId || '').trim()
    const filter = { isApproved: true, isActive: true }

    if (city) {
        filter['address.city'] = { $regex: city, $options: 'i' }
    }
    if (pincode && req.path.includes('/nearby')) {
        filter.servicePincodes = pincode
    }

    const [items, total] = await Promise.all([
        Showroom.find(filter)
            .select('-password')
            .populate('cars.carId', 'name brand price fuel transmission image')
            .sort({ createdAt: -1 }),
        Showroom.countDocuments(filter),
    ])

    const rankedItems = applyShowroomRanking(items.map((item) => item.toObject()), { brand, pincode, city, carId })
    const paged = rankedItems.slice(skip, skip + limit)

    return res.json(paginatedResponse({ data: paged, total: rankedItems.length, page, limit }))
})

router.get('/showrooms', listShowroomsHandler)

router.get('/showrooms/nearby', listShowroomsHandler)

router.get('/showrooms/:id', asyncHandler(async (req, res) => {
    const showroom = await Showroom.findOne({
        _id: req.params.id,
        isApproved: true,
        isActive: true,
    }).populate('cars.carId')

    if (!showroom) {
        return res.status(404).json({ success: false, message: 'Showroom not found' })
    }

    return res.json({ success: true, data: showroom })
}))

router.get('/showrooms/:id/availability', asyncHandler(async (req, res) => {
    const date = normalizeDateOnly(req.query.date)
    const showroom = await Showroom.findOne({
        _id: req.params.id,
        isApproved: true,
        isActive: true,
    })
    if (!showroom) {
        return res.status(404).json({ success: false, message: 'Showroom not found' })
    }

    const availability = await ensureAvailabilityForDate({
        showroomId: req.params.id,
        date,
        showroom,
    })

    return res.json({
        success: true,
        data: availability?.slots?.filter((slot) => !slot.isBooked) || [],
    })
}))

const uploadLicenseHandler = asyncHandler(async (req, res) => {
    const image = await uploadToCloudinary(req.file, 'ecar/licenses')
    return res.status(201).json({ success: true, data: { image } })
})

router.post('/bookings/temp/upload-license', verifyToken, upload.single('licenseImage'), uploadLicenseHandler)
router.post('/bookings/:bookingId/upload-license', verifyToken, upload.single('licenseImage'), uploadLicenseHandler)

const createBookingHandler = asyncHandler(async (req, res) => {
    if (!['user', 'customer'].includes(req.user.role)) {
        return res.status(403).json({ success: false, message: 'Only users can create bookings' })
    }

    const {
        showroom: showroomIdFromLegacy,
        showroomId: showroomIdFromModern,
        car: carIdFromLegacy,
        carId: carIdFromModern,
        bookingType,
        type,
        scheduledDate,
        scheduledTime,
        userDetails,
        preferredDate,
        preferredTime,
        details,
    } = req.body

    const showroomId = showroomIdFromModern || showroomIdFromLegacy
    const carId = carIdFromModern || carIdFromLegacy
    const normalizedBookingType = normalizeBookingType(type || bookingType)
    const normalizedUserDetails = userDetails || {
        fullName: details?.fullName || req.accountUser?.name || req.user?.name || '',
        phone: details?.phone || req.accountUser?.phone || '',
        address: details?.address || '',
        pincode: details?.pincode || '',
        drivingLicense: {
            number: details?.licenseNumber || details?.drivingLicense?.number,
            expiryDate: details?.licenseExpiry || details?.drivingLicense?.expiryDate,
            image: details?.licenseImage || details?.drivingLicense?.image || '',
        },
    }
    const finalScheduledDate = preferredDate || scheduledDate
    const finalScheduledTime = preferredTime || scheduledTime || details?.slot

    if (!['home_delivery', 'at_showroom'].includes(normalizedBookingType)) {
        return res.status(400).json({ success: false, message: 'Invalid booking type' })
    }

    if (!normalizedUserDetails?.drivingLicense?.number || !normalizedUserDetails?.drivingLicense?.expiryDate) {
        return res.status(400).json({ success: false, message: 'Driving license details are required' })
    }

    const [showroom, car, activeBookingsCount] = await Promise.all([
        Showroom.findById(showroomId),
        Car.findById(carId),
        TestDriveBooking.countDocuments({
            user: req.accountUser._id,
            status: { $in: ['pending', 'confirmed'] },
        }),
    ])
    const user = req.accountUser

    if (!user || !showroom || !car) {
        return res.status(404).json({ success: false, message: 'User, showroom, or car not found' })
    }
    if (!showroom.isApproved || !showroom.isActive) {
        return res.status(400).json({ success: false, message: 'Selected showroom is unavailable' })
    }
    const carInShowroom = showroom.cars.some((item) => String(item.carId) === String(carId))
    if (!carInShowroom) {
        return res.status(400).json({ success: false, message: 'Selected car is not available at this showroom' })
    }
    if (!finalScheduledDate || !finalScheduledTime) {
        return res.status(400).json({ success: false, message: 'Preferred date and time are required' })
    }
    if (normalizedBookingType === 'home_delivery' && !showroom.servicePincodes.includes(String(normalizedUserDetails?.pincode || '').trim())) {
        return res.status(400).json({ success: false, message: 'Home test drive is not available for this pincode' })
    }

    const bookingLimit = req.planLimits.activeBookingsLimit
    if (!isUnlimited(bookingLimit) && activeBookingsCount >= bookingLimit) {
        return res.status(403).json({
            success: false,
            message: 'Upgrade required',
            requiredPlan: bookingLimit <= 1 ? 'pro_buyer' : 'elite',
            feature: 'activeBookingsLimit',
        })
    }

    const booking = await TestDriveBooking.create({
        bookingId: buildBookingId(),
        user: user._id,
        showroom: showroom._id,
        car: car._id,
        bookingType: normalizedBookingType,
        scheduledDate: normalizeDateOnly(finalScheduledDate),
        scheduledTime: finalScheduledTime,
        userDetails: normalizedUserDetails,
        status: 'pending',
        statusHistory: [{
            status: 'pending',
            updatedBy: user.name,
            updatedByRole: 'user',
            note: 'Booking submitted',
        }],
    })

    await ensureAvailabilityForDate({
        showroomId: showroom._id,
        date: booking.scheduledDate,
        showroom,
    })
    await reserveSlot({
        showroomId: showroom._id,
        date: booking.scheduledDate,
        time: booking.scheduledTime,
        bookingMongoId: booking._id,
    })

    await createNotification({
        title: 'New test drive booking',
        message: `${user.name} requested a ${normalizedBookingType === 'home_delivery' ? 'home' : 'showroom'} test drive for ${car.name}.`,
        targetRole: 'showroom',
        targetId: showroom._id,
        data: { bookingId: booking._id },
    })
    await createNotification({
        title: 'Test drive request sent',
        message: `Your request ${booking.bookingId} is waiting for approval from ${showroom.name}.`,
        targetRole: 'user',
        targetId: user._id,
        data: { bookingId: booking._id, status: 'pending' },
    })
    await logActivity({
        actorId: user._id,
        actorRole: 'user',
        action: 'TEST_DRIVE_BOOKING_CREATED',
        entityType: 'TestDriveBooking',
        entityId: booking._id,
        description: `Created booking ${booking.bookingId}`,
        meta: { showroomId: showroom._id, carId: car._id },
    })
    await sendEmailSafe({
        to: user.email,
        subject: `Booking received: ${booking.bookingId}`,
        html: `<p>Hello ${user.name},</p><p>We received your test drive booking request for <strong>${car.name}</strong> on ${new Date(booking.scheduledDate).toLocaleDateString('en-IN')} at ${booking.scheduledTime}.</p>`,
    })

    return res.status(201).json({ success: true, data: booking })
})

router.post('/bookings', verifyToken, attachPlanContext, createBookingHandler)
router.post('/test-drives', verifyToken, attachPlanContext, createBookingHandler)

router.get('/bookings', verifyToken, asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req)
    const filter = { user: req.user.id }
    if (req.query.status) filter.status = req.query.status

    const [items, total] = await Promise.all([
        TestDriveBooking.find(filter)
            .populate('showroom', 'name phone logo address')
            .populate('car', 'name brand price image')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        TestDriveBooking.countDocuments(filter),
    ])

    return res.json(paginatedResponse({ data: items, total, page, limit }))
}))

router.get('/bookings/:bookingId', verifyToken, asyncHandler(async (req, res) => {
    const booking = await TestDriveBooking.findOne({
        _id: req.params.bookingId,
        user: req.user.id,
    })
        .populate('showroom', 'name phone email logo address openingHours availableDays')
        .populate('car', 'name brand price image')

    if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found' })
    }

    return res.json({ success: true, data: booking })
}))

router.post('/bookings/:bookingId/cancel', verifyToken, asyncHandler(async (req, res) => {
    const booking = await TestDriveBooking.findOne({
        _id: req.params.bookingId,
        user: req.user.id,
    })

    if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found' })
    }
    if (booking.status !== 'pending') {
        return res.status(400).json({ success: false, message: 'Only pending bookings can be cancelled' })
    }

    booking.status = 'cancelled'
    booking.statusHistory.push({
        status: 'cancelled',
        updatedBy: req.user.name || 'User',
        updatedByRole: 'user',
        note: req.body.reason || 'Cancelled by user',
    })
    await booking.save()
    await releaseSlot({ showroomId: booking.showroom, date: booking.scheduledDate, time: booking.scheduledTime })

    return res.json({ success: true, data: booking })
}))

router.post('/bookings/:bookingId/rate', verifyToken, asyncHandler(async (req, res) => {
    const { stars, review } = req.body
    const booking = await TestDriveBooking.findOne({
        _id: req.params.bookingId,
        user: req.user.id,
    })

    if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found' })
    }
    if (booking.status !== 'completed') {
        return res.status(400).json({ success: false, message: 'Only completed bookings can be rated' })
    }

    booking.userRating = {
        stars: Number(stars),
        review,
        ratedAt: new Date(),
    }
    await booking.save()

    const showroom = await Showroom.findById(booking.showroom)
    const currentTotal = showroom.rating.average * showroom.rating.count
    showroom.rating.count += 1
    showroom.rating.average = (currentTotal + Number(stars)) / showroom.rating.count
    await showroom.save()

    return res.json({ success: true, data: booking })
}))

router.post('/price-alerts', verifyToken, attachPlanContext, checkFeature('priceAlerts'), asyncHandler(async (req, res) => {
    const { carId, targetPrice } = req.body
    const car = await Car.findById(carId)

    if (!car) {
        return res.status(404).json({ success: false, message: 'Car not found' })
    }

    const alert = await PriceAlert.findOneAndUpdate(
        { user: req.accountUser._id, car: car._id },
        {
            user: req.accountUser._id,
            car: car._id,
            targetPrice: Number(targetPrice),
            currentPriceAtAlert: Number(car.price || 0),
            isTriggered: false,
            triggeredAt: null,
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
    )

    req.accountUser.priceAlerts = [
        ...req.accountUser.priceAlerts.filter((item) => String(item.carId) !== String(car._id)),
        {
            carId: car._id,
            targetPrice: Number(targetPrice),
            createdAt: new Date(),
        },
    ]
    await req.accountUser.save()

    await logActivity({
        actorId: req.accountUser._id,
        actorRole: 'user',
        action: 'PRICE_ALERT_CREATED',
        entityType: 'PriceAlert',
        entityId: alert._id,
        description: `Created price alert for ${car.name}`,
        meta: { carId: car._id, targetPrice: Number(targetPrice) },
    })

    return res.status(201).json({ success: true, data: alert })
}))

router.get('/price-alerts', verifyToken, attachPlanContext, checkFeature('priceAlerts'), asyncHandler(async (req, res) => {
    const alerts = await PriceAlert.find({ user: req.accountUser._id })
        .populate('car', 'name brand price image fuel transmission')
        .sort({ createdAt: -1 })

    return res.json({ success: true, data: alerts })
}))

router.delete('/price-alerts/:id', verifyToken, attachPlanContext, checkFeature('priceAlerts'), asyncHandler(async (req, res) => {
    const alert = await PriceAlert.findOneAndDelete({ _id: req.params.id, user: req.accountUser._id })
    if (!alert) {
        return res.status(404).json({ success: false, message: 'Price alert not found' })
    }

    req.accountUser.priceAlerts = req.accountUser.priceAlerts.filter((item) => String(item.carId) !== String(alert.car))
    await req.accountUser.save()

    return res.json({ success: true, data: { deleted: true } })
}))

export default router
