const express = require('express')
const { verifyToken } = require('../middleware/AuthMiddleware')
const Car = require('../models/CarModel')
const AIChatSession = require('../models/AIChatSessionModel')
const { resolveReviewRating, resolveSafetyRating } = require('../utils/CarRatingUtil')
const User = require('../models/UserModel')
const { getActiveSubscription, isUnlimited } = require('../utils/SubscriptionUtil')

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
            rating: resolveReviewRating(car),
            reviewRating: resolveReviewRating(car),
            safetyRating: resolveSafetyRating(car),
        }))
        : []
)

const formatPriceINR = (price) => {
    const numericPrice = Number(price)
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) return 'price on request'

    if (numericPrice >= 10000000) {
        return `Rs ${(numericPrice / 10000000).toFixed(2).replace(/\.00$/, '')} crore`
    }

    if (numericPrice >= 100000) {
        return `Rs ${(numericPrice / 100000).toFixed(2).replace(/\.00$/, '')} lakh`
    }

    return `Rs ${numericPrice.toLocaleString('en-IN')}`
}

const extractBudget = (text) => {
    if (!text) return null

    const normalized = String(text).toLowerCase().replace(/,/g, '')
    const patterns = [
        /(?:under|below|less than|upto|up to|max(?:imum)?|budget(?: is)?|around)\s*rs\.?\s*(\d+(?:\.\d+)?)/i,
        /(?:under|below|less than|upto|up to|max(?:imum)?|budget(?: is)?|around)\s*(\d+(?:\.\d+)?)\s*(lakh|lac|lakhs|lacs|crore|crores|cr)/i,
        /rs\.?\s*(\d+(?:\.\d+)?)\s*(lakh|lac|lakhs|lacs|crore|crores|cr)?/i,
        /\b(\d+(?:\.\d+)?)\s*(lakh|lac|lakhs|lacs|crore|crores|cr)\b/i,
        /\b(\d{5,8})\b/,
    ]

    for (const pattern of patterns) {
        const match = normalized.match(pattern)
        if (!match) continue

        const amount = Number(match[1])
        if (!Number.isFinite(amount)) continue

        const unit = match[2]
        if (!unit) {
            return amount >= 100000 ? amount : amount * 100000
        }

        if (['crore', 'crores', 'cr'].includes(unit)) {
            return amount * 10000000
        }

        return amount * 100000
    }

    return null
}

const inferPreferences = (text) => {
    const normalized = String(text || '').toLowerCase()

    return {
        budget: extractBudget(normalized),
        wantsFamilyCar: /\bfamily|kids|children|parents|spacious|space|7 seater|6 seater\b/.test(normalized),
        prefersSUV: /\bsuv|compact suv|midsize suv\b/.test(normalized),
        prefersSedan: /\bsedan\b/.test(normalized),
        prefersHatchback: /\bhatchback\b/.test(normalized),
        prefersLuxury: /\bluxury|premium\b/.test(normalized),
        wantsElectric: /\bev|electric\b/.test(normalized),
        wantsDiesel: /\bdiesel\b/.test(normalized),
        wantsPetrol: /\bpetrol\b/.test(normalized),
        wantsAutomatic: /\bautomatic|amt|cvt| at\b/.test(` ${normalized}`),
        wantsManual: /\bmanual\b/.test(normalized),
        wantsMileage: /\bmileage|fuel economy|efficient|efficiency\b/.test(normalized),
        wantsPerformance: /\bperformance|power|powerful|fast|pickup\b/.test(normalized),
        wantsSafety: /\bsafe|safety|airbag|ncap\b/.test(normalized),
        wantsCityUse: /\bcity|traffic|daily commute|commute\b/.test(normalized),
        wantsHighwayUse: /\bhighway|long drive|road trip|touring\b/.test(normalized),
    }
}

