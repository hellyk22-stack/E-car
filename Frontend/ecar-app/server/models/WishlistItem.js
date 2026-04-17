import mongoose from 'mongoose'

const wishlistItemSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        car: { type: mongoose.Schema.Types.ObjectId, ref: 'Car', required: true, index: true },
    },
    { timestamps: true },
)

wishlistItemSchema.index({ user: 1, car: 1 }, { unique: true })

export default mongoose.models.WishlistItem || mongoose.model('WishlistItem', wishlistItemSchema)
