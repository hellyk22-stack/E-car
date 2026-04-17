const router = require("express").Router()
const analyticsController = require("../controllers/AnalyticsController")
const { verifyToken, verifyAdmin } = require("../middleware/AuthMiddleware")

router.post("/views", verifyToken, analyticsController.logCarView)
router.post("/searches", verifyToken, analyticsController.logSearch)
router.get("/dashboard", verifyAdmin, analyticsController.getDashboardAnalytics)
router.get("/most-viewed/export/csv", verifyAdmin, analyticsController.exportMostViewedCsv)
router.get("/most-viewed", verifyAdmin, analyticsController.getMostViewedCarsReport)
router.get("/search-insights/export/csv", verifyAdmin, analyticsController.exportSearchInsightsCsv)
router.get("/search-insights", verifyAdmin, analyticsController.getSearchKeywordInsights)
router.get("/wishlist-leaderboard/export/csv", verifyAdmin, analyticsController.exportWishlistLeaderboardCsv)
router.get("/wishlist-leaderboard", verifyAdmin, analyticsController.getWishlistLeaderboard)

module.exports = router