const detectIntent = (text) => {
    const normalized = String(text || '').toLowerCase()

    if (/\b(showroom|dealer|nearby showroom|availability at showroom|showroom availability|available slots|slot availability)\b/.test(normalized)) {
        return 'showroom_help'
    }

    if (/\b(cancel booking|cancel my booking|reschedule|my bookings|booking status)\b/.test(normalized)) {
        return 'booking_manage_help'
    }

    if (/\b(book|booking|test drive|test-drive|schedule|slot|availability|showroom visit|home drive|home delivery)\b/.test(normalized)) {
        return 'booking_help'
    }

    if (/\b(compare|comparison|compare cars|vs\b)\b/.test(normalized)) {
        return 'comparison_help'
    }

    if (/\b(wishlist|save car|favourite|favorite|shortlist)\b/.test(normalized)) {
        return 'wishlist_help'
    }

    if (/\b(payment|pay|subscription|plan|pricing|premium|pro buyer|elite|upgrade|razorpay)\b/.test(normalized)) {
        return 'payment_help'
    }

    return 'car_recommendation'
}

const buildHelpReply = (intent) => {
    if (intent === 'booking_help') {
        return `TEST DRIVE BOOKING

Steps
1. Open the car you like and choose Book Test Drive.
2. Pick the showroom or choose home test drive if that option is available.
3. Select your preferred date and time slot.
4. Enter your contact details and driving licence details.
5. Submit the request and wait for confirmation.

Keep These Ready
- Full name
- Phone number
- Address
- Pincode
- Driving licence number
- Driving licence expiry date
- Licence image if requested

What Happens Next
- Your request is created as pending
- The showroom reviews it
- You will see the booking in your Test Drives section
- Once approved, the booking status changes to confirmed

Note
You can choose either a showroom visit or a home test drive when available.`
    }

    if (intent === 'booking_manage_help') {
        return `BOOKING MANAGEMENT

Available Actions
- Open Test Drives to see all your bookings
- Tap any booking to view full details
- If a booking is still pending, you can cancel it
- Completed bookings can be rated afterward

Common Statuses
- Pending: waiting for showroom approval
- Confirmed: your slot is approved
- Cancelled: booking was cancelled
- Completed: test drive finished

Tip
If you need a different time, cancel the pending booking and create a new one.`
    }

    if (intent === 'comparison_help') {
        return `CAR COMPARISON

How It Works
- Pick at least 2 cars to compare
- You can compare price, mileage, engine, seating, ratings, and more
- You can also save the comparison if your plan supports it

Limits
- Select 2 to 10 cars
- Free users get 3 smart comparisons
- Saved comparisons are for premium users

What You Can Do
- Compare cars side by side
- Save a shortlist with a custom name
- Reopen saved comparisons later`
    }

    if (intent === 'wishlist_help') {
        return `WISHLIST

What You Can Do
- Save cars you like for later
- Remove cars from your wishlist anytime
- Check your full wishlist from the Wishlist page
- Clear the whole wishlist if needed

Typical Use
If you are shortlisting cars before comparing or booking a test drive, wishlist is the easiest place to keep them.`
    }

    if (intent === 'payment_help') {
        return `PLANS AND PAYMENTS

What You Can Do
- View available plans from the Pricing page
- Check your current plan and usage
- Upgrade through Razorpay
- View your payment history

Plan Flow
1. Open Pricing
2. Choose a plan like Pro Buyer or Elite
3. Select monthly or annual billing
4. Complete payment
5. Your account updates after successful payment`
    }

    if (intent === 'showroom_help') {
        return `SHOWROOMS AND AVAILABILITY

What You Can Do
- Browse approved showrooms
- Find nearby showrooms
- Check which brands and cars a showroom supports
- See available test drive slots for a selected date

Best Way To Use It
1. Search for a showroom by city or nearby area
2. Open the showroom details
3. Check available time slots
4. Pick a slot and continue with test drive booking`
    }

    return null
}

