const NotificationModel = require("../models/NotificationModel")
const { logAdminActivity } = require("../utils/AdminActivityLogger")

const normalizeStringArray = (value) => {
    if (Array.isArray(value)) {
        return value.map((item) => String(item || "").trim()).filter(Boolean)
    }

    return String(value || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
}

const isVisibleToUser = (notification, user) => {
    const roleTargets = normalizeStringArray(notification?.audienceRoles)
    const userTargets = Array.isArray(notification?.audienceUsers)
        ? notification.audienceUsers.map((item) => String(item))
        : []

    if (!roleTargets.length && !userTargets.length) return true

    return roleTargets.includes(String(user?.role || "")) || userTargets.includes(String(user?.id || ""))
}

const getMyNotifications = async (req, res) => {
    try {
        const userId = req.user.id
        const notifications = await NotificationModel.find({ isActive: true })
            .sort({ createdAt: -1 })
            .limit(40)
            .lean()

        const visibleNotifications = notifications.filter((notification) => isVisibleToUser(notification, req.user))
        const data = visibleNotifications.slice(0, 12).map((notification) => ({
            ...notification,
            unread: !notification.readBy?.some((readId) => String(readId) === String(userId)),
        }))

        const unreadCount = data.filter((item) => item.unread).length
        return res.json({ message: "Notifications fetched", data, meta: { unreadCount } })
    } catch (err) {
        return res.status(500).json({ message: "Error while fetching notifications", err })
    }
}

const markNotificationRead = async (req, res) => {
    try {
        const notification = await NotificationModel.findByIdAndUpdate(
            req.params.id,
            { $addToSet: { readBy: req.user.id } },
            { new: true }
        ).lean()

        if (!notification) {
            return res.status(404).json({ message: "Notification not found" })
        }

        return res.json({ message: "Notification marked as read", data: notification })
    } catch (err) {
        return res.status(500).json({ message: "Error while marking notification read", err })
    }
}

const markAllNotificationsRead = async (req, res) => {
    try {
        await NotificationModel.updateMany(
            { isActive: true, readBy: { $ne: req.user.id } },
            { $addToSet: { readBy: req.user.id } }
        )
        return res.json({ message: "All notifications marked as read" })
    } catch (err) {
        return res.status(500).json({ message: "Error while marking all notifications read", err })
    }
}

const createNotification = async (req, res) => {
    try {
        const { title, message, audienceRoles, audienceUsers, data, type } = req.body || {}
        if (!title || !message) {
            return res.status(400).json({ message: "Title and message are required" })
        }

        const notification = await NotificationModel.create({
            type: String(type || "broadcast").trim() || "broadcast",
            title: String(title).trim(),
            message: String(message).trim(),
            createdBy: req.user.id,
            createdByName: req.user.name || "Admin",
            audienceRoles: normalizeStringArray(audienceRoles),
            audienceUsers: Array.isArray(audienceUsers) ? audienceUsers : [],
            data: data && typeof data === "object" ? data : {},
        })

        await logAdminActivity({
            actorId: req.user.id,
            action: "notification_created",
            entityType: "notification",
            entityId: notification._id,
            description: `Broadcasted notification: ${notification.title}`,
            metadata: { title: notification.title },
        })

        return res.status(201).json({ message: "Notification broadcasted", data: notification })
    } catch (err) {
        return res.status(500).json({ message: "Error while creating notification", err })
    }
}

const getAdminNotifications = async (req, res) => {
    try {
        const notifications = await NotificationModel.find()
            .sort({ createdAt: -1 })
            .limit(30)
            .lean()

        const data = notifications.map((notification) => ({
            ...notification,
            readCount: notification.readBy?.length || 0,
        }))

        return res.json({ message: "Admin notifications fetched", data })
    } catch (err) {
        return res.status(500).json({ message: "Error while fetching admin notifications", err })
    }
}

module.exports = {
    getMyNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    createNotification,
    getAdminNotifications,
}
