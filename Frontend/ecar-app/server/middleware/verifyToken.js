import jwt from 'jsonwebtoken'

const verifyToken = (req, res, next) => {
    try {
        const headerToken = req.headers.token
        const bearer = req.headers.authorization?.startsWith('Bearer ')
            ? req.headers.authorization.slice(7)
            : null
        const token = bearer || headerToken

        if (!token) {
            return res.status(401).json({ success: false, message: 'Authentication token missing' })
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret')
        req.user = {
            ...decoded,
            id: decoded.id || decoded.userId || decoded.showroomId,
            role: decoded.role,
        }

        return next()
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token' })
    }
}

export default verifyToken
