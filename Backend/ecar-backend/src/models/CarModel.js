const mongoose = require("mongoose")
const Schema = mongoose.Schema

const carSchema = new Schema({
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
        type: Number
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

module.exports = mongoose.model("cars", carSchema)