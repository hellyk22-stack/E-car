import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import Showroom from '../models/Showroom.js'
import User from '../models/User.js'
import { upload } from '../middleware/upload.js'
import { uploadToCloudinary } from '../utils/uploadToCloudinary.js'
import { showroomRegistrationReceivedTemplate } from '../utils/emailTemplates.js'
import { sendEmailSafe } from '../utils/mailer.js'
import { asyncHandler } from '../utils/api.js'
import { createNotification } from '../utils/services.js'
import { DEFAULT_SHOWROOM_DAYS, DEFAULT_OPEN_TIME, DEFAULT_CLOSE_TIME, seedUpcomingAvailability } from '../utils/showroomSchedule.js'

const router = express.Router()

const logSettledFailures = (results, context) => {
    results.forEach((result) => {
        if (result.status === 'rejected') {
            console.error(`Showroom auth side effect failed while ${context}`, result.reason)
        }
    })
}

const runSettledTasks = async (tasks, context) => {
    const results = await Promise.allSettled(tasks)
    logSettledFailures(results, context)
}

router.post('/register', upload.single('logo'), asyncHandler(async (req, res) => {
    const {
        name,
        email,
        password,
        phone,
        street,
        city,
        state,
        pincode,
        description,
        brands,
        serviceRadius,
        servicePincodes,
        availableDays,
        openingOpen,
        openingClose,
        lat,
        lng,
    } = req.body

    const existing = await Showroom.findOne({ email: String(email).toLowerCase() })
    if (existing) {
        return res.status(409).json({ success: false, message: 'Showroom email already registered' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const logo = await uploadToCloudinary(req.file, 'ecar/showrooms')

    const showroom = await Showroom.create({
        name,
        email,
        password: hashedPassword,
        phone,
        description,
        logo,
        brands: brands
            ? String(brands).split(',').map((item) => item.trim()).filter(Boolean)
            : [],
        serviceRadius: Number(serviceRadius || 0),
        servicePincodes: servicePincodes
            ? String(servicePincodes).split(',').map((item) => item.trim()).filter(Boolean)
            : [],
        availableDays: availableDays
            ? String(availableDays).split(',').map((item) => item.trim()).filter(Boolean)
            : DEFAULT_SHOWROOM_DAYS,
        openingHours: {
            open: openingOpen || DEFAULT_OPEN_TIME,
            close: openingClose || DEFAULT_CLOSE_TIME,
        },
        address: { street, city, state, pincode },
        location: { lat: Number(lat || 0), lng: Number(lng || 0) },
        isApproved: false,
        isActive: true,
    })

    const admins = await User.find({ role: 'admin', isActive: true }).select('_id name')
    const mail = showroomRegistrationReceivedTemplate(showroom.name)

    await runSettledTasks([
        ...admins.map((admin) => createNotification({
            title: 'New showroom approval request',
            message: `${showroom.name} requested approval${city ? ` from ${city}` : ''}${pincode ? ` (${pincode})` : ''}.`,
            targetRole: 'admin',
            targetId: admin._id,
            data: {
                showroomId: showroom._id,
                showroomName: showroom.name,
                city,
                pincode,
                brands: showroom.brands,
            },
        })),
        seedUpcomingAvailability({ showroomId: showroom._id, showroom, days: 14 }),
        sendEmailSafe({ to: showroom.email, ...mail }),
    ], `registering showroom ${showroom._id}`)

    return res.status(201).json({
        success: true,
        data: {
            id: showroom._id,
            isApproved: showroom.isApproved,
            submittedAt: showroom.createdAt,
        },
    })
}))

router.post('/login', asyncHandler(async (req, res) => {
    const { email, password } = req.body

    const showroom = await Showroom.findOne({ email: String(email).toLowerCase() })
    if (!showroom) {
        return res.status(404).json({ success: false, message: 'Showroom account not found' })
    }
    if (!showroom.isApproved) {
        return res.status(403).json({
            success: false,
            message: 'Showroom account is pending approval',
            data: {
                pendingApproval: true,
                showroom: {
                    id: showroom._id,
                    name: showroom.name,
                    city: showroom.address?.city || '',
                    pincode: showroom.address?.pincode || '',
                    submittedAt: showroom.createdAt,
                },
            },
        })
    }
    if (!showroom.isActive) {
        return res.status(403).json({ success: false, message: 'Showroom account is deactivated' })
    }

    const matches = await bcrypt.compare(password, showroom.password)
    if (!matches) {
        return res.status(401).json({ success: false, message: 'Invalid showroom credentials' })
    }

    const token = jwt.sign(
        { id: showroom._id, showroomId: showroom._id, role: 'showroom', name: showroom.name },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '7d' },
    )

    return res.json({
        success: true,
        data: {
            token,
            role: 'showroom',
            name: showroom.name,
            showroomId: showroom._id,
        },
    })
}))

export default router
