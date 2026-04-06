const mongoose = require("mongoose")
const Schema = mongoose.Schema

const searchEventSchema = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true,
        index: true,
    },
    brand: {
        type: String,
        default: "",
        trim: true,
    },
    type: {
        type: String,
        default: "",
        trim: true,
    },
    fuel: {
        type: String,
        default: "",
        trim: true,
    },
    transmission: {
        type: String,
        default: "",
        trim: true,
    },
    maxPrice: {
        type: Number,
        default: null,
    },
    priceRangeLabel: {
        type: String,
        default: "",
        trim: true,
    },
    queryText: {
        type: String,
        default: "",
        trim: true,
    },
    searchedAt: {
        type: Date,
        default: Date.now,
        index: true,
    },
}, { versionKey: false })

searchEventSchema.index({ searchedAt: -1 })

module.exports = mongoose.model("search_events", searchEventSchema)