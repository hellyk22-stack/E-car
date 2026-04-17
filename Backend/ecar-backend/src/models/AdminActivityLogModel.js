const mongoose = require("mongoose")
const Schema = mongoose.Schema

const adminActivityLogSchema = new Schema({
    actorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true,
        index: true,
    },
    actorName: {
        type: String,
        default: "Admin",
        trim: true,
    },
    action: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    entityType: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    entityId: {
        type: String,
        default: "",
        trim: true,
    },
    description: {
        type: String,
        required: true,
        trim: true,
    },
    metadata: {
        type: Schema.Types.Mixed,
        default: {},
    },
}, { timestamps: true })

module.exports = mongoose.model("admin_activity_logs", adminActivityLogSchema)