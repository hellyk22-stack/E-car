const router = require("express").Router()
const wishlistController = require("../controllers/WishlistController")
const { verifyToken } = require("../middleware/AuthMiddleware")

router.get("/my", verifyToken, wishlistController.getMyWishlist)
router.get("/check/:carId", verifyToken, wishlistController.checkWishlistStatus)
router.post("/:carId", verifyToken, wishlistController.addToWishlist)
router.delete("/my/all", verifyToken, wishlistController.clearWishlist)
router.delete("/:carId", verifyToken, wishlistController.removeFromWishlist)

module.exports = router