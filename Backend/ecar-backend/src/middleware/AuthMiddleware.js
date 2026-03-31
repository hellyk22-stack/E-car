const jwt = require("jsonwebtoken")

const verifyToken = (req, res, next) => {
    const token = req.headers.token
    if (!token) {
        return res.status(401).json({
            message: "Token is missing"
        })
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "ecar_secret_key_2026")
        req.user = decoded
        next()
    } catch (err) {
        return res.status(401).json({
            message: "Invalid or expired token"
        })
    }
}

const verifyAdmin = (req, res, next) => {
    verifyToken(req, res, () => {
        if (req.user.role === "admin") {
            next()
        } else {
            return res.status(403).json({
                message: "Admin access only"
            })
        }
    })
}

module.exports = {
    verifyToken,
    verifyAdmin
}