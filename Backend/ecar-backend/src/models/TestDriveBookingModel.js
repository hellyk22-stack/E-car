const mongoose = require("mongoose")
const Schema = mongoose.Schema

const statusHistorySchema = new Schema({
    status: {
        type: String,
        required: true,
        trim: true,
    },
    updatedBy: {
        type: String,
        trim: true,
        default: "",
    },
    updatedByRole: {
        type: String,
        trim: true,
        default: "",
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
    note: {
        type: String,
        trim: true,
        default: "",
    },
}, { _id: false })

const testDriveBookingSchema = new Schema({
    bookingId: {
        type: String,
        unique: true,
        index: true,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true,
    },
    showroom: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "showrooms",
        required: true,
    },
    car: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "cars",
        required: true,
    },
    carSnapshot: {
        name: { type: String, trim: true, default: "" },
        brand: { type: String, trim: true, default: "" },
        image: { type: String, trim: true, default: "" },
        fuel: { type: String, trim: true, default: "" },
    },
    bookingType: {
        type: String,
        enum: ["at_showroom", "home_delivery"],
        required: true,
    },
    scheduledDate: {
        type: Date,
        required: true,
    },
    scheduledTime: {
        type: String,
        required: true,
        trim: true,
    },
    userDetails: {
        fullName: { type: String, required: true, trim: true },
        phone: { type: String, required: true, trim: true },
        address: { type: String, trim: true, default: "" },
        pincode: { type: String, trim: true, default: "" },
        drivingLicense: {
            number: { type: String, required: true, trim: true },
            expiryDate: { type: Date, required: true },
            image: { type: String, trim: true, default: "" },
        },
    },
    assignedStaff: {
        name: { type: String, trim: true, default: "" },
        phone: { type: String, trim: true, default: "" },
    },
    status: {
        type: String,
        enum: ["pending", "confirmed", "completed", "cancelled", "rejected"],
        default: "pending",
    },
    statusHistory: {
        type: [statusHistorySchema],
        default: [],
    },
    showroomResponse: {
        message: { type: String, trim: true, default: "" },
        respondedAt: { type: Date, default: null },
    },
    showroomSnapshot: {
        name: { type: String, trim: true, default: "" },
        phone: { type: String, trim: true, default: "" },
        email: { type: String, trim: true, default: "" },
        address: {
            street: { type: String, trim: true, default: "" },
            city: { type: String, trim: true, default: "" },
            state: { type: String, trim: true, default: "" },
            pincode: { type: String, trim: true, default: "" },
        },
    },
    userRating: {
        stars: { type: Number, min: 1, max: 5 },
        review: { type: String, trim: true, default: "" },
        ratedAt: { type: Date, default: null },
    },
}, { timestamps: true })

module.exports = mongoose.model("test_drive_bookings", testDriveBookingSchema)
