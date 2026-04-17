import mongoose from 'mongoose'

const activityLogSchema = new mongoose.Schema(
    {
        actorId: { type: mongoose.Schema.Types.ObjectId },
        actorRole: { type: String, trim: true },
        action: { type: String, required: true, trim: true },
        entityType: { type: String, trim: true },
        entityId: { type: mongoose.Schema.Types.ObjectId },
        description: { type: String, trim: true },
        meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    { timestamps: true },
)

export default mongoose.models.ActivityLog || mongoose.model('ActivityLog', activityLogSchema)
