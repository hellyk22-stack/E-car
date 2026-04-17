import express from 'express'
import Showroom from '../models/Showroom.js'
import Car from '../models/Car.js'
import Notification from '../models/Notification.js'
import TestDriveBooking from '../models/TestDriveBooking.js'
import ShowroomAvailability from '../models/ShowroomAvailability.js'
import verifyToken from '../middleware/verifyToken.js'
import isShowroom from '../middleware/isShowroom.js'
import { upload } from '../middleware/upload.js'
import { asyncHandler, normalizeDateOnly, paginatedResponse, parsePagination } from '../utils/api.js'
import { createNotification, releaseSlot } from '../utils/services.js'
import { bookingCompletedTemplate, bookingRejectedTemplate, userBookingConfirmationTemplate } from '../utils/emailTemplates.js'
import { sendEmailSafe } from '../utils/mailer.js'
import { uploadToCloudinary } from '../utils/uploadToCloudinary.js'

const router = express.Router()

router.use(verifyToken, isShowroom)

const getShowroomId = (req) => req.user?.showroomId || req.user?.id

router.get('/profile', asyncHandler(async (req, res) => {
    const showroom = await Showroom.findById(getShowroomId(req)).select('-password')
    return res.json({ success: true, data: showroom })
}))

router.put('/profile', upload.single('logo'), asyncHandler(async (req, res) => {
    const showroom = await Showroom.findById(getShowroomId(req))
    if (!showroom) {
        return res.status(404).json({ success: false, message: 'Showroom not found' })
    }

    const logo = req.file ? await uploadToCloudinary(req.file, 'ecar/showrooms') : undefined
    const { name, email, phone, description, serviceRadius, servicePincodes, availableDays, openingHours, street, city, state, pincode, lat, lng, staff } = req.body

    if (name !== undefined) showroom.name = name
    if (email !== undefined) showroom.email = email
    if (phone !== undefined) showroom.phone = phone
    if (description !== undefined) showroom.description = description
    if (serviceRadius !== undefined) showroom.serviceRadius = Number(serviceRadius)
    if (servicePincodes !== undefined) {
        showroom.servicePincodes = Array.isArray(servicePincodes)
            ? servicePincodes
            : String(servicePincodes).split(',').map((item) => item.trim()).filter(Boolean)
    }
    if (availableDays !== undefined) {
        showroom.availableDays = Array.isArray(availableDays)
            ? availableDays
            : String(availableDays).split(',').map((item) => item.trim()).filter(Boolean)
    }
    if (openingHours !== undefined) {
        showroom.openingHours = typeof openingHours === 'string' ? JSON.parse(openingHours) : openingHours
    }
    showroom.address = {
        street: street ?? showroom.address?.street,
        city: city ?? showroom.address?.city,
        state: state ?? showroom.address?.state,
        pincode: pincode ?? showroom.address?.pincode,
    }
    showroom.location = {
        lat: lat !== undefined ? Number(lat) : showroom.location?.lat,
        lng: lng !== undefined ? Number(lng) : showroom.location?.lng,
    }
    if (logo) showroom.logo = logo
    if (staff !== undefined) {
        showroom.staff = typeof staff === 'string' ? JSON.parse(staff) : staff
    }

    await showroom.save()
    return res.json({ success: true, data: showroom })
}))

router.get('/cars', asyncHandler(async (req, res) => {
    const showroom = await Showroom.findById(getShowroomId(req)).populate('cars.carId')
    return res.json({ success: true, data: showroom?.cars || [] })
}))

