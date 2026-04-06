const carSchema = require("../models/CarModel")
const uploadToCloudinary = require("../utils/Cloudinary")

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
            res.json({ message: "Car found", data: car })
        } else {
            res.status(404).json({ message: "Car not found" })
        }
    } catch (err) {
        res.status(500).json({
            message: "Error while fetching car",
            err: err
        })
    }
}

const getPriceHistory = async (req, res) => {
    try {
        const history = await carSchema.aggregate([
            { $match: { _id: carSchema.db.base.Types.ObjectId.createFromHexString(req.params.id) } },
            { $unwind: "$priceHistory" },
            {
                $project: {
                    _id: 0,
                    price: "$priceHistory.price",
                    changedAt: "$priceHistory.changedAt",
                    changedBy: "$priceHistory.changedBy"
                }
            },
            { $sort: { changedAt: 1 } }
        ])

        res.json({ message: "Price history", data: history })
    } catch (err) {
        res.status(500).json({
            message: "Error while fetching price history",
            err: err
        })
    }
}

const addCar = async (req, res) => {
    try {
        let imageUrl = ""

        if (req.file) {
            imageUrl = await uploadToCloudinary(req.file.path)
        }

        const initialPrice = Number(req.body.price || 0)
        const savedCar = await carSchema.create({
            ...req.body,
            userId: req.user?.id,
            image: imageUrl,
            price: initialPrice,
            priceHistory: initialPrice ? [{
                price: initialPrice,
                changedAt: req.body.priceChangeDate ? new Date(req.body.priceChangeDate) : new Date(),
                changedBy: req.user?.id,
            }] : [],
        })

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
        const car = await carSchema.findById(req.params.id)
        if (!car) {
            return res.status(404).json({ message: "Car not found" })
        }

        if (req.file) {
            car.image = await uploadToCloudinary(req.file.path)
        }

        const nextPrice = req.body.price !== undefined && req.body.price !== '' ? Number(req.body.price) : car.price
        const previousPrice = Number(car.price || 0)

        Object.entries(req.body).forEach(([key, value]) => {
            if (key === 'priceChangeDate') return
            if (value !== undefined && value !== '') {
                car[key] = key === 'price' ? Number(value) : value
            }
        })

        if (nextPrice !== previousPrice) {
            car.priceHistory.push({
                price: nextPrice,
                changedAt: req.body.priceChangeDate ? new Date(req.body.priceChangeDate) : new Date(),
                changedBy: req.user?.id,
            })
        }

        const updatedCar = await car.save()
        res.json({ message: "Car updated successfully", data: updatedCar })
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
            res.json({ message: "Car deleted successfully", data: deletedCar })
        } else {
            res.status(404).json({ message: "Car not found" })
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
        res.json({ message: "Search results", data: cars })
    } catch (err) {
        res.status(500).json({
            message: "Error while searching cars",
            err: err
        })
    }
}

const getCarsByUser = async (req, res) => {
    try {
        const userId = req.user.id
        const cars = await carSchema.find({ userId: userId, status: "active" })
        res.json({
            message: "My cars",
            data: cars
        })
    } catch (err) {
        res.status(500).json({
            message: "Error while fetching user's cars",
            err: err
        })
    }
}

module.exports = {
    getAllCars,
    getCarById,
    getPriceHistory,
    addCar,
    updateCar,
    deleteCar,
    searchCars,
    getCarsByUser
}
