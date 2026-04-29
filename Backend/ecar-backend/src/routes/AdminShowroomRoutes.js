const router = require("express").Router()
const bcrypt = require("bcrypt")
const Showroom = require("../models/ShowroomModel")
const TestDriveBooking = require("../models/TestDriveBookingModel")
const { verifyAdmin } = require("../middleware/AuthMiddleware")
const { logAdminActivity } = require("../utils/AdminActivityLogger")
const { normalizeDateOnly, releaseSlot } = require("../utils/ShowroomScheduleUtil")
const { createBookingStatusNotification } = require("../utils/BookingNotificationUtil")

const splitList = (value) => {
    if (Array.isArray(value)) {
        return value.map((item) => String(item).trim()).filter(Boolean)
    }

    return String(value || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
}

const buildSyntheticEmail = (name) =>
    `${String(name || "showroom")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "showroom"}-${Date.now()}@ecar.local`

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

const buildQuery = ({ search = "", status = "" }) => {
    const query = {}
    const trimmedSearch = String(search || "").trim()
    const normalizedStatus = String(status || "").trim().toLowerCase()

    if (trimmedSearch) {
        const regex = new RegExp(escapeRegex(trimmedSearch), "i")
        query.$or = [
            { name: regex },
            { email: regex },
            { "address.city": regex },
            { "address.pincode": regex },
        ]
    }

    if (normalizedStatus === "pending") query.status = "pending"
    if (normalizedStatus === "approved") query.status = "approved"
    if (normalizedStatus === "active") query.status = "approved"
    if (normalizedStatus === "inactive") query.status = "inactive"

    return query
}

const normalizeBookingType = (value) => {
    if (value === "home") return "home_delivery"
    if (value === "showroom") return "at_showroom"
    return value
}

const buildBookingFilter = ({ status = "", showroom = "", bookingType = "", fromDate = "", toDate = "" }) => {
    const filter = {}

    if (String(status || "").trim()) {
        filter.status = String(status).trim()
    }
    if (String(showroom || "").trim()) {
        filter.showroom = String(showroom).trim()
    }
    if (String(bookingType || "").trim()) {
        filter.bookingType = normalizeBookingType(bookingType)
    }
    if (fromDate || toDate) {
        filter.scheduledDate = {}
        if (fromDate) {
            filter.scheduledDate.$gte = normalizeDateOnly(fromDate)
        }
        if (toDate) {
            const endDate = normalizeDateOnly(toDate)
            endDate.setHours(23, 59, 59, 999)
            filter.scheduledDate.$lte = endDate
        }
    }

    return filter
}

const buildBookingStats = async (filter) => {
    const countWithStatus = (status) => TestDriveBooking.countDocuments({ ...filter, status })

    const [total, pending, confirmed, completed, cancelled] = await Promise.all([
        TestDriveBooking.countDocuments(filter),
        countWithStatus("pending"),
        countWithStatus("confirmed"),
        countWithStatus("completed"),
        countWithStatus("cancelled"),
    ])

    return {
        total,
        pending,
        confirmed,
        completed,
        cancelled,
    }
}

const normalizeShowroom = (showroom) => {
    const item = showroom?.toObject ? showroom.toObject() : { ...showroom }
    if (item.password) delete item.password

    return {
        ...item,
        contactNumber: item.phone || "",
        isApproved: item.status === "approved",
        isActive: item.status === "approved",
    }
}

const buildMeta = async ({ page, limit, search, filter }) => {
    const [total, pendingCount, activeCount, cities] = await Promise.all([
        Showroom.countDocuments(filter),
        Showroom.countDocuments(buildQuery({ search, status: "pending" })),
        Showroom.countDocuments(buildQuery({ search, status: "active" })),
        Showroom.distinct("address.city", filter),
    ])

    return {
        total,
        page,
        limit,
        totalPages: Math.max(Math.ceil(total / limit), 1),
        pendingCount,
        activeCount,
        cityCount: cities.filter(Boolean).length,
    }
}

router.use(verifyAdmin)

router.get("/bookings/stats", async (req, res) => {
    try {
        const filter = buildBookingFilter(req.query || {})
        const data = await buildBookingStats(filter)

        return res.json({ message: "Booking stats fetched", data })
    } catch (err) {
        return res.status(500).json({ message: "Error while fetching booking stats", err })
    }
})

router.get("/bookings", async (req, res) => {
    try {
        const page = Math.max(Number(req.query.page || 1), 1)
        const limit = Math.min(Math.max(Number(req.query.limit || 10), 1), 100)
        const filter = buildBookingFilter(req.query || {})

        const [total, bookings] = await Promise.all([
            TestDriveBooking.countDocuments(filter),
            TestDriveBooking.find(filter)
                .populate("showroom", "name phone email address")
                .populate("car", "name brand price image")
                .populate("user", "name email")
                .sort({ createdAt: -1, _id: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
        ])

        return res.json({
            message: "Admin bookings fetched",
            data: bookings,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.max(Math.ceil(total / limit), 1),
            },
        })
    } catch (err) {
        return res.status(500).json({ message: "Error while fetching admin bookings", err })
    }
})

router.patch("/bookings/:id", async (req, res) => {
    try {
        const nextStatus = String(req.body?.status || "").trim().toLowerCase()
        const note = String(req.body?.note || `Booking marked ${nextStatus}`).trim()
        const allowedStatuses = ["pending", "confirmed", "completed", "cancelled", "rejected"]

        if (!allowedStatuses.includes(nextStatus)) {
            return res.status(400).json({ message: "Invalid booking status" })
        }

        const booking = await TestDriveBooking.findById(req.params.id)
        if (!booking) {
            return res.status(404).json({ message: "Booking not found" })
        }

        if (booking.status === nextStatus) {
            return res.json({ message: "Booking status already up to date", data: booking })
        }
        if (booking.status === "completed") {
            return res.status(400).json({ message: "Completed bookings cannot be updated" })
        }
        if (booking.status === "cancelled" || booking.status === "rejected") {
            return res.status(400).json({ message: "Cancelled or rejected bookings cannot be updated" })
        }
        if (nextStatus === "completed" && booking.status !== "confirmed") {
            return res.status(400).json({ message: "Only confirmed bookings can be marked complete" })
        }

        booking.status = nextStatus
        booking.statusHistory.push({
            status: nextStatus,
            updatedBy: req.user?.name || "Admin",
            updatedByRole: "admin",
            note,
        })

        if (["confirmed", "cancelled", "rejected"].includes(nextStatus)) {
            booking.showroomResponse = {
                message: note,
                respondedAt: new Date(),
            }
        }

        await booking.save()

        if (nextStatus === "cancelled" || nextStatus === "rejected") {
            await releaseSlot({ showroomId: booking.showroom, date: booking.scheduledDate, time: booking.scheduledTime })
        }

        await createBookingStatusNotification({
            booking,
            actorId: req.user?.id,
            actorName: req.user?.name || "Admin",
            title: `Test drive ${nextStatus}`,
            message: `Your booking ${booking.bookingId} is now ${nextStatus}.`,
            type: `booking_${nextStatus}`,
        })

        return res.json({ message: "Booking updated", data: booking })
    } catch (err) {
        return res.status(500).json({ message: "Error while updating booking", err })
    }
})

router.get("/showrooms", async (req, res) => {
    try {
        const page = Math.max(Number(req.query.page || 1), 1)
        const limit = Math.min(Math.max(Number(req.query.limit || 12), 1), 100)
        const search = req.query.search || ""
        const filter = buildQuery({
            search,
            status: req.query.status || "",
        })

        const [showrooms, meta] = await Promise.all([
            Showroom.find(filter)
                .sort({ status: 1, createdAt: -1, _id: -1 })
                .skip((page - 1) * limit)
                .limit(limit),
            buildMeta({ page, limit, search, filter }),
        ])

        return res.json({
            message: "Showrooms fetched successfully",
            data: showrooms.map(normalizeShowroom),
            meta,
        })
    } catch (err) {
        return res.status(500).json({ message: "Error while fetching showrooms", err })
    }
})

const createOrApproveShowroom = async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            phone,
            contactNumber,
            address,
            street,
            city,
            state,
            pincode,
            brands,
            description,
            serviceRadius,
            servicePincodes,
            availableDays,
            openingHours,
            openingOpen,
            openingClose,
        } = req.body || {}

        if (!String(name || "").trim()) {
            return res.status(400).json({ message: "Showroom name is required" })
        }

        const normalizedEmail = String(email || "").trim().toLowerCase() || buildSyntheticEmail(name)
        const existing = await Showroom.findOne({ email: normalizedEmail })
        const resolvedPhone = String(contactNumber || phone || "").trim()
        const addressString = String(address || "").trim()

        if (!resolvedPhone || !String(city || "").trim() || !String(pincode || "").trim()) {
            return res.status(400).json({ message: "City, pincode, and contact number are required" })
        }

        const payload = {
            name: String(name).trim(),
            email: normalizedEmail,
            phone: resolvedPhone,
            description: String(description || "").trim(),
            address: {
                street: String(street || addressString).trim(),
                city: String(city || "").trim(),
                state: String(state || "").trim(),
                pincode: String(pincode || "").trim(),
            },
            brands: splitList(brands),
            serviceRadius: Number(serviceRadius || 0),
            servicePincodes: splitList(servicePincodes || pincode),
            availableDays: splitList(availableDays),
            openingHours: {
                open: String(openingHours?.open || openingOpen || "").trim(),
                close: String(openingHours?.close || openingClose || "").trim(),
            },
            status: "approved",
        }

        let showroom
        let reusedPendingRequest = false

        if (existing) {
            if (existing.status === "approved") {
                return res.status(409).json({ message: "A showroom with this email already exists" })
            }

            reusedPendingRequest = existing.status === "pending"
            Object.assign(existing, payload)
            if (password) {
                existing.password = await bcrypt.hash(String(password), 10)
            }
            showroom = await existing.save()
        } else {
            const hashedPassword = await bcrypt.hash(String(password || Math.random().toString(36).slice(2, 12)), 10)
            showroom = await Showroom.create({
                ...payload,
                password: hashedPassword,
            })
        }

        await logAdminActivity({
            actorId: req.user.id,
            action: reusedPendingRequest ? "showroom_approved" : "showroom_created",
            entityType: "showroom",
            entityId: showroom._id,
            description: reusedPendingRequest
                ? `Approved showroom ${showroom.name} from admin intake`
                : `Created showroom ${showroom.name}`,
            metadata: {
                email: showroom.email,
                status: showroom.status,
            },
        })

        return res.status(reusedPendingRequest ? 200 : 201).json({
            message: reusedPendingRequest ? "Pending showroom approved successfully" : "Showroom added successfully",
            data: normalizeShowroom(showroom),
            meta: { reusedPendingRequest },
        })
    } catch (err) {
        return res.status(500).json({ message: "Error while adding showroom", err })
    }
}