router.post('/cars', asyncHandler(async (req, res) => {
    const showroom = await Showroom.findById(getShowroomId(req))
    const { carId, customPrice } = req.body
    const car = await Car.findById(carId)

    if (!showroom || !car) {
        return res.status(404).json({ success: false, message: 'Showroom or car not found' })
    }

    const exists = showroom.cars.some((item) => String(item.carId) === String(carId))
    if (exists) {
        return res.status(409).json({ success: false, message: 'Car already exists in showroom inventory' })
    }

    showroom.cars.push({ carId, customPrice: customPrice ? Number(customPrice) : undefined })
    if (!showroom.availableCars.some((item) => String(item) === String(carId))) {
        showroom.availableCars.push(car._id)
    }
    if (!car.showrooms.some((item) => String(item) === String(showroom._id))) {
        car.showrooms.push(showroom._id)
    }
    if (customPrice) {
        car.priceHistory.push({
            price: Number(customPrice),
            updatedBy: showroom.name,
            updatedByRole: 'showroom',
            date: new Date(),
            note: `Custom showroom price for ${showroom.name}`,
        })
    }

    await Promise.all([showroom.save(), car.save()])
    return res.status(201).json({ success: true, data: showroom.cars[showroom.cars.length - 1] })
}))

router.delete('/cars/:carId', asyncHandler(async (req, res) => {
    const showroom = await Showroom.findById(getShowroomId(req))
    const car = await Car.findById(req.params.carId)
    if (!showroom || !car) {
        return res.status(404).json({ success: false, message: 'Showroom or car not found' })
    }

    showroom.cars = showroom.cars.filter((item) => String(item.carId) !== req.params.carId)
    showroom.availableCars = showroom.availableCars.filter((item) => String(item) !== req.params.carId)
    car.showrooms = car.showrooms.filter((item) => String(item) !== String(showroom._id))

    await Promise.all([showroom.save(), car.save()])
    return res.json({ success: true, data: showroom.cars })
}))

router.get('/bookings', asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req)
    const filter = { showroom: getShowroomId(req) }
    if (req.query.status) filter.status = req.query.status
    if (req.query.date) filter.scheduledDate = normalizeDateOnly(req.query.date)

    const [items, total] = await Promise.all([
        TestDriveBooking.find(filter)
            .populate('user', 'name email phone')
            .populate('car', 'name brand price image')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        TestDriveBooking.countDocuments(filter),
    ])

    return res.json(paginatedResponse({ data: items, total, page, limit }))
}))

router.put('/bookings/:bookingId/confirm', asyncHandler(async (req, res) => {
    const booking = await TestDriveBooking.findOne({
        _id: req.params.bookingId,
        showroom: getShowroomId(req),
    }).populate('user', 'name email').populate('car', 'name').populate('showroom')

    if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found' })
    }

    const { name, phone, message } = req.body
    booking.status = 'confirmed'
    booking.assignedStaff = { name, phone }
    booking.showroomResponse = { message, respondedAt: new Date() }
    booking.confirmationReceiptSent = true
    booking.statusHistory.push({
        status: 'confirmed',
        updatedBy: req.user.name || 'Showroom',
        updatedByRole: 'showroom',
        note: message || 'Booking confirmed',
    })

    await booking.save()

    const address = [booking.showroom?.address?.street, booking.showroom?.address?.city, booking.showroom?.address?.state, booking.showroom?.address?.pincode]
        .filter(Boolean)
        .join(', ')
    const mail = userBookingConfirmationTemplate({
        userName: booking.user?.name || booking.userDetails?.fullName,
        bookingId: booking.bookingId,
        carName: booking.car?.name || 'Selected car',
        date: new Date(booking.scheduledDate).toLocaleDateString('en-IN'),
        time: booking.scheduledTime,
        showroomName: booking.showroom?.name || 'E-CAR Showroom',
        showroomAddress: address,
        staffName: name,
        staffPhone: phone,
    })
    await sendEmailSafe({ to: booking.user?.email, ...mail })
    await createNotification({
        title: 'Test drive confirmed',
        message: `Your booking ${booking.bookingId} has been confirmed for ${booking.scheduledTime}.`,
        targetRole: 'user',
        targetId: booking.user._id,
        data: { bookingId: booking._id, status: 'confirmed' },
    })

    return res.json({ success: true, data: booking })
}))

