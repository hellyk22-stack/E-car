import mongoose from 'mongoose'

const subscriptionSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        plan: { type: String, enum: ['explorer', 'pro_buyer', 'elite'], required: true },
        billingCycle: { type: String, enum: ['monthly', 'annual'], required: true },
        amount: { type: Number, required: true },
        currency: { type: String, default: 'INR', trim: true },
        status: {
            type: String,
            enum: ['created', 'paid', 'failed', 'cancelled', 'expired'],
            default: 'created',
        },
        razorpayOrderId: { type: String, trim: true, index: true },
        razorpayPaymentId: { type: String, trim: true },
        razorpaySignature: { type: String, trim: true },
        startDate: { type: Date, default: null },
        endDate: { type: Date, default: null },
        autoRenew: { type: Boolean, default: true },
        cancelledAt: { type: Date, default: null },
    },
    { timestamps: true },
)

export default mongoose.models.Subscription || mongoose.model('Subscription', subscriptionSchema)
