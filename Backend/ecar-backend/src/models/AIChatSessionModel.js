
const mongoose = require('mongoose')
const Schema = mongoose.Schema

const aiMessageSchema = new Schema({
    role: {
        type: String,
        enum: ['user', 'assistant'],
        required: true,
    },
    content: {
        type: String,
        required: true,
        trim: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
}, { _id: false })

const aiChatSessionSchema = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true,
        index: true,
    },
    title: {
        type: String,
        default: 'New Chat',
        trim: true,
    },
    messages: {
        type: [aiMessageSchema],
        default: [],
    },
    lastMessageAt: {
        type: Date,
        default: Date.now,
    },
}, { timestamps: true })

module.exports = mongoose.model('ai_chat_sessions', aiChatSessionSchema)
