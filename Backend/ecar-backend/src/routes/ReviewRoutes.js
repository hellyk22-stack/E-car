const router = require('express').Router()
const reviewController = require('../controllers/ReviewController')
const { verifyToken } = require('../middleware/AuthMiddleware')

router.get('/car/:carId', reviewController.getReviewsByCar)
router.get('/car/:carId/me', verifyToken, reviewController.getMyReviewForCar)
router.post('/car/:carId', verifyToken, reviewController.addReview)
router.put('/:reviewId', verifyToken, reviewController.updateReview)
router.delete('/:reviewId', verifyToken, reviewController.deleteReview)

module.exports = router