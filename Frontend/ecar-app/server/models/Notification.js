import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true },
        message: { type: String, required: true, trim: true },
        type: { type: String, default: 'info', trim: true },
        targetRole: { type: String, enum: ['user', 'admin', 'showroom'], required: true },
        targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
        unread: { type: Boolean, default: true },
        data: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    { timestamps: true },
)

export default mongoose.models.Notification || mongoose.model('Notification', notificationSchema)
