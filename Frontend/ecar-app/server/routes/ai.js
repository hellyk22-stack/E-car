import express from 'express'
import AiSession from '../models/AiSession.js'
import Car from '../models/Car.js'
import verifyToken from '../middleware/verifyToken.js'
import { attachPlanContext, checkAiChatLimit } from '../middleware/checkFeature.js'
import { asyncHandler } from '../utils/api.js'
import { isUnlimited } from '../utils/subscriptionHelpers.js'

const router = express.Router()

router.use(verifyToken, attachPlanContext)

const currencyFormatter = new Intl.NumberFormat('en-IN')

const parseBudget = (text) => {
    const lower = text.toLowerCase()
    const lakhMatch = lower.match(/(\d+(?:\.\d+)?)\s*lakh/)
    if (lakhMatch) return Number(lakhMatch[1]) * 100000

    const underMatch = lower.match(/under\s*(\d+(?:\.\d+)?)/)
    if (!underMatch) return null

    const raw = Number(underMatch[1])
    return raw < 1000 ? raw * 100000 : raw
}

const scoreCar = (car, query) => {
    const lower = query.toLowerCase()
    let score = Number(car.rating || 0) * 8

    const budget = parseBudget(query)
    if (budget) {
        score += car.price <= budget ? 30 : -Math.min(30, (car.price - budget) / 50000)
    }

    if (lower.includes('suv') && car.type === 'SUV') score += 22
    if (lower.includes('sedan') && car.type === 'Sedan') score += 22
    if (lower.includes('hatchback') && car.type === 'Hatchback') score += 22
    if ((lower.includes('electric') || lower.includes('ev')) && car.fuel === 'Electric') score += 24
    if (lower.includes('diesel') && car.fuel === 'Diesel') score += 20
    if (lower.includes('petrol') && car.fuel === 'Petrol') score += 20
    if (lower.includes('automatic') && car.transmission === 'Automatic') score += 10
    if (lower.includes('manual') && car.transmission === 'Manual') score += 10
    if (lower.includes('mileage') || lower.includes('city')) score += Number(car.mileage || 0)
    if (lower.includes('family') && Number(car.seating || 0) >= 5) score += 16

    return score
}

const buildRecommendation = async (query, inventory) => {
    const cars = inventory?.length ? inventory : await Car.find({}).sort({ createdAt: -1 }).limit(100)
    const ranked = [...cars]
        .map((car) => ({ car, score: scoreCar(car, query) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map((item) => item.car)

    if (!ranked.length) {
        return 'I could not find a strong match right now. Try adding a budget, fuel preference, or body type.'
    }

    const intro = parseBudget(query)
        ? `Here are the strongest matches around your budget of Rs ${currencyFormatter.format(parseBudget(query))}:`
        : 'Here are the strongest matches from the current inventory:'

    const lines = ranked.map((car, index) => (
        `${index + 1}. ${car.name} (${car.brand}) - Rs ${currencyFormatter.format(car.price || 0)}, ${car.type}, ${car.fuel}, ${car.transmission}, ${car.mileage} kmpl, ${car.seating} seats, rating ${car.rating || 0}/5.`
    ))

    return `${intro}\n\n${lines.join('\n\n')}\n\nIf you want, ask me to narrow this down by fuel type, family size, or monthly budget.`
}

const buildSessionSummary = (messages = []) => {
    const firstUserMessage = messages.find((item) => item.role === 'user')?.content || ''
    return {
        title: firstUserMessage ? firstUserMessage.slice(0, 40) : 'New Chat',
        preview: firstUserMessage ? firstUserMessage.slice(0, 110) : 'Ask anything about cars, budgets, or comparisons.',
        lastMessageAt: messages[messages.length - 1]?.createdAt || new Date(),
    }
}

router.get('/sessions', asyncHandler(async (req, res) => {
    const sessions = await AiSession.find({ user: req.accountUser._id }).sort({ updatedAt: -1 })
    return res.json({ success: true, data: sessions })
}))

router.post('/sessions', asyncHandler(async (req, res) => {
    const session = await AiSession.create({
        user: req.accountUser._id,
        title: 'New Chat',
        preview: 'Ask anything about cars, budgets, or comparisons.',
        messages: [],
    })

    return res.status(201).json({ success: true, data: session })
}))

router.get('/sessions/:id', asyncHandler(async (req, res) => {
    const session = await AiSession.findOne({ _id: req.params.id, user: req.accountUser._id })
    if (!session) {
        return res.status(404).json({ success: false, message: 'Session not found' })
    }

    return res.json({ success: true, data: session })
}))

router.delete('/sessions/:id', asyncHandler(async (req, res) => {
    await AiSession.findOneAndDelete({ _id: req.params.id, user: req.accountUser._id })
    return res.json({ success: true, data: { deleted: true } })
}))

router.post('/sessions/:id/messages', asyncHandler(async (req, res) => {
    const session = await AiSession.findOne({ _id: req.params.id, user: req.accountUser._id })
    if (!session) {
        return res.status(404).json({ success: false, message: 'Session not found' })
    }

    session.messages.push({
        role: req.body.role,
        content: req.body.content,
        createdAt: new Date(),
    })
    Object.assign(session, buildSessionSummary(session.messages))
    await session.save()

    return res.status(201).json({ success: true, data: session })
}))

router.post('/chat', checkAiChatLimit, asyncHandler(async (req, res) => {
    const messages = Array.isArray(req.body.messages) ? req.body.messages : []
    const latestUserMessage = [...messages].reverse().find((item) => item.role === 'user')?.content || ''
    const inventory = Array.isArray(req.body.carInventory) && req.body.carInventory.length
        ? req.body.carInventory
        : await Car.find({}).sort({ createdAt: -1 }).limit(100)

    const reply = await buildRecommendation(latestUserMessage, inventory)

    req.accountUser.aiChatsToday += 1
    if (!req.accountUser.aiChatsResetAt) {
        const tomorrow = new Date()
        tomorrow.setHours(24, 0, 0, 0)
        req.accountUser.aiChatsResetAt = tomorrow
    }
    await req.accountUser.save()

    const remainingChats = isUnlimited(req.planLimits.aiChatsPerDay)
        ? 'unlimited'
        : Math.max(req.planLimits.aiChatsPerDay - req.accountUser.aiChatsToday, 0)

    return res.json({
        success: true,
        reply,
        remainingChats,
        data: {
            reply,
            remainingChats,
            resetsAt: req.accountUser.aiChatsResetAt,
        },
    })
}))

export default router
