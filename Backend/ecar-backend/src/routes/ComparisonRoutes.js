const express = require('express')
const { verifyToken } = require('../middleware/AuthMiddleware')
const User = require('../models/UserModel')
const Car = require('../models/CarModel')
const SavedComparison = require('../models/SavedComparisonModel')
const isPro = require('../middleware/isProMiddleware')
const { resolveReviewRating, resolveSafetyRating, serializeCar } = require('../utils/CarRatingUtil')
const { getComparisonAnalysis } = require('../utils/ComparisonAnalysis')

const router = express.Router()

// Perform comparison
router.post('/compare', verifyToken, async (req, res) => {
    try {
        const { carIds, save = false, name } = req.body
        const userId = req.user.id

        if (!carIds || !Array.isArray(carIds) || carIds.length < 2 || carIds.length > 10) {
            return res.status(400).json({ message: "Select 2-10 cars for comparison" })
        }

        const user = await User.findById(userId)
        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }

        // Check limits for free users
        if (!user.isPro) {
            if (user.compareCount >= 3) {
                return res.status(403).json({
                    message: "Comparison limit reached. Upgrade to premium for unlimited comparisons.",
                    limitReached: true
                })
            }
        }

        // Fetch car details
        const cars = await Car.find({ _id: { $in: carIds } }).select('name brand type price mileage engine seating fuel transmission rating reviewRating safetyRating image reviewCount')

        if (cars.length !== carIds.length) {
            return res.status(400).json({ message: "Some cars not found" })
        }

        const normalizedCars = cars.map(serializeCar)
        const aiAnalysisDetails = await getComparisonAnalysis(normalizedCars)

        // Increment comparison count for free users
        if (!user.isPro) {
            user.compareCount += 1
            await user.save()
        }

        // Prepare comparison data
        const comparisonData = {
            cars: cars.map(car => ({
                id: car._id,
                name: car.name,
                brand: car.brand,
                price: car.price,
                mileage: car.mileage,
                engine: car.engine,
                seating: car.seating,
                rating: resolveReviewRating(car),
                reviewRating: resolveReviewRating(car),
                safetyRating: resolveSafetyRating(car),
                image: car.image,
                reviewCount: car.reviewCount || 0,
            })),
            metrics: {
                price: cars.map(c => c.price),
                mileage: cars.map(c => c.mileage),
                engine: cars.map(c => c.engine),
                seating: cars.map(c => c.seating),
                rating: cars.map(c => resolveReviewRating(c)),
                reviewRating: cars.map(c => resolveReviewRating(c)),
                safetyRating: cars.map(c => resolveSafetyRating(c))
            },
            aiAnalysis: aiAnalysisDetails.summary,
            aiAnalysisDetails,
        }

        // If save is requested and user is pro
        if (save && user.isPro) {
            if (!name) {
                return res.status(400).json({ message: "Name is required to save comparison" })
            }

            const savedComparison = new SavedComparison({
                userId,
                name,
                cars: cars.map(car => ({
                    carId: car._id,
                    name: car.name,
                    brand: car.brand,
                    price: car.price,
                    mileage: car.mileage,
                    engine: car.engine,
                    seating: car.seating,
                    rating: resolveReviewRating(car),
                    reviewRating: resolveReviewRating(car),
                    safetyRating: resolveSafetyRating(car)
                })),
                comparisonData,
                isAdvanced: carIds.length > 3
            })

            await savedComparison.save()
        } else if (save && !user.isPro) {
            return res.status(403).json({ message: "Saving comparisons is a premium feature" })
        }

        res.json({
            message: "Comparison performed successfully",
            data: comparisonData,
            remainingComparisons: user.isPro ? 'unlimited' : Math.max(0, 3 - user.compareCount),
            saved: save && user.isPro
        })

    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message })
    }
})

// Get saved comparisons (premium only)
router.get('/saved', verifyToken, isPro, async (req, res) => {
    try {
        const userId = req.user.id
        const savedComparisons = await SavedComparison.find({ userId }).sort({ createdAt: -1 })

        res.json({
            message: "Saved comparisons retrieved",
            data: savedComparisons
        })
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message })
    }
})

// Delete saved comparison
router.delete('/saved/:id', verifyToken, isPro, async (req, res) => {
    try {
        const userId = req.user.id
        const comparisonId = req.params.id

        const deleted = await SavedComparison.findOneAndDelete({
            _id: comparisonId,
            userId
        })

        if (!deleted) {
            return res.status(404).json({ message: "Saved comparison not found" })
        }

        res.json({ message: "Saved comparison deleted" })
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message })
    }
})

module.exports = router
