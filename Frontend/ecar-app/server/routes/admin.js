import express from 'express'
import bcrypt from 'bcryptjs'
import Showroom from '../models/Showroom.js'
import TestDriveBooking from '../models/TestDriveBooking.js'
import User from '../models/User.js'
import verifyToken from '../middleware/verifyToken.js'
import isAdmin from '../middleware/isAdmin.js'
import { asyncHandler, paginatedResponse, parsePagination } from '../utils/api.js'
import { createNotification, logActivity, releaseSlot } from '../utils/services.js'
import { sendEmailSafe } from '../utils/mailer.js'
import { bookingCompletedTemplate, bookingRejectedTemplate, showroomApprovedTemplate, userBookingConfirmationTemplate } from '../utils/emailTemplates.js'
import { DEFAULT_CLOSE_TIME, DEFAULT_OPEN_TIME, DEFAULT_SHOWROOM_DAYS, seedUpcomingAvailability } from '../utils/showroomSchedule.js'

const router = express.Router()

router.use(verifyToken, isAdmin)

const buildSyntheticShowroomEmail = (name) =>
    `${String(name || 'showroom')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'showroom'}-${Date.now()}@ecar.local`

const parseList = (value) => Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : String(value || '').split(',').map((item) => item.trim()).filter(Boolean)

const sanitizeShowroom = (showroom) => {
    const payload = showroom?.toObject ? showroom.toObject() : { ...showroom }
    if (payload?.password) delete payload.password
    return payload
}

const logSettledFailures = (results, context) => {
    results.forEach((result) => {
        if (result.status === 'rejected') {
            console.error(`Admin showroom side effect failed while ${context}`, result.reason)
        }
    })
}

const runSettledTasks = async (tasks, context) => {
    const results = await Promise.allSettled(tasks)
    logSettledFailures(results, context)
}

const buildShowroomFilter = ({ search = '', status = '' } = {}) => {
    const filter = {}
    const trimmedSearch = String(search || '').trim()
    const normalizedStatus = String(status || '').trim().toLowerCase()

    if (trimmedSearch) {
        filter.$or = [
            { name: { $regex: trimmedSearch, $options: 'i' } },
            { email: { $regex: trimmedSearch, $options: 'i' } },
            { 'address.city': { $regex: trimmedSearch, $options: 'i' } },
            { 'address.pincode': { $regex: trimmedSearch, $options: 'i' } },
        ]
    }

    if (normalizedStatus === 'pending') filter.isApproved = false
    if (normalizedStatus === 'approved') filter.isApproved = true
    if (normalizedStatus === 'active') filter.isActive = true
    if (normalizedStatus === 'inactive') filter.isActive = false

    return filter
}

const notifyAdminsAboutApprovedShowroom = async (showroom) => {
    const admins = await User.find({ role: 'admin', isActive: true }).select('_id')
    if (!admins.length) return

    await Promise.all(admins.map((admin) => createNotification({
        title: 'Showroom added',
        message: `${showroom.name} is now available for test drive bookings.`,
        targetRole: 'admin',
        targetId: admin._id,
        data: { showroomId: showroom._id },
    })))
}

router.get('/showrooms', asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req)
    const search = String(req.query.search || '')
    const status = String(req.query.status || '')
    const filter = buildShowroomFilter({ search, status })
    const pendingFilter = buildShowroomFilter({ search, status: 'pending' })
    const activeFilter = buildShowroomFilter({ search, status: 'active' })

    const [items, total, pendingCount, activeCount, cities] = await Promise.all([
        Showroom.find(filter)
            .select('-password')
            .sort({ isApproved: 1, createdAt: -1 })
            .skip(skip)
            .limit(limit),
        Showroom.countDocuments(filter),
        Showroom.countDocuments(pendingFilter),
        Showroom.countDocuments(activeFilter),
        Showroom.distinct('address.city', filter),
    ])
    const response = paginatedResponse({ data: items, total, page, limit })
    response.meta.pendingCount = pendingCount
    response.meta.activeCount = activeCount
    response.meta.cityCount = cities.filter(Boolean).length

    return res.json(response)
}))

