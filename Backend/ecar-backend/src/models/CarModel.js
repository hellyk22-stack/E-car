const mongoose = require("mongoose")
const Schema = mongoose.Schema

const priceHistorySchema = new Schema({
    price: {
        type: Number,
        required: true,
    },
    changedAt: {
        type: Date,
        default: Date.now,
    },
    changedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
    },
}, { _id: false })

const carSchema = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users"
    },
    name: {
        type: String,
        required: true
    },
    brand: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ["Hatchback", "Sedan", "SUV", "Luxury"]
    },
    price: {
        type: Number,
        required: true
    },
    priceHistory: {
        type: [priceHistorySchema],
        default: []
    },
    mileage: {
        type: Number
    },
    engine: {
        type: Number
    },
    seating: {
        type: Number
    },
    fuel: {
        type: String,
        enum: ["Petrol", "Diesel", "Electric"]
    },
    transmission: {
        type: String,
        enum: ["Manual", "Automatic"]
    },
    rating: {
        type: Number,
        default: 0
    },
    reviewRating: {
        type: Number,
        default: 0
    },
    safetyRating: {
        type: Number,
        default: 0
    },
    reviewCount: {
        type: Number,
        default: 0
    },
    image: {
        type: String
    },
    status: {
        type: String,
        default: "active",
        enum: ["active", "inactive"]
    }
})

carSchema.index({ status: 1, type: 1, fuel: 1, price: 1 })
carSchema.index({ status: 1, brand: 1, price: 1 })

module.exports = mongoose.model("cars", carSchema)
