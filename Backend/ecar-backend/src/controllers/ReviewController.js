const mongoose = require('mongoose')
const ReviewModel = require('../models/ReviewModel')
const CarModel = require('../models/CarModel')
const { syncCarRating } = require('../utils/ReviewRatingSync')

const getReviewsByCar = async (req, res) => {
    try {
        const { carId } = req.params
        const reviews = await ReviewModel.find({ carId })
            .populate('userId', 'name')
            .sort({ createdAt: -1 })

        res.json({
            message: 'Reviews fetched successfully',
            data: reviews,
        })
    } catch (err) {
        res.status(500).json({ message: 'Error while fetching reviews', err })
    }
}

const addReview = async (req, res) => {
    try {
        const { carId } = req.params
        const { rating, title, comment } = req.body
        const userId = req.user.id

        const car = await CarModel.findById(carId)
        if (!car) {
            return res.status(404).json({ message: 'Car not found' })
        }

        const existingReview = await ReviewModel.findOne({ carId, userId })
        if (existingReview) {
            return res.status(409).json({ message: 'You have already reviewed this car' })
        }

        const savedReview = await ReviewModel.create({
            carId,
            userId,
            rating,
            title,
            comment,
        })

        await syncCarRating(carId)
        const populatedReview = await ReviewModel.findById(savedReview._id).populate('userId', 'name')

        res.status(201).json({
            message: 'Review added successfully',
            data: populatedReview,
        })
    } catch (err) {
        res.status(500).json({ message: 'Error while adding review', err })
    }
}

const updateReview = async (req, res) => {
    try {
        const { reviewId } = req.params
        const { rating, title, comment } = req.body
        const userId = req.user.id

        const review = await ReviewModel.findById(reviewId)
        if (!review) {
            return res.status(404).json({ message: 'Review not found' })
        }

        if (String(review.userId) !== String(userId) && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'You can only update your own review' })
        }

        review.rating = rating
        review.title = title || ''
        review.comment = comment || ''
        await review.save()
        await syncCarRating(review.carId)

        const populatedReview = await ReviewModel.findById(review._id).populate('userId', 'name')
        res.json({ message: 'Review updated successfully', data: populatedReview })
    } catch (err) {
        res.status(500).json({ message: 'Error while updating review', err })
    }
}

const deleteReview = async (req, res) => {
    try {
        const { reviewId } = req.params
        const userId = req.user.id

        const review = await ReviewModel.findById(reviewId)
        if (!review) {
            return res.status(404).json({ message: 'Review not found' })
        }

        if (String(review.userId) !== String(userId) && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'You can only delete your own review' })
        }

        const carId = review.carId
        await ReviewModel.findByIdAndDelete(reviewId)
        await syncCarRating(carId)

        res.json({ message: 'Review deleted successfully' })
    } catch (err) {
        res.status(500).json({ message: 'Error while deleting review', err })
    }
}

const getMyReviewForCar = async (req, res) => {
    try {
        const { carId } = req.params
        const userId = req.user.id
        const review = await ReviewModel.findOne({ carId, userId }).populate('userId', 'name')
        res.json({ message: 'My review fetched successfully', data: review })
    } catch (err) {
        res.status(500).json({ message: 'Error while fetching your review', err })
    }
}

module.exports = {
    getReviewsByCar,
    addReview,
    updateReview,
    deleteReview,
    getMyReviewForCar,
}