const mongoose = require('mongoose')
const CarModel = require('../models/CarModel')
const ReviewModel = require('../models/ReviewModel')

const syncCarRating = async (carId) => {
    const objectId = new mongoose.Types.ObjectId(String(carId))

    const [summary] = await ReviewModel.aggregate([
        { $match: { carId: objectId } },
        {
            $group: {
                _id: '$carId',
                averageRating: { $avg: '$rating' },
                reviewCount: { $sum: 1 },
            },
        },
    ])

    if (summary) {
        const rating = Number(summary.averageRating.toFixed(1))
        const reviewCount = summary.reviewCount
        await CarModel.findByIdAndUpdate(carId, { rating, reviewCount })
        return { rating, reviewCount }
    }

    await CarModel.findByIdAndUpdate(carId, { reviewCount: 0 })
    const car = await CarModel.findById(carId).select('rating reviewCount')
    return { rating: car?.rating || 0, reviewCount: 0 }
}

module.exports = { syncCarRating }
