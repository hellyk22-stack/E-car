const mongoose = require("mongoose")
const Schema = mongoose.Schema

const userSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        trim: true,
        default: "",
    },
    address: {
        street: { type: String, trim: true, default: "" },
        area: { type: String, trim: true, default: "" },
        city: { type: String, trim: true, default: "" },
        state: { type: String, trim: true, default: "" },
        pincode: { type: String, trim: true, default: "" },
    },
    role: {
        type: String,
        default: "user",
        enum: ["user", "admin"]
    },
    status: {
        type: String,
        default: "active",
        enum: ["active", "inactive", "deleted"]
    },
    subscription: {
        plan: {
            type: String,
            enum: ["explorer", "pro_buyer", "elite"],
            default: "explorer",
        },
        planExpiry: {
            type: Date,
            default: null,
        },
        billingCycle: {
            type: String,
            enum: ["monthly", "annual", null],
            default: null,
        },
    },
}, { timestamps: true })

module.exports = mongoose.model("users", userSchema)
