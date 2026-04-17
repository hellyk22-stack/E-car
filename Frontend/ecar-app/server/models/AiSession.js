import mongoose from 'mongoose'

const aiMessageSchema = new mongoose.Schema(
    {
        role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
        content: { type: String, required: true, trim: true },
        createdAt: { type: Date, default: Date.now },
    },
    { _id: true },
)

const aiSessionSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        title: { type: String, trim: true, default: 'New Chat' },
        preview: { type: String, trim: true, default: 'Ask anything about cars, budgets, or comparisons.' },
        lastMessageAt: { type: Date, default: Date.now },
        messages: { type: [aiMessageSchema], default: [] },
    },
    { timestamps: true },
)

export default mongoose.models.AiSession || mongoose.model('AiSession', aiSessionSchema)
