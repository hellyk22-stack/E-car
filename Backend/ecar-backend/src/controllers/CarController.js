const carSchema = require("../models/CarModel")

const getAllCars = async (req, res) => {
    try {
        const cars = await carSchema.find({ status: "active" })
        res.json({
            message: "All cars",
            data: cars
        })
    } catch (err) {
        res.status(500).json({
            message: "Error while fetching cars",
            err: err
        })
    }
}

const getCarById = async (req, res) => {
    try {
        const car = await carSchema.findById(req.params.id)
        if (car) {
            res.json({
                message: "Car found",
                data: car
            })
        } else {
            res.status(404).json({
                message: "Car not found"
            })
        }
    } catch (err) {
        res.status(500).json({
            message: "Error while fetching car",
            err: err
        })
    }
}

const addCar = async (req, res) => {
    try {
        const savedCar = await carSchema.create(req.body)
        res.status(201).json({
            message: "Car added successfully",
            data: savedCar
        })
    } catch (err) {
        res.status(500).json({
            message: "Error while adding car",
            err: err
        })
    }
}

const updateCar = async (req, res) => {
    try {
        const updatedCar = await carSchema.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        )
        if (updatedCar) {
            res.json({
                message: "Car updated successfully",
                data: updatedCar
            })
        } else {
            res.status(404).json({
                message: "Car not found"
            })
        }
    } catch (err) {
        res.status(500).json({
            message: "Error while updating car",
            err: err
        })
    }
}

const deleteCar = async (req, res) => {
    try {
        const deletedCar = await carSchema.findByIdAndDelete(req.params.id)
        if (deletedCar) {
            res.json({
                message: "Car deleted successfully",
                data: deletedCar
            })
        } else {
            res.status(404).json({
                message: "Car not found"
            })
        }
    } catch (err) {
        res.status(500).json({
            message: "Error while deleting car",
            err: err
        })
    }
}

const searchCars = async (req, res) => {
    try {
        const { brand, type, fuel, transmission, maxPrice } = req.query
        const filter = { status: "active" }
        if (brand) filter.brand = { $regex: brand, $options: "i" }
        if (type) filter.type = type
        if (fuel) filter.fuel = fuel
        if (transmission) filter.transmission = transmission
        if (maxPrice) filter.price = { $lte: parseInt(maxPrice) }
        const cars = await carSchema.find(filter)
        res.json({
            message: "Search results",
            data: cars
        })
    } catch (err) {
        res.status(500).json({
            message: "Error while searching cars",
            err: err
        })
    }
}

module.exports = {
    getAllCars,
    getCarById,
    addCar,
    updateCar,
    deleteCar,
    searchCars
}