import express from 'express'
import Notification from '../models/Notification.js'
import verifyToken from '../middleware/verifyToken.js'
import { asyncHandler } from '../utils/api.js'

const router = express.Router()

router.use(verifyToken)

router.get('/my', asyncHandler(async (req, res) => {
    const filter = { targetRole: req.user.role, targetId: req.user.id }
    const [items, unreadCount] = await Promise.all([
        Notification.find(filter).sort({ createdAt: -1 }).limit(50),
        Notification.countDocuments({ ...filter, unread: true }),
    ])

    return res.json({
        success: true,
        data: items,
        meta: { unreadCount },
    })
}))

router.post('/:id/read', asyncHandler(async (req, res) => {
    const item = await Notification.findOneAndUpdate(
        { _id: req.params.id, targetRole: req.user.role, targetId: req.user.id },
        { unread: false },
        { new: true },
    )

    if (!item) {
        return res.status(404).json({ success: false, message: 'Notification not found' })
    }

    return res.json({ success: true, data: item })
}))

router.post('/read-all', asyncHandler(async (req, res) => {
    await Notification.updateMany(
        { targetRole: req.user.role, targetId: req.user.id, unread: true },
        { unread: false },
    )

    return res.json({ success: true, data: { updated: true } })
}))

export default router