router.post("/showrooms", createOrApproveShowroom)
router.post("/add-showroom", createOrApproveShowroom)

router.put("/showrooms/:id/approve", async (req, res) => {
    try {
        const showroom = await Showroom.findById(req.params.id)
        if (!showroom) {
            return res.status(404).json({ message: "Showroom not found" })
        }

        showroom.status = "approved"
        await showroom.save()

        await logAdminActivity({
            actorId: req.user.id,
            action: "showroom_approved",
            entityType: "showroom",
            entityId: showroom._id,
            description: `Approved showroom ${showroom.name}`,
            metadata: { email: showroom.email },
        })

        return res.json({ message: "Showroom approved successfully", data: normalizeShowroom(showroom) })
    } catch (err) {
        return res.status(500).json({ message: "Error while approving showroom", err })
    }
})

router.put("/showrooms/:id/deactivate", async (req, res) => {
    try {
        const showroom = await Showroom.findById(req.params.id)
        if (!showroom) {
            return res.status(404).json({ message: "Showroom not found" })
        }

        showroom.status = "inactive"
        await showroom.save()

        await logAdminActivity({
            actorId: req.user.id,
            action: "showroom_deactivated",
            entityType: "showroom",
            entityId: showroom._id,
            description: `Deactivated showroom ${showroom.name}`,
            metadata: { email: showroom.email },
        })

        return res.json({ message: "Showroom deactivated successfully", data: normalizeShowroom(showroom) })
    } catch (err) {
        return res.status(500).json({ message: "Error while deactivating showroom", err })
    }
})

router.delete("/showrooms/:id", async (req, res) => {
    try {
        const showroom = await Showroom.findByIdAndDelete(req.params.id)
        if (!showroom) {
            return res.status(404).json({ message: "Showroom not found" })
        }

        await logAdminActivity({
            actorId: req.user.id,
            action: "showroom_deleted",
            entityType: "showroom",
            entityId: showroom._id,
            description: `Deleted showroom ${showroom.name}`,
            metadata: { email: showroom.email },
        })

        return res.json({ message: "Showroom deleted successfully", data: { id: showroom._id } })
    } catch (err) {
        return res.status(500).json({ message: "Error while deleting showroom", err })
    }
})

module.exports = router
