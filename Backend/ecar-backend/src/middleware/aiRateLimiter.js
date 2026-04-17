// const rateLimit = require("express-rate-limit")
// const User = require("../models/UserModel")

// // Rate limiter for AI chat - 5 messages per day for free users
// const aiRateLimiter = rateLimit({
//     windowMs: 24 * 60 * 60 * 1000, // 24 hours
//     max: 5, // 5 requests per window
//     message: {
//         message: "Daily AI chat limit reached. Upgrade to premium for unlimited access.",
//         limitReached: true
//     },
//     standardHeaders: true,
//     legacyHeaders: false,
//     skip: async (req, res) => {
//         // Skip rate limiting for premium users
//         if (!req.user) return false
//         try {
//             const user = await User.findById(req.user.userId)
//             return user && user.isPro
//         } catch (error) {
//             return false
//         }
//     },
//     keyGenerator: (req) => {
//         return req.user ? req.user.userId : req.ip
//     }
// })

// module.exports = aiRateLimiter