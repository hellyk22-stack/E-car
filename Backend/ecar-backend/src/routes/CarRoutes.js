const router = require("express").Router()
const carController = require("../controllers/CarController")
const { verifyToken, verifyAdmin } = require("../middleware/AuthMiddleware")
const upload = require("../middleware/UploadMiddleware")

router.get("/cars", carController.getAllCars)
router.get("/search", carController.searchCars)
router.get("/car/:id", carController.getCarById)
router.get("/car/:id/price-history", carController.getPriceHistory)

router.get("/my-cars", verifyToken, carController.getCarsByUser)

router.post("/car", verifyAdmin, upload.single("image"), carController.addCar)
router.put("/car/:id", verifyAdmin, upload.single("image"), carController.updateCar)
router.delete("/car/:id", verifyAdmin, carController.deleteCar)

module.exports = router
