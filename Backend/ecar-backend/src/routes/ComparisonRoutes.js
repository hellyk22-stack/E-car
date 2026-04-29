const express = require('express')
const mongoose = require('mongoose')
const { verifyToken } = require('../middleware/AuthMiddleware')
const User = require('../models/UserModel')
const Car = require('../models/CarModel')
const SavedComparison = require('../models/SavedComparisonModel')
const isPro = require('../middleware/isProMiddleware')
const { resolveReviewRating, resolveSafetyRating, serializeCar } = require('../utils/CarRatingUtil')
const { getComparisonAnalysis } = require('../utils/ComparisonAnalysis')
const { getActiveSubscription, isUnlimited } = require('../utils/SubscriptionUtil')

const router = express.Router()

router.post('/compare', verifyToken, async (req, res) => {
    try {
        const { carIds, save = false, name } = req.body
        const userId = req.user.id

        const safeCarIds = Array.isArray(carIds) ? carIds : []
        const uniqueCarIds = Array.from(new Set(safeCarIds.map(id => String(id))));
        
        if (uniqueCarIds.length < 2) {
            return res.status(400).json({ message: 'Select at least 2 unique cars for comparison' })
        }

        const validObjectIds = uniqueCarIds.filter(id => mongoose.Types.ObjectId.isValid(id))
        
        if (validObjectIds.length < uniqueCarIds.length) {
            console.warn(`Comparison: Filtered out ${uniqueCarIds.length - validObjectIds.length} invalid car IDs`)
        }

        if (validObjectIds.length < 2) {
            return res.status(400).json({ message: 'Invalid cars selected. Please try selecting different cars.' })
        }
        const user = await User.findById(userId)
        if (!user) {
            return res.status(404).json({ message: 'User not found' })
        }

        const subscription = getActiveSubscription(user)
        const compareLimit = subscription.limits.smartCompareLimit

        if (!isUnlimited(compareLimit) && uniqueCarIds.length > compareLimit) {
            return res.status(403).json({
                message: `${subscription.planLabel} limit is ${compareLimit} smart comparisons at a time. Upgrade to expand your toolkit.`,
                limitReached: true,
                compareLimit,
            })
        }

        const cars = await Car.find({ _id: { $in: validObjectIds } })
            .select('name brand type price mileage engine seating fuel transmission rating reviewRating safetyRating image reviewCount')

        if (cars.length < 2) {
            return res.status(400).json({ message: 'Some of the selected cars could not be found' })
        }

        const normalizedCars = cars.map(serializeCar)
        
        // AI analysis is secondary; if it fails, fallback to local analysis
        let aiAnalysisDetails = null
        try {
            aiAnalysisDetails = await getComparisonAnalysis(normalizedCars)
        } catch (aiErr) {
            console.error("Comparison AI Error:", aiErr)
            // ComparisonAnalysis.js should already handle internal errors, 
            // but this catch ensures the route itself never crashes.
        }

        const comparisonData = {
            cars: normalizedCars.map((car) => ({
                id: car._id,
                name: car.name,
                brand: car.brand,
                type: car.type,
                price: car.price,
                mileage: car.mileage,
                engine: car.engine,
                fuel: car.fuel,
                transmission: car.transmission,
                seating: car.seating,
                rating: car.rating,
                reviewRating: car.reviewRating,
                safetyRating: car.safetyRating,
                image: car.image,
                reviewCount: car.reviewCount || 0,
            })),
            metrics: {
                price: normalizedCars.map((item) => item.price),
                mileage: normalizedCars.map((item) => item.mileage),
                engine: normalizedCars.map((item) => item.engine),
                seating: normalizedCars.map((item) => item.seating),
                rating: normalizedCars.map((item) => item.rating),
                reviewRating: normalizedCars.map((item) => item.reviewRating),
                safetyRating: normalizedCars.map((item) => item.safetyRating),
            },
            aiAnalysis: aiAnalysisDetails?.summary || "Direct specification comparison below.",
            aiAnalysisDetails: aiAnalysisDetails,
        }

        if (save && subscription.isPremium) {
            if (!name) {
                return res.status(400).json({ message: 'Name is required to save comparison' })
            }

            const savedComparison = new SavedComparison({
                userId,
                name,
                cars: normalizedCars.map((car) => ({
                    carId: car._id,
                    name: car.name,
                    brand: car.brand,
                    type: car.type,
                    price: car.price,
                    mileage: car.mileage,
                    engine: car.engine,
                    fuel: car.fuel,
                    transmission: car.transmission,
                    seating: car.seating,
                    rating: car.rating,
                    reviewRating: car.reviewRating,
                    safetyRating: car.safetyRating,
                })),
                comparisonData,
                isAdvanced: uniqueCarIds.length > 3,
            })

            await savedComparison.save()
        } else if (save && !subscription.isPremium) {
            return res.status(403).json({ message: 'Saving comparisons is a premium feature' })
        }

        res.json({
            message: 'Comparison performed successfully',
            data: comparisonData,
            compareLimit,
            saved: save && subscription.isPremium,
        })
    } catch (error) {
        console.error("Comparison Route error:", error)
        res.status(500).json({ message: 'Server error', error: error.message })
    }
})

router.get('/saved', verifyToken, isPro, async (req, res) => {
    try {
        const savedComparisons = await SavedComparison.find({ userId: req.user.id }).sort({ createdAt: -1 })
        res.json({
            message: 'Saved comparisons retrieved',
            data: savedComparisons,
        })
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message })
    }
})

router.delete('/saved/:id', verifyToken, isPro, async (req, res) => {
    try {
        const deleted = await SavedComparison.findOneAndDelete({
            _id: req.params.id,
            userId: req.user.id,
        })

        if (!deleted) {
            return res.status(404).json({ message: 'Saved comparison not found' })
        }

        res.json({ message: 'Saved comparison deleted' })
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message })
    }
})

module.exports = router
