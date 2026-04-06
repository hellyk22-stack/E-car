const express = require('express')
const { verifyToken } = require('../middleware/AuthMiddleware')
const AIChatSession = require('../models/AIChatSessionModel')

const router = express.Router()

const initialAssistantMessage = "Hi! I'm your AI car advisor. Tell me your budget, preferences, family size, or driving needs and I'll recommend the best matches from our collection."

const sanitizeMessages = (messages) => (
    Array.isArray(messages)
        ? messages
            .filter((message) => message && (message.role === 'user' || message.role === 'assistant'))
            .map((message) => ({
                role: message.role,
                content: String(message.content || '').trim(),
            }))
            .filter((message) => message.content)
        : []
)

const buildInventorySummary = (carInventory) => (
    Array.isArray(carInventory) && carInventory.length
        ? carInventory.map((car) => ({
            name: car.name,
            brand: car.brand,
            type: car.type,
            price: car.price,
            mileage: car.mileage,
            engine: car.engine,
            seating: car.seating,
            fuel: car.fuel,
            transmission: car.transmission,
            rating: car.rating,
        }))
        : []
)

const getAnthropicReply = async (messages, carInventory) => {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
        return { ok: false, status: 503, error: 'ANTHROPIC_API_KEY is not configured on the server.' }
    }

    const inventorySummary = buildInventorySummary(carInventory)
    const systemPrompt = `You are an expert AI car advisor for E-CAR, an Indian car marketplace.
You help users find the perfect car based on their budget, preferences, and needs.
Here is the current car inventory:
${JSON.stringify(inventorySummary, null, 2)}
Always recommend cars from this inventory when possible.
Mention price in Indian Rupees and keep the answer concise, practical, and helpful.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1000,
            system: systemPrompt,
            messages,
        }),
    })

    const data = await response.json()
    if (!response.ok) {
        console.error('Anthropic API error:', data)
        return {
            ok: false,
            status: response.status,
            error: data?.error?.message || 'AI service unavailable',
        }
    }

    return {
        ok: true,
        reply: data?.content?.[0]?.text || 'No response generated.',
    }
}

router.get('/sessions', verifyToken, async (req, res) => {
    try {
        const sessions = await AIChatSession.find({ userId: req.user.id })
            .sort({ updatedAt: -1, lastMessageAt: -1 })
            .select('title lastMessageAt updatedAt createdAt messages')
            .lean()

        const summarized = sessions.map((session) => ({
            _id: session._id,
            title: session.title,
            lastMessageAt: session.lastMessageAt,
            updatedAt: session.updatedAt,
            createdAt: session.createdAt,
            preview: session.messages?.slice(-1)?.[0]?.content || initialAssistantMessage,
            messageCount: session.messages?.length || 0,
        }))

        res.json({ message: 'Chat sessions', data: summarized })
    } catch (err) {
        res.status(500).json({ message: 'Error while fetching chat sessions', err })
    }
})

router.post('/sessions', verifyToken, async (req, res) => {
    try {
        const session = await AIChatSession.create({
            userId: req.user.id,
            title: 'New Chat',
            lastMessageAt: new Date(),
            messages: [{ role: 'assistant', content: initialAssistantMessage, createdAt: new Date() }],
        })

        res.status(201).json({ message: 'Chat session created', data: session })
    } catch (err) {
        res.status(500).json({ message: 'Error while creating chat session', err })
    }
})

router.get('/sessions/:id', verifyToken, async (req, res) => {
    try {
        const session = await AIChatSession.findOne({ _id: req.params.id, userId: req.user.id })
        if (!session) {
            return res.status(404).json({ message: 'Chat session not found' })
        }

        res.json({ message: 'Chat session', data: session })
    } catch (err) {
        res.status(500).json({ message: 'Error while fetching chat session', err })
    }
})

router.post('/sessions/:id/messages', verifyToken, async (req, res) => {
    try {
        const { role, content } = req.body || {}
        if (!content || !['user', 'assistant'].includes(role)) {
            return res.status(400).json({ message: 'Valid role and content are required' })
        }

        const session = await AIChatSession.findOne({ _id: req.params.id, userId: req.user.id })
        if (!session) {
            return res.status(404).json({ message: 'Chat session not found' })
        }

        const trimmedContent = String(content).trim()
        session.messages.push({ role, content: trimmedContent, createdAt: new Date() })
        session.lastMessageAt = new Date()

        if (role === 'user' && (!session.title || session.title === 'New Chat')) {
            session.title = trimmedContent.slice(0, 60)
        }

        await session.save()
        res.status(201).json({ message: 'Message stored', data: session })
    } catch (err) {
        res.status(500).json({ message: 'Error while saving chat message', err })
    }
})

router.delete('/sessions/:id', verifyToken, async (req, res) => {
    try {
        const deleted = await AIChatSession.findOneAndDelete({ _id: req.params.id, userId: req.user.id })
        if (!deleted) {
            return res.status(404).json({ message: 'Chat session not found' })
        }

        res.json({ message: 'Chat session deleted' })
    } catch (err) {
        res.status(500).json({ message: 'Error while deleting chat session', err })
    }
})

router.post('/chat', async (req, res) => {
    try {
        const { messages, carInventory } = req.body || {}
        const safeMessages = sanitizeMessages(messages)
        const result = await getAnthropicReply(safeMessages, carInventory)

        if (!result.ok) {
            return res.status(result.status).json({ error: result.error })
        }

        return res.json({ reply: result.reply })
    } catch (err) {
        console.error('AI route error:', err)
        return res.status(500).json({ error: 'AI service unavailable' })
    }
})

module.exports = router
