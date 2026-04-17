const router = require("express").Router()
const userController = require("../controllers/UserController")
const { verifyAdmin, verifyToken } = require("../middleware/AuthMiddleware")

router.post("/register", userController.registerUser)
router.post("/login", userController.loginUser)
router.get("/profile", verifyToken, userController.getMyProfile)
router.put("/profile", verifyToken, userController.updateMyProfile)

router.get("/users/export/csv", verifyAdmin, userController.exportUsersCsv)
router.get("/users/:id/activity", verifyAdmin, userController.getUserActivity)
router.get("/users", verifyAdmin, userController.getAllUsers)
router.patch("/users/:id", verifyAdmin, userController.updateUser)

module.exports = router
