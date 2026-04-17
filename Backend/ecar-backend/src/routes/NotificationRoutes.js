const router = require("express").Router()
const notificationController = require("../controllers/NotificationController")
const { verifyToken, verifyAdmin } = require("../middleware/AuthMiddleware")

router.get("/my", verifyToken, notificationController.getMyNotifications)
router.post("/read-all", verifyToken, notificationController.markAllNotificationsRead)
router.post("/:id/read", verifyToken, notificationController.markNotificationRead)
router.get("/admin", verifyAdmin, notificationController.getAdminNotifications)
router.post("/admin", verifyAdmin, notificationController.createNotification)

module.exports = router