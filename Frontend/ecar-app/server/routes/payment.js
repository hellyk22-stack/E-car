import crypto from 'crypto'
import express from 'express'
import Subscription from '../models/Subscription.js'
import TestDriveBooking from '../models/TestDriveBooking.js'
import verifyToken from '../middleware/verifyToken.js'
import { attachPlanContext } from '../middleware/checkFeature.js'
import {
    buildUsageSnapshot,
    calculateSubscriptionAmount,
    calculateSubscriptionEndDate,
    getBillingCycleLabel,
    getPlanLabel,
    sanitizePublicLimits,
} from '../utils/subscriptionHelpers.js'
import { subscriptionActivatedTemplate, subscriptionCancelledTemplate } from '../utils/emailTemplates.js'
import { sendEmailSafe } from '../utils/mailer.js'
import { asyncHandler } from '../utils/api.js'
import { logActivity } from '../utils/services.js'

const router = express.Router()

router.use(verifyToken, attachPlanContext)

router.post('/create-order', asyncHandler(async (req, res) => {
    const { plan, billingCycle } = req.body
    if (!['pro_buyer', 'elite'].includes(plan) || !['monthly', 'annual'].includes(billingCycle)) {
        return res.status(400).json({ success: false, message: 'Invalid plan or billing cycle' })
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        return res.status(500).json({ success: false, message: 'Razorpay credentials are not configured' })
    }

    const amount = calculateSubscriptionAmount(plan, billingCycle)
    const razorpayModule = await import('razorpay')
    const Razorpay = razorpayModule.default || razorpayModule
    const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
    })

    const order = await razorpay.orders.create({
        amount,
        currency: 'INR',
        receipt: `ecar_${req.user.id}_${Date.now()}`,
    })

    const subscription = await Subscription.create({
        user: req.accountUser._id,
        plan,
        billingCycle,
        amount,
        currency: 'INR',
        status: 'created',
        razorpayOrderId: order.id,
    })

    await logActivity({
        actorId: req.accountUser._id,
        actorRole: 'user',
        action: 'SUBSCRIPTION_ORDER_CREATED',
        entityType: 'Subscription',
        entityId: subscription._id,
        description: `Created Razorpay order for ${getPlanLabel(plan)}`,
        meta: { billingCycle, amount, razorpayOrderId: order.id },
    })

    return res.status(201).json({
        success: true,
        data: {
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: process.env.RAZORPAY_KEY_ID,
        },
    })
}))

router.post('/verify', asyncHandler(async (req, res) => {
    const {
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        plan,
        billingCycle,
    } = req.body

    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex')

    const subscription = await Subscription.findOne({
        user: req.accountUser._id,
        razorpayOrderId,
    })

    if (!subscription) {
        return res.status(404).json({ success: false, message: 'Subscription order not found' })
    }

    if (expectedSignature !== razorpaySignature) {
        subscription.status = 'failed'
        subscription.razorpayPaymentId = razorpayPaymentId
        subscription.razorpaySignature = razorpaySignature
        await subscription.save()

        return res.status(400).json({ success: false, message: 'Payment verification failed' })
    }

    const startDate = new Date()
    const endDate = calculateSubscriptionEndDate(startDate, billingCycle)

    subscription.status = 'paid'
    subscription.plan = plan
    subscription.billingCycle = billingCycle
    subscription.razorpayPaymentId = razorpayPaymentId
    subscription.razorpaySignature = razorpaySignature
    subscription.startDate = startDate
    subscription.endDate = endDate
    await subscription.save()

    req.accountUser.plan = plan
    req.accountUser.planExpiry = endDate
    req.accountUser.billingCycle = billingCycle
    await req.accountUser.save()

    await sendEmailSafe({
        to: req.accountUser.email,
        ...subscriptionActivatedTemplate({
            userName: req.accountUser.name,
            planLabel: getPlanLabel(plan),
            billingCycleLabel: getBillingCycleLabel(billingCycle),
            amount: subscription.amount,
            startDate,
            endDate,
            paymentId: razorpayPaymentId,
        }),
    })

    await logActivity({
        actorId: req.accountUser._id,
        actorRole: 'user',
        action: 'SUBSCRIPTION_PAYMENT_VERIFIED',
        entityType: 'Subscription',
        entityId: subscription._id,
        description: `Activated ${getPlanLabel(plan)} plan`,
        meta: { billingCycle, paymentId: razorpayPaymentId, orderId: razorpayOrderId },
    })

    return res.json({
        success: true,
        data: {
            message: 'Payment successful',
            plan,
            planExpiry: endDate,
        },
    })
}))

router.post('/cancel', asyncHandler(async (req, res) => {
    const subscription = await Subscription.findOne({
        user: req.accountUser._id,
        status: { $in: ['created', 'paid'] },
    }).sort({ createdAt: -1 })

    if (subscription) {
        subscription.status = 'cancelled'
        subscription.cancelledAt = new Date()
        subscription.autoRenew = false
        await subscription.save()
    }

    const previousPlan = req.accountUser.plan
    req.accountUser.plan = 'explorer'
    req.accountUser.planExpiry = null
    req.accountUser.billingCycle = null
    await req.accountUser.save()

    await sendEmailSafe({
        to: req.accountUser.email,
        ...subscriptionCancelledTemplate({
            userName: req.accountUser.name,
            planLabel: getPlanLabel(previousPlan),
        }),
    })

    await logActivity({
        actorId: req.accountUser._id,
        actorRole: 'user',
        action: 'SUBSCRIPTION_CANCELLED',
        entityType: 'Subscription',
        entityId: subscription?._id,
        description: `Cancelled ${getPlanLabel(previousPlan)} plan`,
    })

    return res.json({ success: true, data: { cancelled: true } })
}))

router.get('/history', asyncHandler(async (req, res) => {
    const items = await Subscription.find({ user: req.accountUser._id }).sort({ createdAt: -1 })
    return res.json({ success: true, data: items })
}))

router.get('/status', asyncHandler(async (req, res) => {
    const activeBookingsCount = await TestDriveBooking.countDocuments({
        user: req.accountUser._id,
        status: { $in: ['pending', 'confirmed'] },
    })

    return res.json({
        success: true,
        data: {
            plan: req.userPlan,
            planLabel: getPlanLabel(req.userPlan),
            planExpiry: req.accountUser.planExpiry,
            billingCycle: req.accountUser.billingCycle,
            limits: sanitizePublicLimits(req.userPlan),
            usage: buildUsageSnapshot({ user: req.accountUser, activeBookingsCount }),
        },
    })
}))

export default router
