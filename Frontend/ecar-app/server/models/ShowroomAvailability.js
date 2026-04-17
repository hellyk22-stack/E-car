import mongoose from 'mongoose'

const slotSchema = new mongoose.Schema(
    {
        time: { type: String, required: true, trim: true },
        isBooked: { type: Boolean, default: false },
        bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'TestDriveBooking' },
    },
    { _id: false },
)

const availabilitySchema = new mongoose.Schema(
    {
        showroom: { type: mongoose.Schema.Types.ObjectId, ref: 'Showroom', required: true },
        date: { type: Date, required: true },
        slots: [slotSchema],
    },
    { timestamps: true },
)

availabilitySchema.index({ showroom: 1, date: 1 }, { unique: true })

export default mongoose.models.ShowroomAvailability || mongoose.model('ShowroomAvailability', availabilitySchema)
