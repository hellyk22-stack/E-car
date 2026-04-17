import express from 'express'
import Car from '../models/Car.js'
import WishlistItem from '../models/WishlistItem.js'
import verifyToken from '../middleware/verifyToken.js'
import { attachPlanContext } from '../middleware/checkFeature.js'
import { asyncHandler } from '../utils/api.js'
import { isUnlimited } from '../utils/subscriptionHelpers.js'
import { logActivity } from '../utils/services.js'

const router = express.Router()

router.use(verifyToken, attachPlanContext)

const refreshWishlistCount = async (user) => {
    user.wishlistCount = await WishlistItem.countDocuments({ user: user._id })
    await user.save()
}

router.get('/my', asyncHandler(async (req, res) => {
    const idsOnly = String(req.query.idsOnly || 'false') === 'true'
    const items = await WishlistItem.find({ user: req.accountUser._id })
        .populate('car')
        .sort({ createdAt: -1 })

    return res.json({
        success: true,
        data: idsOnly
            ? items.map((item) => String(item.car?._id || item.car))
            : items.map((item) => item.car).filter(Boolean),
    })
}))

router.get('/check/:carId', asyncHandler(async (req, res) => {
    const item = await WishlistItem.findOne({ user: req.accountUser._id, car: req.params.carId })
    return res.json({ success: true, data: { inWishlist: !!item } })
}))

router.post('/:carId', asyncHandler(async (req, res) => {
    const car = await Car.findById(req.params.carId)
    if (!car) {
        return res.status(404).json({ success: false, message: 'Car not found' })
    }

    const existing = await WishlistItem.findOne({ user: req.accountUser._id, car: car._id })
    if (existing) {
        return res.json({ success: true, data: { alreadySaved: true } })
    }

    const wishlistLimit = req.planLimits.wishlistLimit
    if (!isUnlimited(wishlistLimit) && req.accountUser.wishlistCount >= wishlistLimit) {
        return res.status(403).json({
            success: false,
            message: 'Wishlist full. Upgrade required',
            requiredPlan: 'pro_buyer',
            feature: 'wishlistLimit',
        })
    }

    const item = await WishlistItem.create({ user: req.accountUser._id, car: car._id })
    await refreshWishlistCount(req.accountUser)

    await logActivity({
        actorId: req.accountUser._id,
        actorRole: 'user',
        action: 'WISHLIST_ADDED',
        entityType: 'Car',
        entityId: car._id,
        description: `Added ${car.name} to wishlist`,
    })

    return res.status(201).json({ success: true, data: item })
}))

router.delete('/:carId', asyncHandler(async (req, res) => {
    await WishlistItem.findOneAndDelete({ user: req.accountUser._id, car: req.params.carId })
    await refreshWishlistCount(req.accountUser)
    return res.json({ success: true, data: { removed: true } })
}))

router.delete('/my/all', asyncHandler(async (req, res) => {
    await WishlistItem.deleteMany({ user: req.accountUser._id })
    await refreshWishlistCount(req.accountUser)
    return res.json({ success: true, data: { cleared: true } })
}))

export default router