const createShowroomHandler = asyncHandler(async (req, res) => {
    const {
        name,
        email,
        password,
        phone,
        contactNumber,
        address,
        street,
        city,
        state,
        pincode,
        brands,
        description,
        serviceRadius,
        servicePincodes,
        availableDays,
        openingHours,
    } = req.body

    if (!String(name || '').trim()) {
        return res.status(400).json({ success: false, message: 'Showroom name is required' })
    }

    const resolvedEmail = String(email || '').trim().toLowerCase() || buildSyntheticShowroomEmail(name)
    const existing = await Showroom.findOne({ email: resolvedEmail })
    const resolvedPassword = await bcrypt.hash(String(password || Math.random().toString(36).slice(2, 12)), 10)
    const addressString = String(address || '').trim()
    const resolvedStreet = street || addressString
    const showroomPayload = {
        name: String(name).trim(),
        email: resolvedEmail,
        phone: String(contactNumber || phone || '').trim(),
        brands: parseList(brands),
        address: {
            street: resolvedStreet,
            city: String(city || '').trim(),
            state: String(state || '').trim(),
            pincode: String(pincode || '').trim(),
        },
        description: String(description || '').trim(),
        serviceRadius: Number(serviceRadius || 0),
        servicePincodes: parseList(servicePincodes || pincode),
        availableDays: parseList(availableDays).length ? parseList(availableDays) : DEFAULT_SHOWROOM_DAYS,
        openingHours: {
            open: openingHours?.open || req.body.openingOpen || DEFAULT_OPEN_TIME,
            close: openingHours?.close || req.body.openingClose || DEFAULT_CLOSE_TIME,
        },
        isApproved: true,
        isActive: true,
    }

    let showroom
    let reusedPendingRequest = false

    if (existing) {
        if (existing.isApproved) {
            return res.status(409).json({ success: false, message: 'A showroom with this email already exists' })
        }

        reusedPendingRequest = true
        existing.name = showroomPayload.name
        existing.phone = showroomPayload.phone
        existing.brands = showroomPayload.brands
        existing.address = showroomPayload.address
        existing.description = showroomPayload.description
        existing.serviceRadius = showroomPayload.serviceRadius
        existing.servicePincodes = showroomPayload.servicePincodes
        existing.availableDays = showroomPayload.availableDays
        existing.openingHours = showroomPayload.openingHours
        existing.isApproved = true
        existing.isActive = true
        if (password) {
            existing.password = resolvedPassword
        }

        showroom = await existing.save()
    } else {
        showroom = await Showroom.create({
            ...showroomPayload,
            password: resolvedPassword,
        })
    }

    await runSettledTasks([
        seedUpcomingAvailability({ showroomId: showroom._id, showroom, days: 14 }),
        notifyAdminsAboutApprovedShowroom(showroom),
        logActivity({
            actorId: req.user.id,
            actorRole: 'admin',
            action: reusedPendingRequest ? 'SHOWROOM_APPROVED' : 'SHOWROOM_CREATED',
            entityType: 'Showroom',
            entityId: showroom._id,
            description: reusedPendingRequest
                ? `Approved showroom ${showroom.name} from admin intake`
                : `Created showroom ${showroom.name}`,
        }),
    ], reusedPendingRequest ? 'approving a pending showroom from admin intake' : 'creating an admin showroom')

    return res.status(reusedPendingRequest ? 200 : 201).json({
        success: true,
        data: sanitizeShowroom(showroom),
        meta: { reusedPendingRequest },
    })
})

router.post('/showrooms', createShowroomHandler)
router.post('/add-showroom', createShowroomHandler)

router.put('/showrooms/:id/approve', asyncHandler(async (req, res) => {
    const showroom = await Showroom.findById(req.params.id)
    if (!showroom) {
        return res.status(404).json({ success: false, message: 'Showroom not found' })
    }

    showroom.isApproved = true
    showroom.isActive = true
    await showroom.save()

    await runSettledTasks([
        createNotification({
            title: 'Showroom approved',
            message: 'Your showroom profile has been approved. You can now log in and start managing bookings.',
            targetRole: 'showroom',
            targetId: showroom._id,
        }),
        seedUpcomingAvailability({ showroomId: showroom._id, showroom, days: 14 }),
        logActivity({
            actorId: req.user.id,
            actorRole: 'admin',
            action: 'SHOWROOM_APPROVED',
            entityType: 'Showroom',
            entityId: showroom._id,
            description: `Approved showroom ${showroom.name}`,
        }),
        sendEmailSafe({ to: showroom.email, ...showroomApprovedTemplate(showroom.name) }),
    ], `approving showroom ${showroom._id}`)

    return res.json({ success: true, data: showroom })
}))

router.put('/showrooms/:id/deactivate', asyncHandler(async (req, res) => {
    const showroom = await Showroom.findByIdAndUpdate(
        req.params.id,
        { isActive: false },
        { new: true },
    ).select('-password')

    if (!showroom) {
        return res.status(404).json({ success: false, message: 'Showroom not found' })
    }

    await logActivity({
        actorId: req.user.id,
        actorRole: 'admin',
        action: 'SHOWROOM_DEACTIVATED',
        entityType: 'Showroom',
        entityId: showroom._id,
        description: `Deactivated showroom ${showroom.name}`,
    })

    return res.json({ success: true, data: showroom })
}))

router.delete('/showrooms/:id', asyncHandler(async (req, res) => {
    const showroom = await Showroom.findByIdAndDelete(req.params.id)
    if (!showroom) {
        return res.status(404).json({ success: false, message: 'Showroom not found' })
    }

    await logActivity({
        actorId: req.user.id,
        actorRole: 'admin',
        action: 'SHOWROOM_DELETED',
        entityType: 'Showroom',
        entityId: showroom._id,
        description: `Deleted showroom ${showroom.name}`,
    })

    return res.json({ success: true, data: { id: showroom._id } })
}))

