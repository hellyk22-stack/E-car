const mongoose = require("mongoose")
const Schema = mongoose.Schema

const showroomCarSchema = new Schema({
    carId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "cars",
        required: true,
    },
    addedAt: {
        type: Date,
        default: Date.now,
    },
    customPrice: {
        type: Number,
        default: null,
    },
}, { _id: false })

const showroomStaffSchema = new Schema({
    name: {
        type: String,
        trim: true,
        required: true,
    },
    phone: {
        type: String,
        trim: true,
        required: true,
    },
    role: {
        type: String,
        trim: true,
        default: "test_drive_attendant",
    },
}, { _id: false })

const showroomSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: true,
    },
    phone: {
        type: String,
        trim: true,
        default: "",
    },
    brands: {
        type: [String],
        default: [],
    },
    logo: {
        type: String,
        default: "",
    },
    description: {
        type: String,
        trim: true,
        default: "",
    },
    address: {
        street: { type: String, trim: true, default: "" },
        city: { type: String, trim: true, default: "" },
        state: { type: String, trim: true, default: "" },
        pincode: { type: String, trim: true, default: "" },
    },
    location: {
        lat: { type: Number, default: 0 },
        lng: { type: Number, default: 0 },
    },
    serviceRadius: {
        type: Number,
        default: 0,
    },
    servicePincodes: {
        type: [String],
        default: [],
    },
    availableDays: {
        type: [String],
        default: [],
    },
    openingHours: {
        open: { type: String, trim: true, default: "" },
        close: { type: String, trim: true, default: "" },
    },
    availableCars: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: "cars",
        default: [],
    },
    cars: {
        type: [showroomCarSchema],
        default: [],
    },
    staff: {
        type: [showroomStaffSchema],
        default: [],
    },
    rating: {
        average: { type: Number, default: 0 },
        count: { type: Number, default: 0 },
    },
    status: {
        type: String,
        enum: ["pending", "approved", "rejected", "inactive"],
        default: "pending",
    },
}, { timestamps: true })

showroomSchema.index({ status: 1, "address.city": 1 })
showroomSchema.index({ status: 1, "address.pincode": 1 })
showroomSchema.index({ status: 1, servicePincodes: 1 })

module.exports = mongoose.model("showrooms", showroomSchema)
