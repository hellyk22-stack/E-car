const express = require('express')
const crypto = require('crypto')
const Razorpay = require('razorpay')
const { verifyToken } = require('../middleware/AuthMiddleware')
const User = require('../models/UserModel')
const Payment = require('../models/PaymentModel')
const Wishlist = require('../models/WishlistModel')
const TestDriveBooking = require('../models/TestDriveBookingModel')
const AIChatSession = require('../models/AIChatSessionModel')
const { PLAN_LIMITS, getActiveSubscription } = require('../utils/SubscriptionUtil')

const router = express.Router()

const razorpayKeyId = process.env.RAZORPAY_KEY_ID
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET

if (!razorpayKeyId || !razorpayKeySecret) {
    console.error('Razorpay keys are not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env.')
}

let razorpay = null
if (razorpayKeyId && razorpayKeySecret) {
    razorpay = new Razorpay({
        key_id: razorpayKeyId,
        key_secret: razorpayKeySecret,
    })
    console.log('Razorpay initialized successfully')
}

const PLAN_PRICING = {
    pro_buyer: { monthly: 29900, annual: 299900 },
    elite: { monthly: 59900, annual: 599900 },
}

const getPlanExpiry = (billingCycle) => {
    const now = new Date()
    if (billingCycle === 'annual') {
        now.setFullYear(now.getFullYear() + 1)
    } else {
        now.setMonth(now.getMonth() + 1)
    }
    return now
}

const getTodayStart = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today
}

const getAiChatsToday = async (userId) => {
    const todayAtMidnight = getTodayStart()
    const sessionsWithTodayMessages = await AIChatSession.find({
        userId,
        updatedAt: { $gte: todayAtMidnight },
    }).select('messages updatedAt').lean()

    return sessionsWithTodayMessages.reduce((count, session) => {
        const todayMessages = (session.messages || []).filter((message) =>
            message.role === 'user' && new Date(message.createdAt || session.updatedAt) >= todayAtMidnight
        )
        return count + todayMessages.length
    }, 0)
}

router.get('/status', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id
        const user = await User.findById(userId).lean()
        if (!user) return res.status(404).json({ message: 'User not found' })

        const subscription = getActiveSubscription(user)

        if (subscription.isExpired && subscription.storedPlan !== 'explorer') {
            await User.findByIdAndUpdate(userId, {
                'subscription.plan': 'explorer',
                'subscription.planExpiry': null,
                'subscription.billingCycle': null,
            })
        }

        const [wishlistCount, activeBookingsCount, aiChatsToday, savedComparisonsCount] = await Promise.all([
            Wishlist.countDocuments({ userId }),
            TestDriveBooking.countDocuments({
                user: userId,
                status: { $in: ['pending', 'confirmed'] },
            }),
            getAiChatsToday(userId),
            SavedComparison.countDocuments({ userId }),
        ])

        res.json({
            message: 'Subscription status fetched',
            data: {
                plan: subscription.plan,
                planLabel: subscription.planLabel,
                planExpiry: subscription.planExpiry,
                billingCycle: subscription.billingCycle,
                limits: subscription.limits,
                usage: {
                    wishlistCount,
                    wishlistLimit: subscription.limits.wishlistLimit,
                    activeBookingsCount,
                    activeBookingsLimit: subscription.limits.activeBookingsLimit,
                    aiChatsToday,
                    aiChatsLimit: subscription.limits.aiChatsPerDay,
                    savedComparisonsCount,
                    savedComparisonsLimit: subscription.limits.smartCompareLimit,
                },
            },
        })
    } catch (error) {
        console.error('Subscription status error:', error)
        res.status(500).json({ message: 'Error fetching subscription status', error: error.message })
    }
})

router.get('/plans', (req, res) => {
    res.json({
        message: 'Plans fetched',
        data: [
            {
                id: 'pro_buyer',
                name: 'Pro Buyer',
                description: 'Unlock smart comparisons, AI assistant, price alerts, and priority showroom access.',
                monthlyPrice: PLAN_PRICING.pro_buyer.monthly,
                annualPrice: PLAN_PRICING.pro_buyer.annual,
                limits: PLAN_LIMITS.pro_buyer,
            },
            {
                id: 'elite',
                name: 'Elite',
                description: 'Everything unlimited. Early access to new features, PDF & Excel exports, and more.',
                monthlyPrice: PLAN_PRICING.elite.monthly,
                annualPrice: PLAN_PRICING.elite.annual,
                limits: PLAN_LIMITS.elite,
            },
        ],
    })
})

