const router = require("express").Router()
const userController = require("../controllers/UserController")
const { verifyAdmin } = require("../middleware/AuthMiddleware")

// Public — no token needed
router.post("/register", userController.registerUser)
router.post("/login", userController.loginUser)

// Admin only
router.get("/users", verifyAdmin, userController.getAllUsers)

module.exports = router