router.put('/bookings/:bookingId/reject', asyncHandler(async (req, res) => {
    const booking = await TestDriveBooking.findOne({
        _id: req.params.bookingId,
        showroom: getShowroomId(req),
    }).populate('user', 'name email')

    if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found' })
    }

    const reason = req.body.reason || 'Booking rejected by showroom'
    booking.status = 'rejected'
    booking.showroomResponse = { message: reason, respondedAt: new Date() }
    booking.statusHistory.push({
        status: 'rejected',
        updatedBy: req.user.name || 'Showroom',
        updatedByRole: 'showroom',
        note: reason,
    })
    await booking.save()
    await releaseSlot({ showroomId: booking.showroom, date: booking.scheduledDate, time: booking.scheduledTime })

    await createNotification({
        title: 'Test drive rejected',
        message: `Your booking ${booking.bookingId} was rejected. Reason: ${reason}`,
        targetRole: 'user',
        targetId: booking.user._id,
        data: { bookingId: booking._id, status: 'rejected' },
    })

    const mail = bookingRejectedTemplate({
        userName: booking.user?.name || booking.userDetails.fullName,
        bookingId: booking.bookingId,
        reason,
    })
    await sendEmailSafe({ to: booking.user?.email, ...mail })

    return res.json({ success: true, data: booking })
}))

router.put('/bookings/:bookingId/complete', asyncHandler(async (req, res) => {
    const booking = await TestDriveBooking.findOne({
        _id: req.params.bookingId,
        showroom: getShowroomId(req),
    }).populate('user', 'name email')

    if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found' })
    }

    booking.status = 'completed'
    booking.statusHistory.push({
        status: 'completed',
        updatedBy: req.user.name || 'Showroom',
        updatedByRole: 'showroom',
        note: req.body.note || 'Test drive completed',
    })
    await booking.save()

    const ratingLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/user/bookings/${booking._id}`
    const mail = bookingCompletedTemplate({
        userName: booking.user?.name || booking.userDetails.fullName,
        bookingId: booking.bookingId,
        ratingLink,
    })
    await sendEmailSafe({ to: booking.user?.email, ...mail })
    await createNotification({
        title: 'Test drive completed',
        message: `Your booking ${booking.bookingId} has been marked as completed.`,
        targetRole: 'user',
        targetId: booking.user._id,
        data: { bookingId: booking._id, status: 'completed' },
    })

    return res.json({ success: true, data: booking })
}))

router.get('/availability', asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req)
    const filter = { showroom: getShowroomId(req) }
    if (req.query.date) filter.date = normalizeDateOnly(req.query.date)

    const [items, total] = await Promise.all([
        ShowroomAvailability.find(filter).sort({ date: 1 }).skip(skip).limit(limit),
        ShowroomAvailability.countDocuments(filter),
    ])

    return res.json(paginatedResponse({ data: items, total, page, limit }))
}))

router.post('/availability', asyncHandler(async (req, res) => {
    const { date, slots } = req.body
    const day = normalizeDateOnly(date)
    const showroomId = getShowroomId(req)

    const availability = await ShowroomAvailability.findOneAndUpdate(
        { showroom: showroomId, date: day },
        {
            showroom: showroomId,
            date: day,
            slots: Array.isArray(slots)
                ? slots.map((slot) => ({
                    time: typeof slot === 'string' ? slot : slot.time,
                    isBooked: typeof slot === 'object' ? !!slot.isBooked : false,
                    bookingId: typeof slot === 'object' ? slot.bookingId : undefined,
                }))
                : [],
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
    )

    return res.status(201).json({ success: true, data: availability })
}))

router.get('/notifications', asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req)
    const filter = { targetRole: 'showroom', targetId: getShowroomId(req) }

    const [items, total] = await Promise.all([
        Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Notification.countDocuments(filter),
    ])

    return res.json(paginatedResponse({ data: items, total, page, limit }))
}))

export default router