router.post('/create-order', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id
        const { plan, billingCycle } = req.body

        if (!razorpay) {
            return res.status(500).json({ message: 'Razorpay configuration missing on server' })
        }

        if (!plan || !PLAN_PRICING[plan]) {
            return res.status(400).json({ message: 'Invalid plan selected' })
        }

        if (!['monthly', 'annual'].includes(billingCycle)) {
            return res.status(400).json({ message: 'Invalid billing cycle' })
        }

        const user = await User.findById(userId)
        if (!user) return res.status(404).json({ message: 'User not found' })

        const currentSubscription = getActiveSubscription(user)
        const isSameActivePlan = currentSubscription.plan !== 'explorer' && currentSubscription.plan === plan

        if (isSameActivePlan) {
            return res.status(400).json({ message: `You already have an active ${currentSubscription.planLabel} subscription.` })
        }

        const amountInPaise = PLAN_PRICING[plan][billingCycle]
        const order = await razorpay.orders.create({
            amount: amountInPaise,
            currency: 'INR',
            receipt: `rcpt_${userId.toString().slice(-8)}_${Date.now()}`,
            payment_capture: 1,
            notes: {
                userId,
                plan,
                billingCycle,
            },
        })

        const payment = new Payment({
            userId,
            orderId: order.id,
            amount: amountInPaise / 100,
            plan,
            billingCycle,
            status: 'created',
        })
        await payment.save()

        res.json({
            message: 'Order created successfully',
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            key: razorpayKeyId,
            plan,
            billingCycle,
        })
    } catch (error) {
        console.error('Create order error:', error)
        const razorpayError = error?.error?.description || error?.description || error?.message || 'Unknown Razorpay error'
        res.status(500).json({
            message: razorpayError,
            error: error?.error || error?.description || error?.message || 'Unknown Razorpay error',
        })
    }
})

router.post('/verify-payment', verifyToken, async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body
        const userId = req.user.id

        const sign = `${razorpay_order_id}|${razorpay_payment_id}`
        const expectedSign = crypto
            .createHmac('sha256', razorpayKeySecret)
            .update(sign)
            .digest('hex')

        if (razorpay_signature !== expectedSign) {
            return res.status(400).json({ message: 'Payment verification failed: signature mismatch' })
        }

        const payment = await Payment.findOneAndUpdate(
            { orderId: razorpay_order_id, userId },
            {
                paymentId: razorpay_payment_id,
                status: 'paid',
                razorpayResponse: req.body,
            },
            { new: true }
        )

        if (!payment) {
            return res.status(404).json({ message: 'Payment record not found' })
        }

        const planExpiry = getPlanExpiry(payment.billingCycle)
        await User.findByIdAndUpdate(userId, {
            'subscription.plan': payment.plan,
            'subscription.planExpiry': planExpiry,
            'subscription.billingCycle': payment.billingCycle,
        })

        res.json({
            message: 'Payment verified and subscription activated!',
            success: true,
            data: {
                plan: payment.plan,
                billingCycle: payment.billingCycle,
                planExpiry,
            },
        })
    } catch (error) {
        console.error('Verify payment error:', error)
        res.status(500).json({ message: 'Payment verification failed', error: error.message })
    }
})

router.post('/webhook', (req, res) => {
    try {
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET
        const signature = req.headers['x-razorpay-signature']

        if (secret && signature) {
            const expectedSignature = crypto
                .createHmac('sha256', secret)
                .update(JSON.stringify(req.body))
                .digest('hex')

            if (signature !== expectedSignature) {
                return res.status(400).json({ message: 'Invalid webhook signature' })
            }
        }

        if (req.body.event === 'payment.captured') {
            const paymentEntity = req.body.payload.payment.entity
            console.log('Payment captured via webhook:', paymentEntity.id)
        }

        res.json({ status: 'ok' })
    } catch (error) {
        console.error('Webhook error:', error)
        res.status(500).json({ message: 'Webhook processing failed' })
    }
})

router.post('/cancel', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id
        const user = await User.findById(userId)
        if (!user) return res.status(404).json({ message: 'User not found' })

        const subscription = getActiveSubscription(user)
        if (subscription.plan === 'explorer') {
            return res.status(400).json({ message: 'You are already on the free Explorer plan.' })
        }

        await User.findByIdAndUpdate(userId, {
            'subscription.plan': 'explorer',
            'subscription.planExpiry': null,
            'subscription.billingCycle': null,
        })

        res.json({
            message: 'Subscription cancelled. You have been moved to the Explorer plan.',
            success: true,
        })
    } catch (error) {
        console.error('Cancel subscription error:', error)
        res.status(500).json({ message: 'Error cancelling subscription', error: error.message })
    }
})

router.get('/history', verifyToken, async (req, res) => {
    try {
        const payments = await Payment.find({ userId: req.user.id }).sort({ createdAt: -1 }).lean()
        res.json({
            message: 'Payment history retrieved',
            data: payments,
        })
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message })
    }
})

module.exports = router
