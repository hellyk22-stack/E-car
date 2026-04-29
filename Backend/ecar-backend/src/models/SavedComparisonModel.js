const mongoose = require("mongoose")
const Schema = mongoose.Schema

const savedComparisonSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'users',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    cars: [{
        carId: {
            type: Schema.Types.ObjectId,
            ref: 'cars',
            required: true
        },
        name: String,
        brand: String,
        type: String,
        price: Number,
        mileage: Number,
        engine: Number,
        fuel: String,
        transmission: String,
        seating: Number,
        rating: Number,
        reviewRating: Number,
        safetyRating: Number
    }],
    comparisonData: {
        type: Schema.Types.Mixed
    },
    isAdvanced: {
        type: Boolean,
        default: false
    }
}, { timestamps: true })

module.exports = mongoose.model("savedcomparisons", savedComparisonSchema)
