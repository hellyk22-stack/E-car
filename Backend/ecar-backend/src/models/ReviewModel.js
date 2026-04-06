const mongoose = require('mongoose')
const Schema = mongoose.Schema

const reviewSchema = new Schema(
    {
        carId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'cars',
            required: true,
            index: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'users',
            required: true,
            index: true,
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },
        title: {
            type: String,
            trim: true,
            maxlength: 120,
            default: '',
        },
        comment: {
            type: String,
            trim: true,
            maxlength: 1200,
            default: '',
        },
    },
    {
        timestamps: true,
    }
)

reviewSchema.index({ carId: 1, userId: 1 }, { unique: true })

module.exports = mongoose.model('reviews', reviewSchema)