router.get('/bookings', asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req)
    const filter = {}
    if (req.query.status) filter.status = req.query.status

    const [items, total] = await Promise.all([
        TestDriveBooking.find(filter)
            .populate('user', 'name email phone')
            .populate('car', 'name brand price')
            .populate('showroom', 'name email phone address')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        TestDriveBooking.countDocuments(filter),
    ])

    return res.json(paginatedResponse({ data: items, total, page, limit }))
}))

router.get('/bookings/all', asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req)
    const [items, total] = await Promise.all([
        TestDriveBooking.find({})
            .populate('user', 'name email phone')
            .populate('car', 'name brand price')
            .populate('showroom', 'name email phone address')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        TestDriveBooking.countDocuments({}),
    ])

    return res.json(paginatedResponse({ data: items, total, page, limit }))
}))

router.patch('/bookings/:id', asyncHandler(async (req, res) => {
    const nextStatus = String(req.body.status || '').trim().toLowerCase()
    const note = String(req.body.note || '').trim()
    if (!['confirmed', 'completed', 'cancelled', 'rejected'].includes(nextStatus)) {
        return res.status(400).json({ success: false, message: 'Invalid booking status' })
    }

    const booking = await TestDriveBooking.findById(req.params.id)
        .populate('user', 'name email')
        .populate('car', 'name')
        .populate('showroom', 'name address')

    if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found' })
    }

    const previousStatus = booking.status
    booking.status = nextStatus
    booking.showroomResponse = {
        message: note || `Booking ${nextStatus} by admin`,
        respondedAt: new Date(),
    }
    booking.statusHistory.push({
        status: nextStatus,
        updatedBy: req.user.name || 'Admin',
        updatedByRole: 'admin',
        note: note || `Booking ${nextStatus} by admin`,
    })
    await booking.save()

    if (previousStatus !== nextStatus && ['cancelled', 'rejected'].includes(nextStatus)) {
        await releaseSlot({ showroomId: booking.showroom?._id || booking.showroom, date: booking.scheduledDate, time: booking.scheduledTime })
    }

    await Promise.all([
        createNotification({
            title: `Booking ${nextStatus}`,
            message: `Your test drive request ${booking.bookingId} is now ${nextStatus}.`,
            targetRole: 'user',
            targetId: booking.user._id,
            data: { bookingId: booking._id, status: nextStatus },
        }),
        createNotification({
            title: 'Booking updated by admin',
            message: `Booking ${booking.bookingId} for ${booking.car?.name || 'a car'} was marked ${nextStatus}.`,
            targetRole: 'showroom',
            targetId: booking.showroom?._id || booking.showroom,
            data: { bookingId: booking._id, status: nextStatus },
        }),
        logActivity({
            actorId: req.user.id,
            actorRole: 'admin',
            action: 'BOOKING_STATUS_UPDATED',
            entityType: 'TestDriveBooking',
            entityId: booking._id,
            description: `Marked booking ${booking.bookingId} as ${nextStatus}`,
            meta: { previousStatus, nextStatus },
        }),
    ])

    const showroomAddress = [
        booking.showroom?.address?.street,
        booking.showroom?.address?.city,
        booking.showroom?.address?.state,
        booking.showroom?.address?.pincode,
    ].filter(Boolean).join(', ')

    if (nextStatus === 'confirmed') {
        await sendEmailSafe({
            to: booking.user?.email,
            ...userBookingConfirmationTemplate({
                userName: booking.user?.name || booking.userDetails?.fullName,
                bookingId: booking.bookingId,
                carName: booking.car?.name || 'Selected car',
                date: new Date(booking.scheduledDate).toLocaleDateString('en-IN'),
                time: booking.scheduledTime,
                showroomName: booking.showroom?.name || 'E-CAR Showroom',
                showroomAddress,
                staffName: 'Admin Desk',
                staffPhone: '',
            }),
        })
    }

    if (nextStatus === 'completed') {
        const ratingLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/user/bookings/${booking._id}`
        await sendEmailSafe({
            to: booking.user?.email,
            ...bookingCompletedTemplate({
                userName: booking.user?.name || booking.userDetails?.fullName,
                bookingId: booking.bookingId,
                ratingLink,
            }),
        })
    }

    if (nextStatus === 'cancelled' || nextStatus === 'rejected') {
        await sendEmailSafe({
            to: booking.user?.email,
            ...bookingRejectedTemplate({
                userName: booking.user?.name || booking.userDetails?.fullName,
                bookingId: booking.bookingId,
                reason: note || `Booking ${nextStatus} by admin`,
            }),
        })
    }

    return res.json({ success: true, data: booking })
}))

router.get('/bookings/stats', asyncHandler(async (_req, res) => {
    const [total, pending, confirmed, completed, cancelled, rejected] = await Promise.all([
        TestDriveBooking.countDocuments(),
        TestDriveBooking.countDocuments({ status: 'pending' }),
        TestDriveBooking.countDocuments({ status: 'confirmed' }),
        TestDriveBooking.countDocuments({ status: 'completed' }),
        TestDriveBooking.countDocuments({ status: 'cancelled' }),
        TestDriveBooking.countDocuments({ status: 'rejected' }),
    ])

    return res.json({
        success: true,
        data: { total, pending, confirmed, completed, cancelled, rejected },
    })
}))

export default router
