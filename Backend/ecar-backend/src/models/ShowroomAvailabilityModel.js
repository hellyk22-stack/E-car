const mongoose = require("mongoose")
const Schema = mongoose.Schema

const slotSchema = new Schema({
    time: {
        type: String,
        required: true,
        trim: true,
    },
    isBooked: {
        type: Boolean,
        default: false,
    },
    bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "test_drive_bookings",
    },
}, { _id: false })

const showroomAvailabilitySchema = new Schema({
    showroom: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "showrooms",
        required: true,
        index: true,
    },
    date: {
        type: Date,
        required: true,
        index: true,
    },
    slots: {
        type: [slotSchema],
        default: [],
    },
}, { timestamps: true })

showroomAvailabilitySchema.index({ showroom: 1, date: 1 }, { unique: true })

module.exports = mongoose.model("showroom_availability", showroomAvailabilitySchema)
