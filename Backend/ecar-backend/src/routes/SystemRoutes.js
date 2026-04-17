const router = require("express").Router()
const systemController = require("../controllers/SystemController")
const { verifyAdmin } = require("../middleware/AuthMiddleware")

router.get("/activity-logs", verifyAdmin, systemController.getActivityLogs)

module.exports = router