const scoreCarForPreferences = (car, preferences) => {
    let score = 0
    const reasons = []

    if (preferences.budget) {
        if (Number(car.price) <= preferences.budget) {
            score += 35
            reasons.push(`fits your budget at ${formatPriceINR(car.price)}`)
        } else if (Number(car.price) <= preferences.budget * 1.15) {
            score += 12
            reasons.push(`is only slightly above budget at ${formatPriceINR(car.price)}`)
        } else {
            score -= 20
        }
    }

    if (preferences.prefersSUV && car.type === 'SUV') {
        score += 18
        reasons.push('matches your SUV preference')
    }
    if (preferences.prefersSedan && car.type === 'Sedan') {
        score += 18
        reasons.push('matches your sedan preference')
    }
    if (preferences.prefersHatchback && car.type === 'Hatchback') {
        score += 18
        reasons.push('matches your hatchback preference')
    }
    if (preferences.prefersLuxury && car.type === 'Luxury') {
        score += 18
        reasons.push('matches your premium preference')
    }

    if (preferences.wantsFamilyCar && Number(car.seating) >= 5) {
        score += Number(car.seating) >= 6 ? 18 : 12
        reasons.push(`offers ${car.seating || 5}-seat practicality`)
    }

    if (preferences.wantsElectric && car.fuel === 'Electric') {
        score += 16
        reasons.push('matches your EV preference')
    }
    if (preferences.wantsDiesel && car.fuel === 'Diesel') {
        score += 12
        reasons.push('matches your diesel preference')
    }
    if (preferences.wantsPetrol && car.fuel === 'Petrol') {
        score += 12
        reasons.push('matches your petrol preference')
    }

    if (preferences.wantsAutomatic && car.transmission === 'Automatic') {
        score += 10
        reasons.push('has an automatic transmission')
    }
    if (preferences.wantsManual && car.transmission === 'Manual') {
        score += 8
        reasons.push('has a manual transmission')
    }

    if (preferences.wantsMileage && Number(car.mileage) > 0) {
        score += Math.min(12, Number(car.mileage) / 2)
        reasons.push(`delivers ${car.mileage} km/l mileage`)
    }

    if (preferences.wantsPerformance && Number(car.engine) > 0) {
        score += Math.min(12, Number(car.engine) / 200)
        reasons.push(`offers a ${car.engine} cc engine`)
    }

    if (preferences.wantsSafety && Number(car.safetyRating) > 0) {
        score += Number(car.safetyRating) * 2
        reasons.push(`has a ${car.safetyRating}/5 safety rating`)
    }

    if (preferences.wantsCityUse) {
        if (car.type === 'Hatchback' || car.type === 'Sedan') score += 7
        if (car.transmission === 'Automatic') score += 5
    }

    if (preferences.wantsHighwayUse) {
        if (car.type === 'SUV' || car.type === 'Sedan') score += 7
        if (Number(car.engine) >= 1200) score += 5
    }

    score += Number(car.reviewRating || 0) * 2
    score += Number(car.safetyRating || 0)

    return { score, reasons }
}

const buildRuleBasedReply = (messages, carInventory) => {
    const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user')?.content?.trim() || ''
    const intent = detectIntent(lastUserMessage)
    const helpReply = buildHelpReply(intent)

    if (helpReply) {
        return helpReply
    }

    const preferences = inferPreferences(lastUserMessage)
    const normalizedInventory = buildInventorySummary(carInventory)

    if (!normalizedInventory.length) {
        return "I couldn't find any active cars in the inventory right now. Please try again after the inventory loads."
    }

    const rankedCars = normalizedInventory
        .map((car) => ({
            ...car,
            match: scoreCarForPreferences(car, preferences),
        }))
        .sort((left, right) => right.match.score - left.match.score || left.price - right.price)

    const shortlistedCars = rankedCars.slice(0, 3)

    if (!shortlistedCars.length) {
        return "I couldn't find a strong match yet. Tell me your budget, body type, fuel choice, and whether this is mainly for city or family use."
    }

    const introParts = []
    if (preferences.budget) introParts.push(`for a budget around ${formatPriceINR(preferences.budget)}`)
    if (preferences.wantsFamilyCar) introParts.push('for family-friendly use')
    if (preferences.wantsCityUse) introParts.push('for city driving')
    if (preferences.wantsHighwayUse) introParts.push('for highway trips')

    const intro = introParts.length
        ? `Here are the best matches ${introParts.join(', ')}:`
        : 'Here are the best matches from our current inventory:'

    const recommendations = shortlistedCars.map((car, index) => {
        const highlights = car.match.reasons.slice(0, 2).join(', ')
        return `${index + 1}. ${car.brand} ${car.name} (${car.type}) - ${formatPriceINR(car.price)}. ${highlights || 'Well-rounded overall choice'}.`
    })

    const followUp = preferences.budget || preferences.prefersSUV || preferences.prefersSedan || preferences.prefersHatchback || preferences.wantsElectric
        ? 'If you want, I can narrow this down further by mileage, automatic/manual, or lowest maintenance.'
        : 'Share your budget and whether you want an SUV, sedan, hatchback, EV, or family car, and I can narrow this down better.'

    return `${intro}\n${recommendations.join('\n')}\n${followUp}`
}

