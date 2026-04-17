import mongoose from 'mongoose'

const priceAlertSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        car: { type: mongoose.Schema.Types.ObjectId, ref: 'Car', required: true, index: true },
        targetPrice: { type: Number, required: true },
        currentPriceAtAlert: { type: Number, required: true },
        isTriggered: { type: Boolean, default: false },
        triggeredAt: { type: Date, default: null },
    },
    { timestamps: true },
)

priceAlertSchema.index({ user: 1, car: 1 }, { unique: true })

export default mongoose.models.PriceAlert || mongoose.model('PriceAlert', priceAlertSchema)
