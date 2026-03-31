const router = require("express").Router()
const userController = require("../controllers/UserController")

router.post("/register", userController.registerUser)
router.post("/login", userController.loginUser)
router.get("/users", userController.getAllUsers)

module.exports = router