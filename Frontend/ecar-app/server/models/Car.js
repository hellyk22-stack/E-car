import mongoose from 'mongoose'

const priceHistorySchema = new mongoose.Schema(
    {
        price: { type: Number, required: true },
        updatedBy: { type: String, trim: true },
        updatedByRole: { type: String, trim: true },
        date: { type: Date, default: Date.now },
        note: { type: String, trim: true },
    },
    { _id: false },
)

const carSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        brand: { type: String, trim: true },
        type: { type: String, trim: true },
        price: { type: Number, default: 0 },
        mileage: { type: Number, default: 0 },
        engine: { type: Number, default: 0 },
        seating: { type: Number, default: 0 },
        fuel: { type: String, trim: true },
        transmission: { type: String, trim: true },
        rating: { type: Number, default: 0 },
        reviewCount: { type: Number, default: 0 },
        image: { type: String, trim: true },
        showrooms: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Showroom' }],
        priceHistory: [priceHistorySchema],
    },
    { timestamps: true },
)

export default mongoose.models.Car || mongoose.model('Car', carSchema)
