const WishlistModel = require("../models/WishlistModel")

const getMyWishlist = async (req, res) => {
    try {
        const idsOnly = req.query.idsOnly === "true"
        const items = await WishlistModel.find({ userId: req.user.id })
            .sort({ createdAt: -1 })
            .populate({
                path: "carId",
                match: { status: { $ne: "inactive" } },
            })
            .lean()

        const validItems = items.filter((item) => item.carId)

        if (idsOnly) {
            return res.json({
                message: "Wishlist ids fetched",
                data: validItems.map((item) => String(item.carId._id)),
            })
        }

        return res.json({
            message: "Wishlist fetched",
            data: validItems.map((item) => item.carId),
        })
    } catch (err) {
        return res.status(500).json({ message: "Error while fetching wishlist", err })
    }
}

const checkWishlistStatus = async (req, res) => {
    try {
        const item = await WishlistModel.findOne({ userId: req.user.id, carId: req.params.carId }).lean()
        return res.json({ message: "Wishlist status fetched", data: { inWishlist: !!item } })
    } catch (err) {
        return res.status(500).json({ message: "Error while checking wishlist", err })
    }
}

const addToWishlist = async (req, res) => {
    try {
        const existing = await WishlistModel.findOne({ userId: req.user.id, carId: req.params.carId })
        if (existing) {
            return res.json({ message: "Car already in wishlist", data: existing })
        }

        const saved = await WishlistModel.create({ userId: req.user.id, carId: req.params.carId })
        return res.status(201).json({ message: "Car added to wishlist", data: saved })
    } catch (err) {
        return res.status(500).json({ message: "Error while adding to wishlist", err })
    }
}

const removeFromWishlist = async (req, res) => {
    try {
        await WishlistModel.findOneAndDelete({ userId: req.user.id, carId: req.params.carId })
        return res.json({ message: "Car removed from wishlist" })
    } catch (err) {
        return res.status(500).json({ message: "Error while removing from wishlist", err })
    }
}

const clearWishlist = async (req, res) => {
    try {
        await WishlistModel.deleteMany({ userId: req.user.id })
        return res.json({ message: "Wishlist cleared" })
    } catch (err) {
        return res.status(500).json({ message: "Error while clearing wishlist", err })
    }
}

module.exports = {
    getMyWishlist,
    checkWishlistStatus,
    addToWishlist,
    removeFromWishlist,
    clearWishlist,
}