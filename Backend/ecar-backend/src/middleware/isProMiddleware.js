const User = require("../models/UserModel")

const isPro = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id)
        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }
        if (!user.isPro) {
            return res.status(403).json({ message: "Premium feature. Please upgrade to access this feature." })
        }
        next()
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message })
    }
}

module.exports = isPro