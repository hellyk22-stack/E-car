const mongoose = require("mongoose")
const Schema = mongoose.Schema

const wishlistSchema = new Schema({
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
}, { timestamps: true })

wishlistSchema.index({ userId: 1, carId: 1 }, { unique: true })

module.exports = mongoose.model("wishlists", wishlistSchema)