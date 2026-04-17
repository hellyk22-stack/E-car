const userSchema = require("../models/UserModel")
const WishlistModel = require("../models/WishlistModel")
const ReviewModel = require("../models/ReviewModel")
const AIChatSessionModel = require("../models/AIChatSessionModel")
const SearchEventModel = require("../models/SearchEventModel")
const CarViewEventModel = require("../models/CarViewEventModel")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const sendMail = require("../utils/MailUtil")
const { sendCsv } = require("../utils/CsvUtil")
const { logAdminActivity } = require("../utils/AdminActivityLogger")

const JWT_SECRET = process.env.JWT_SECRET || "ecar_secret"

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

const formatDateTime = (value) => value ? new Date(value).toISOString() : ""

const buildUserQuery = (search) => {
    const safeSearch = String(search || "").trim()
    if (!safeSearch) return {}

    const regex = new RegExp(escapeRegex(safeSearch), "i")
    return {
        $or: [
            { name: regex },
            { email: regex },
        ],
    }
}

const normalizeEmail = (value = "") => String(value).trim().toLowerCase()

const isBcryptHash = (value = "") => /^\$2[aby]\$/.test(String(value))

const buildAddressPayload = (value = {}) => ({
    street: String(value?.street || "").trim(),
    area: String(value?.area || "").trim(),
    city: String(value?.city || "").trim(),
    state: String(value?.state || "").trim(),
    pincode: String(value?.pincode || "").trim(),
})

const sanitizeUser = (user) => {
    if (!user) return null
    const plainUser = user.toObject ? user.toObject() : { ...user }
    delete plainUser.password
    return plainUser
}

const registerUser = async (req, res) => {
    try {
        const name = String(req.body?.name || "").trim()
        const email = normalizeEmail(req.body?.email)
        const password = String(req.body?.password || "")

        if (!name || !email || !password) {
            return res.status(400).json({ message: "Name, email, and password are required" })
        }

        const existingUser = await userSchema.findOne({ email }).lean()
        if (existingUser) {
            return res.status(409).json({ message: "An account with this email already exists" })
        }

        const hashedPassword = await bcrypt.hash(password, 10)
        const savedUser = await userSchema.create({
            ...req.body,
            name,
            email,
            password: hashedPassword
        })

        const safeUser = await userSchema.findById(savedUser._id).select("-password").lean()
        try {
            await sendMail(
                savedUser.email,
                "Welcome to E-CAR",
                `<h2>Hi ${savedUser.name}!</h2>
                 <p>Welcome to E-CAR. Your account has been created successfully.</p>`
            )
        } catch (mailErr) {
            console.log("Mail failed but user registered:", mailErr.message)
        }
        res.status(201).json({
            message: "User registered successfully",
            data: safeUser
        })
    } catch (err) {
        console.log(err)
        if (err?.code === 11000) {
            return res.status(409).json({
                message: "An account with this email already exists",
            })
        }
        res.status(500).json({
            message: "Error while registering user",
            err: err
        })
    }
}

const loginUser = async (req, res) => {
    try {
        const email = normalizeEmail(req.body?.email)
        const password = String(req.body?.password || "")

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" })
        }

        const foundUser = await userSchema.findOne({ email: email })
        if (!foundUser) {
            return res.status(404).json({ message: "User not found" })
        }

        if (foundUser.status === "inactive") {
            return res.status(403).json({ message: "Your account is deactivated" })
        }

        if (foundUser.status === "deleted") {
            return res.status(403).json({ message: "This account is no longer available" })
        }

        const storedPassword = String(foundUser.password || "")
        const isMatch = isBcryptHash(storedPassword)
            ? await bcrypt.compare(password, storedPassword)
            : password === storedPassword

        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" })
        }

        if (!isBcryptHash(storedPassword)) {
            foundUser.password = await bcrypt.hash(password, 10)
            await foundUser.save()
        }

        const token = jwt.sign(
            { id: foundUser._id, role: foundUser.role },
            JWT_SECRET,
            { expiresIn: "30d" }
        )
        res.status(200).json({
            message: "Login successful",
            token: token,
            role: foundUser.role,
            name: foundUser.name,
            data: {
                id: foundUser._id,
                name: foundUser.name,
                email: foundUser.email,
                phone: foundUser.phone || "",
                address: buildAddressPayload(foundUser.address),
                role: foundUser.role,
                status: foundUser.status,
            }
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({
            message: "Error while logging in",
            error: error
        })
    }
}

const getMyProfile = async (req, res) => {
    try {
        const user = await userSchema.findById(req.user.id).select("-password").lean()
        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }

        return res.json({
            message: "Profile fetched successfully",
            data: {
                ...user,
                address: buildAddressPayload(user.address),
            },
        })
    } catch (err) {
        return res.status(500).json({ message: "Error while fetching profile", err })
    }
}

const updateMyProfile = async (req, res) => {
    try {
        const user = await userSchema.findById(req.user.id)
        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }

        const name = String(req.body?.name ?? user.name).trim()
        const phone = String(req.body?.phone ?? user.phone ?? "").trim()
        const address = buildAddressPayload(req.body?.address || req.body)

        if (!name) {
            return res.status(400).json({ message: "Name is required" })
        }

        user.name = name
        user.phone = phone
        user.address = {
            ...(user.address?.toObject ? user.address.toObject() : user.address),
            ...address,
        }

        await user.save()

        return res.json({
            message: "Profile updated successfully",
            data: sanitizeUser(user),
        })
    } catch (err) {
        return res.status(500).json({ message: "Error while updating profile", err })
    }
}

