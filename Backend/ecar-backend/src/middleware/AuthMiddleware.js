const jwt = require("jsonwebtoken")

const JWT_SECRET = process.env.JWT_SECRET || "ecar_secret"

const getTokenFromRequest = (req) => {
    const headerToken = req.headers.token
    if (headerToken) return String(headerToken).trim()

    const authorization = req.headers.authorization
    if (authorization && authorization.startsWith("Bearer ")) {
        return authorization.slice(7).trim()
    }

    const accessToken = req.headers["x-access-token"]
    if (accessToken) return String(accessToken).trim()

    return ""
}

const verifyToken = (req, res, next) => {
    const token = getTokenFromRequest(req)
    if (!token) {
        return res.status(401).json({ message: "Token is missing" })
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET)
        req.user = decoded
        next()
    } catch (err) {
        return res.status(401).json({ message: "Invalid or expired token" })
    }
}

const verifyAdmin = (req, res, next) => {
    verifyToken(req, res, () => {
        if (req.user.role === "admin") {
            next()
        } else {
            return res.status(403).json({ message: "Admin access only" })
        }
    })
}

module.exports = { verifyToken, verifyAdmin }
