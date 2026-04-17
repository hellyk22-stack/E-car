import mongoose from 'mongoose'

const userPriceAlertSchema = new mongoose.Schema(
    {
        carId: { type: mongoose.Schema.Types.ObjectId, ref: 'Car', required: true },
        targetPrice: { type: Number, required: true },
        createdAt: { type: Date, default: Date.now },
    },
    { _id: false },
)

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        password: { type: String },
        phone: { type: String, trim: true },
        role: { type: String, enum: ['user', 'customer', 'admin'], default: 'user' },
        isActive: { type: Boolean, default: true },
        plan: { type: String, enum: ['explorer', 'pro_buyer', 'elite'], default: 'explorer' },
        planExpiry: { type: Date, default: null },
        billingCycle: { type: String, enum: ['monthly', 'annual'], default: null },
        aiChatsToday: { type: Number, default: 0 },
        aiChatsResetAt: { type: Date, default: null },
        wishlistCount: { type: Number, default: 0 },
        priceAlerts: [userPriceAlertSchema],
    },
    { timestamps: true },
)

export default mongoose.models.User || mongoose.model('User', userSchema)
