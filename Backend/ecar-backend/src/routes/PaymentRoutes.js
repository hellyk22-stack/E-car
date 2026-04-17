const express = require('express')
const { verifyToken } = require('../middleware/AuthMiddleware')
const User = require('../models/UserModel')
const Payment = require('../models/PaymentModel')
const Razorpay = require('razorpay')
const crypto = require('crypto')

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
        key_secret: razorpayKeySecret
    })
}

// Create Razorpay order
router.post('/create-order', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id

        // NEVER take amount from req.body for a fixed-price upgrade.
        // Fetch from a config or DB.
        const PREMIUM_PRICE_PAISE = 99900; 

        if (!razorpayKeyId || !razorpayKeySecret) {
            return res.status(500).json({ message: 'Razorpay configuration missing on server', error: 'Missing Razorpay keys' })
        }

        // Check if user is already premium
        const user = await User.findById(userId)
        if (user.isPro) {
            return res.status(400).json({ message: "User is already premium" })
        }

        // Create Razorpay order
        const options = {
            amount: PREMIUM_PRICE_PAISE, 
            currency: 'INR',
            receipt: `receipt_${userId}_${Date.now()}`,
            payment_capture: 1
        }

        const order = await razorpay.orders.create(options)

        // Save payment record
        const payment = new Payment({
            userId,
            orderId: order.id,
            amount: amount / 100, // Convert to rupees
            status: 'created'
        })
        await payment.save()

        res.json({
            message: "Order created successfully",
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            key: razorpayKeyId
        })

    } catch (error) {
        console.error('Create order error:', error)
        const razorpayError = error?.error?.description || error?.description || error?.message || 'Unknown Razorpay error'
        res.status(500).json({
            message: razorpayError,
            error: error?.error || error?.description || error?.message || 'Unknown Razorpay error'
        })
    }
})

// Verify payment
router.post('/verify-payment', verifyToken, async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body
        const userId = req.user.id

        // Verify signature
        const sign = razorpay_order_id + '|' + razorpay_payment_id
        const expectedSign = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(sign.toString())
            .digest('hex')

        if (razorpay_signature !== expectedSign) {
            return res.status(400).json({ message: "Payment verification failed" })
        }

        // Update payment record
        const payment = await Payment.findOneAndUpdate(
            { orderId: razorpay_order_id, userId },
            {
                paymentId: razorpay_payment_id,
                status: 'paid',
                razorpayResponse: req.body
            },
            { new: true }
        )

        if (!payment) {
            return res.status(404).json({ message: "Payment record not found" })
        }

        // Upgrade user to premium
        await User.findByIdAndUpdate(userId, { isPro: true })

        res.json({
            message: "Payment verified and user upgraded to premium",
            success: true
        })

    } catch (error) {
        console.error('Verify payment error:', error)
        res.status(500).json({ message: "Payment verification failed", error: error.message })
    }
})

// Webhook for additional verification (optional)
router.post('/webhook', (req, res) => {
    try {
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET
        const signature = req.headers['x-razorpay-signature']

        // Verify webhook signature
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(JSON.stringify(req.body))
            .digest('hex')

        if (signature !== expectedSignature) {
            return res.status(400).json({ message: "Invalid webhook signature" })
        }

        // Handle webhook events
        const event = req.body.event
        if (event === 'payment.captured') {
            const paymentEntity = req.body.payload.payment.entity
            // Additional processing if needed
            console.log('Payment captured:', paymentEntity.id)
        }

        res.json({ status: 'ok' })

    } catch (error) {
        console.error('Webhook error:', error)
        res.status(500).json({ message: "Webhook processing failed" })
    }
})

// Get user payment history
router.get('/history', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id
        const payments = await Payment.find({ userId }).sort({ createdAt: -1 })

        res.json({
            message: "Payment history retrieved",
            data: payments
        })
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message })
    }
})

module.exports = router