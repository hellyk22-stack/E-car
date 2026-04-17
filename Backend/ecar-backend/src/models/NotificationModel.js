const mongoose = require("mongoose")
const Schema = mongoose.Schema

const notificationSchema = new Schema({
    type: {
        type: String,
        trim: true,
        default: "broadcast",
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 120,
    },
    message: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true,
    },
    createdByName: {
        type: String,
        default: "Admin",
        trim: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    audienceRoles: {
        type: [String],
        default: [],
    },
    audienceUsers: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: "users",
        default: [],
    },
    data: {
        type: Schema.Types.Mixed,
        default: {},
    },
    readBy: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: "users",
        default: [],
    },
}, { timestamps: true })

module.exports = mongoose.model("notifications", notificationSchema)
