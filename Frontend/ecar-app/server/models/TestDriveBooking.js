import mongoose from 'mongoose'

const bookingHistorySchema = new mongoose.Schema(
    {
        status: { type: String, required: true, trim: true },
        updatedBy: { type: String, trim: true },
        updatedByRole: { type: String, trim: true },
        timestamp: { type: Date, default: Date.now },
        note: { type: String, trim: true },
    },
    { _id: false },
)

const bookingSchema = new mongoose.Schema(
    {
        bookingId: { type: String, unique: true, index: true },
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        showroom: { type: mongoose.Schema.Types.ObjectId, ref: 'Showroom', required: true },
        car: { type: mongoose.Schema.Types.ObjectId, ref: 'Car', required: true },
        bookingType: {
            type: String,
            enum: ['at_showroom', 'home_delivery'],
            required: true,
        },
        scheduledDate: { type: Date, required: true },
        scheduledTime: { type: String, required: true, trim: true },
        userDetails: {
            fullName: { type: String, required: true, trim: true },
            phone: { type: String, required: true, trim: true },
            address: { type: String, trim: true },
            pincode: { type: String, trim: true },
            drivingLicense: {
                number: { type: String, required: true, trim: true },
                expiryDate: { type: Date, required: true },
                image: { type: String, trim: true },
            },
        },
        assignedStaff: {
            name: { type: String, trim: true },
            phone: { type: String, trim: true },
        },
        status: {
            type: String,
            enum: ['pending', 'confirmed', 'completed', 'cancelled', 'rejected'],
            default: 'pending',
        },
        statusHistory: [bookingHistorySchema],
        showroomResponse: {
            message: { type: String, trim: true },
            respondedAt: { type: Date },
        },
        userRating: {
            stars: { type: Number, min: 1, max: 5 },
            review: { type: String, trim: true },
            ratedAt: { type: Date },
        },
        confirmationReceiptSent: { type: Boolean, default: false },
    },
    { timestamps: { createdAt: true, updatedAt: true } },
)

export default mongoose.models.TestDriveBooking || mongoose.model('TestDriveBooking', bookingSchema)
