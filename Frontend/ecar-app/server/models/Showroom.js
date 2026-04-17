import mongoose from 'mongoose'

const showroomCarSchema = new mongoose.Schema(
    {
        carId: { type: mongoose.Schema.Types.ObjectId, ref: 'Car', required: true },
        addedAt: { type: Date, default: Date.now },
        customPrice: { type: Number, min: 0 },
    },
    { _id: false },
)

const showroomStaffSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        phone: { type: String, required: true, trim: true },
        role: {
            type: String,
            enum: ['test_drive_attendant'],
            default: 'test_drive_attendant',
        },
    },
    { _id: false },
)

const showroomSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        password: { type: String, required: true },
        phone: { type: String, required: true, trim: true },
        brands: [{ type: String, trim: true }],
        address: {
            street: { type: String, trim: true },
            city: { type: String, trim: true },
            state: { type: String, trim: true },
            pincode: { type: String, trim: true },
        },
        location: {
            lat: { type: Number, default: 0 },
            lng: { type: Number, default: 0 },
        },
        serviceRadius: { type: Number, default: 0 },
        servicePincodes: [{ type: String, trim: true }],
        description: { type: String, trim: true },
        logo: { type: String, trim: true },
        isApproved: { type: Boolean, default: false },
        isActive: { type: Boolean, default: true },
        rating: {
            average: { type: Number, default: 0 },
            count: { type: Number, default: 0 },
        },
        openingHours: {
            open: { type: String, trim: true, default: '10:00 AM' },
            close: { type: String, trim: true, default: '07:00 PM' },
        },
        availableDays: [{ type: String, trim: true }],
        availableCars: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Car' }],
        cars: [showroomCarSchema],
        staff: [showroomStaffSchema],
    },
    { timestamps: { createdAt: true, updatedAt: true } },
)

export default mongoose.models.Showroom || mongoose.model('Showroom', showroomSchema)