const getAllUsers = async (req, res) => {
    try {
        const page = Math.max(Number(req.query.page || 1), 1)
        const limit = Math.min(Math.max(Number(req.query.limit || 10), 1), 50)
        const search = req.query.search || ""
        const query = buildUserQuery(search)

        const [total, users] = await Promise.all([
            userSchema.countDocuments(query),
            userSchema.find(query)
                .select("-password")
                .sort({ createdAt: -1, _id: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
        ])

        res.json({
            message: "Users fetched successfully",
            data: users,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.max(Math.ceil(total / limit), 1),
                search,
            }
        })
    } catch (err) {
        res.status(500).json({
            message: "Error while fetching users",
            err: err
        })
    }
}

const updateUser = async (req, res) => {
    try {
        const { id } = req.params
        const { role, status } = req.body || {}
        const user = await userSchema.findById(id)

        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }

        if (String(user._id) === String(req.user.id)) {
            if (role && role !== "admin") {
                return res.status(400).json({ message: "You cannot remove your own admin role" })
            }
            if (status && status !== "active") {
                return res.status(400).json({ message: "You cannot deactivate your own account" })
            }
        }

        if (role) {
            if (!["user", "admin"].includes(role)) {
                return res.status(400).json({ message: "Invalid role" })
            }
            user.role = role
        }

        if (status) {
            if (!["active", "inactive", "deleted"].includes(status)) {
                return res.status(400).json({ message: "Invalid status" })
            }
            user.status = status
        }

        await user.save()

        await logAdminActivity({
            actorId: req.user.id,
            action: "user_updated",
            entityType: "user",
            entityId: user._id,
            description: `Updated user ${user.name}`,
            metadata: { role: user.role, status: user.status, email: user.email },
        })

        const safeUser = await userSchema.findById(user._id).select("-password").lean()
        return res.json({ message: "User updated successfully", data: safeUser })
    } catch (err) {
        return res.status(500).json({ message: "Error while updating user", err })
    }
}

const getUserActivity = async (req, res) => {
    try {
        const { id } = req.params
        const user = await userSchema.findById(id).select("-password").lean()

        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }

        const [
            wishlistCount,
            reviewCount,
            aiSessionCount,
            searchCount,
            viewCount,
            wishlist,
            reviews,
            aiSessions,
            searches,
            views,
        ] = await Promise.all([
            WishlistModel.countDocuments({ userId: id }),
            ReviewModel.countDocuments({ userId: id }),
            AIChatSessionModel.countDocuments({ userId: id }),
            SearchEventModel.countDocuments({ userId: id }),
            CarViewEventModel.countDocuments({ userId: id }),
            WishlistModel.find({ userId: id }).sort({ createdAt: -1 }).limit(10).populate("carId", "name brand type fuel price image").lean(),
            ReviewModel.find({ userId: id }).sort({ createdAt: -1 }).limit(10).populate("carId", "name brand type fuel price").lean(),
            AIChatSessionModel.find({ userId: id }).sort({ updatedAt: -1 }).limit(10).lean(),
            SearchEventModel.find({ userId: id }).sort({ searchedAt: -1 }).limit(10).lean(),
            CarViewEventModel.find({ userId: id }).sort({ viewedAt: -1 }).limit(10).populate("carId", "name brand type fuel price image").lean(),
        ])

        const aiMessageCount = aiSessions.reduce((sum, session) => sum + (session.messages || []).filter((message) => message.role === "user").length, 0)

        return res.json({
            message: "User activity fetched successfully",
            data: {
                user,
                summary: {
                    wishlistCount,
                    reviewCount,
                    aiSessionCount,
                    aiMessageCount,
                    searchCount,
                    viewCount,
                },
                wishlist: wishlist.map((item) => ({
                    savedAt: item.createdAt,
                    car: item.carId,
                })),
                reviews: reviews.map((review) => ({
                    _id: review._id,
                    rating: review.rating,
                    title: review.title,
                    comment: review.comment,
                    createdAt: review.createdAt,
                    car: review.carId,
                })),
                aiSessions: aiSessions.map((session) => ({
                    _id: session._id,
                    title: session.title,
                    updatedAt: session.updatedAt,
                    lastMessageAt: session.lastMessageAt,
                    messageCount: session.messages?.length || 0,
                    preview: session.messages?.slice(-1)?.[0]?.content || "",
                })),
                searches,
                views: views.map((item) => ({
                    _id: item._id,
                    viewedAt: item.viewedAt,
                    car: item.carId,
                })),
            },
        })
    } catch (err) {
        return res.status(500).json({ message: "Error while fetching user activity", err })
    }
}

const exportUsersCsv = async (req, res) => {
    try {
        const query = buildUserQuery(req.query.search || "")
        const users = await userSchema.find(query)
            .select("name email role status createdAt updatedAt")
            .sort({ createdAt: -1, _id: -1 })
            .lean()

        return sendCsv(res, "users-report.csv", [
            { key: "name", label: "Name" },
            { key: "email", label: "Email" },
            { key: "role", label: "Role" },
            { key: "status", label: "Status" },
            { key: "createdAt", label: "Created At" },
            { key: "updatedAt", label: "Updated At" },
        ], users.map((user) => ({
            ...user,
            createdAt: formatDateTime(user.createdAt),
            updatedAt: formatDateTime(user.updatedAt),
        })))
    } catch (err) {
        return res.status(500).json({ message: "Error while exporting users csv", err })
    }
}

module.exports = {
    registerUser,
    loginUser,
    getMyProfile,
    updateMyProfile,
    getAllUsers,
    updateUser,
    getUserActivity,
    exportUsersCsv,
}
