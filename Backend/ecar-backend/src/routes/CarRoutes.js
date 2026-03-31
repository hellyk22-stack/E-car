const router = require("express").Router()
const carController = require("../controllers/CarController")

// All routes open for now
router.get("/cars", carController.getAllCars)
router.get("/search", carController.searchCars)
router.get("/car/:id", carController.getCarById)
router.post("/car", carController.addCar)
router.put("/car/:id", carController.updateCar)
router.delete("/car/:id", carController.deleteCar)

module.exports = router