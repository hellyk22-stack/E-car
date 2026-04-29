const mongoose = require("mongoose")
const Schema = mongoose.Schema

const paymentSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'users',
        required: true
    },
    orderId: {
        type: String,
        required: true,
        unique: true
    },
    paymentId: {
        
        type: String,
        unique: true,
        sparse: true
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'INR'
    },
    plan: {
        type: String,
        enum: ['pro_buyer', 'elite'],
        default: 'pro_buyer'
    },
    billingCycle: {
        type: String,
        enum: ['monthly', 'annual'],
        default: 'monthly'
    },
    status: {
        type: String,
        enum: ['created', 'paid', 'failed', 'refunded'],
        default: 'created'
    },
    razorpayResponse: {
        type: Schema.Types.Mixed
    }
}, { timestamps: true })

module.exports = mongoose.model("payments", paymentSchema)