const getAnthropicReply = async (messages, carInventory) => {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
        console.log('ANTHROPIC_API_KEY missing - using local advisor')
        return {
            ok: true,
            reply: buildRuleBasedReply(messages, carInventory),
        }
    }

    const inventorySummary = buildInventorySummary(carInventory)
    const systemPrompt = `You are an expert AI car advisor for E-CAR, an Indian car marketplace.
You help users find the perfect car based on their budget, preferences, and needs.
Here is the current car inventory:
${JSON.stringify(inventorySummary, null, 2)}
Always recommend cars from this inventory when possible.
Mention price in Indian Rupees and keep the answer concise, practical, and helpful.`

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-3-haiku-20240307',
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
    } catch (err) {
        return { ok: false, status: 500, error: 'Failed to reach AI service' }
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

router.post('/chat', verifyToken, async (req, res) => {
    try {
        const { messages, message, carInventory } = req.body || {}
        const candidateMessages = Array.isArray(messages) && messages.length
            ? messages
            : [{ role: 'user', content: message }]
        const safeMessages = sanitizeMessages(candidateMessages)

        if (!safeMessages.length) {
            return res.status(400).json({ message: 'No valid messages provided' })
        }

        const user = await User.findById(req.user.id).lean()
        if (!user) {
            return res.status(404).json({ message: 'User not found' })
        }

        const subscription = getActiveSubscription(user)
        if (!isUnlimited(subscription.limits.aiChatsPerDay)) {
            const todayAtMidnight = new Date()
            todayAtMidnight.setHours(0, 0, 0, 0)
            const sessionsWithTodayMessages = await AIChatSession.find({
                userId: req.user.id,
                updatedAt: { $gte: todayAtMidnight },
            }).select('messages updatedAt').lean()

            const aiChatsToday = sessionsWithTodayMessages.reduce((count, session) => {
                const todayMessages = (session.messages || []).filter((chatMessage) =>
                    chatMessage.role === 'user' && new Date(chatMessage.createdAt || session.updatedAt) >= todayAtMidnight
                )
                return count + todayMessages.length
            }, 0)

            if (aiChatsToday >= subscription.limits.aiChatsPerDay) {
                return res.status(403).json({
                    message: `Your ${subscription.planLabel} plan allows ${subscription.limits.aiChatsPerDay} AI chats per day.`,
                    limitReached: true,
                    aiChatsLimit: subscription.limits.aiChatsPerDay,
                })
            }
        }

        let activeInventory = carInventory
        try {
            if (!Array.isArray(activeInventory) || !activeInventory.length) {
                activeInventory = await Car.find({ status: 'active' }).limit(50).lean()
            }
        } catch (dbErr) {
            console.error('Database error in AI route:', dbErr)
            activeInventory = []
        }

        console.log(`AI Chat: Processing request for user ${req.user.id} with ${activeInventory.length} cars`)

        const result = await getAnthropicReply(safeMessages, activeInventory)

        if (!result.ok) {
            return res.status(result.status || 500).json({
                message: result.error || 'AI service unavailable',
                error: result.error,
            })
        }

        return res.json({ reply: result.reply })
    } catch (err) {
        console.error('AI route error:', err)
        return res.status(500).json({
            message: `Internal AI Error: ${err.message}`,
            error: err.stack,
        })
    }
})

module.exports = router
