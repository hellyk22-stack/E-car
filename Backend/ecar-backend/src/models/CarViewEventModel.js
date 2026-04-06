const mongoose = require("mongoose")
const Schema = mongoose.Schema

const carViewEventSchema = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true,
        index: true,
    },
    carId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "cars",
        required: true,
        index: true,
    },
    viewedAt: {
        type: Date,
        default: Date.now,
        index: true,
    },
}, { versionKey: false })

carViewEventSchema.index({ viewedAt: -1, carId: 1 })

module.exports = mongoose.model("car_view_events", carViewEventSchema)