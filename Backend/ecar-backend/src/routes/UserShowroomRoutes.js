const router = require("express").Router()
const upload = require("../middleware/UploadMiddleware")
const uploadToCloudinary = require("../utils/Cloudinary")
const { verifyToken } = require("../middleware/AuthMiddleware")
const Showroom = require("../models/ShowroomModel")
const Car = require("../models/CarModel")
const User = require("../models/UserModel")
const TestDriveBooking = require("../models/TestDriveBookingModel")
const { serializeCar } = require("../utils/CarRatingUtil")
const {
    normalizeDateOnly,
    ensureAvailabilityForDate,
    reserveSlot,
    releaseSlot,
} = require("../utils/ShowroomScheduleUtil")
const {
    createBookingStatusNotification,
    createAdminBookingNotification,
} = require("../utils/BookingNotificationUtil")
const { getActiveSubscription, isUnlimited } = require("../utils/SubscriptionUtil")

const logServerError = (context, error) => {
    console.error(`[UserShowroomRoutes] ${context}`, error)
}

const canUploadToCloudinary = () => (
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
)

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

const buildBookingId = () =>
    `TDB-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`

const normalizeBookingType = (value) => {
    if (value === "home") return "home_delivery"
    if (value === "showroom") return "at_showroom"
    return value
}

const isValidPincode = (value = "") => /^\d{6}$/.test(String(value).trim())
const isValidPhoneNumber = (value = "") => /^\d{10}$/.test(String(value).replace(/\D/g, ""))

const showroomIsActive = (showroom) => showroom?.status === "approved"

const matchesShowroomBrand = (showroom, brand) => {
    if (!brand) return true
    const normalizedBrand = String(brand).trim().toLowerCase()
    if (!normalizedBrand) return true

    const explicitBrands = Array.isArray(showroom?.brands) ? showroom.brands : []
    if (explicitBrands.some((item) => String(item).trim().toLowerCase() === normalizedBrand)) {
        return true
    }

    return (showroom?.cars || []).some((item) => String(item?.carId?.brand || "").trim().toLowerCase() === normalizedBrand)
}

const serializeShowroom = (showroom) => {
    const item = showroom?.toObject ? showroom.toObject() : { ...showroom }
    if (item.password) delete item.password

    return {
        ...item,
        isApproved: item.status === "approved",
        isActive: item.status === "approved",
        cars: (item.cars || []).map((entry) => ({
            ...entry,
            carId: entry?.carId && typeof entry.carId === "object" ? serializeCar(entry.carId) : entry.carId,
        })),
    }
}

const applyShowroomRanking = (items, { brand, pincode, city, carId }) => items
    .map((showroom) => {
        let score = 0
        if (carId && showroom.availableCars?.some((item) => String(item) === String(carId))) score += 5
        if (brand && matchesShowroomBrand(showroom, brand)) score += 3
        if (pincode && showroom.servicePincodes?.includes(String(pincode).trim())) score += 2
        if (city && String(showroom.address?.city || "").toLowerCase() === String(city).trim().toLowerCase()) score += 1

        return { ...showroom, matchScore: score }
    })
    .filter((showroom) => (!brand || showroom.matchScore > 0 || matchesShowroomBrand(showroom, brand)))
    .sort((a, b) => b.matchScore - a.matchScore || new Date(b.createdAt) - new Date(a.createdAt))

const buildShowroomSnapshot = (showroom) => ({
    name: String(showroom?.name || "").trim(),
    phone: String(showroom?.phone || "").trim(),
    email: String(showroom?.email || "").trim(),
    address: {
        street: String(showroom?.address?.street || "").trim(),
        city: String(showroom?.address?.city || "").trim(),
        state: String(showroom?.address?.state || "").trim(),
        pincode: String(showroom?.address?.pincode || "").trim(),
    },
})

const listShowrooms = async (req, res, nearbyOnly = false) => {
    try {
        const page = Math.max(Number(req.query.page || 1), 1)
        const limit = Math.min(Math.max(Number(req.query.limit || 9), 1), 100)
        const brand = String(req.query.brand || "").trim()
        const city = String(req.query.city || "").trim()
        const pincode = String(req.query.pincode || "").trim()
        const area = String(req.query.area || "").trim()
        const carId = String(req.query.carId || "").trim()
        const filter = { status: "approved" }
        const resolvedCity = city || (/^\d{4,6}$/.test(area) ? "" : area)
        const resolvedPincode = pincode || (/^\d{4,6}$/.test(area) ? area : "")

        if (resolvedCity) {
            filter.$or = [
                { "address.city": new RegExp(escapeRegex(resolvedCity), "i") },
                { name: new RegExp(escapeRegex(resolvedCity), "i") }
            ]
        }
        if (nearbyOnly && resolvedPincode) {
            filter.servicePincodes = resolvedPincode
        }

        let showrooms = await Showroom.find(filter)
            .populate("cars.carId")
            .sort({ createdAt: -1, _id: -1 })
            .lean()

        // Fallback: If city/pincode filter results in 0, show all approved showrooms for that brand
        if (showrooms.length === 0 && (resolvedCity || resolvedPincode) && brand) {
            const fallbackFilter = { status: "approved" }
            showrooms = await Showroom.find(fallbackFilter)
                .populate("cars.carId")
                .sort({ createdAt: -1, _id: -1 })
                .lean()
        }

        const ranked = applyShowroomRanking(showrooms.map(serializeShowroom), {
            brand,
            pincode: resolvedPincode,
            city: resolvedCity,
            carId,
        })
        const paged = ranked.slice((page - 1) * limit, page * limit)

        return res.json({
            message: "Showrooms fetched successfully",
            data: paged,
            meta: {
                total: ranked.length,
                page,
                limit,
                totalPages: Math.max(Math.ceil(ranked.length / limit), 1),
            },
        })
    } catch (err) {
        logServerError("listShowrooms failed", err)
        return res.status(500).json({ message: "Error while fetching showrooms" })
    }
}

router.get("/showrooms", async (req, res) => listShowrooms(req, res, false))
router.get("/showrooms/nearby", async (req, res) => listShowrooms(req, res, true))

router.get("/showrooms/:id", async (req, res) => {
    try {
        const showroom = await Showroom.findOne({ _id: req.params.id, status: "approved" }).populate("cars.carId")
        if (!showroom) {
            return res.status(404).json({ message: "Showroom not found" })
        }

        return res.json({ message: "Showroom fetched", data: serializeShowroom(showroom) })
    } catch (err) {
        logServerError("get showroom by id failed", err)
        return res.status(500).json({ message: "Error while fetching showroom" })
    }
})

router.get("/showrooms/:id/availability", async (req, res) => {
    try {
        const showroom = await Showroom.findOne({ _id: req.params.id, status: "approved" })
        if (!showroom) {
            return res.status(404).json({ message: "Showroom not found" })
        }

        const availability = await ensureAvailabilityForDate({
            showroomId: showroom._id,
            date: req.query.date,
            showroom,
        })

        return res.json({
            message: "Showroom availability fetched",
            data: availability?.slots?.filter((slot) => !slot.isBooked) || [],
            meta: {
                showroomId: String(showroom._id),
                date: normalizeDateOnly(req.query.date || new Date()),
            },
        })
    } catch (err) {
        logServerError("get showroom availability failed", err)
        return res.status(500).json({ message: "Error while fetching showroom availability" })
    }
})

router.post("/bookings/temp/upload-license", verifyToken, upload.single("licenseImage"), async (req, res) => {
    try {
        if (!req.file?.path) {
            return res.status(400).json({ message: "License image is required" })
        }
        if (!canUploadToCloudinary()) {
            return res.status(400).json({ message: "License upload is not configured on the server" })
        }

        const image = await uploadToCloudinary(req.file.path)
        return res.status(201).json({ message: "License image uploaded", data: { image } })
    } catch (err) {
        logServerError("upload license image failed", err)
        return res.status(500).json({ message: "Error while uploading license image" })
    }
})

const createBooking = async (req, res) => {
    try {
        if (req.user?.role !== "user") {
            return res.status(403).json({ message: "Only user accounts can create bookings" })
        }

        const {
            showroom: legacyShowroomId,
            showroomId,
            car: legacyCarId,
            carId,
            bookingType,
            type,
            scheduledDate,
            scheduledTime,
            preferredDate,
            preferredTime,
            userDetails,
            details,
        } = req.body || {}

        const resolvedShowroomId = showroomId || legacyShowroomId
        const resolvedCarId = carId || legacyCarId
        const resolvedBookingType = normalizeBookingType(type || bookingType)
        const resolvedDate = preferredDate || scheduledDate
        const resolvedTime = preferredTime || scheduledTime || details?.slot
        const resolvedUserDetails = userDetails || {
            fullName: details?.fullName || "",
            phone: details?.phone || "",
            address: details?.address || "",
            pincode: details?.pincode || "",
            drivingLicense: {
                number: details?.licenseNumber || details?.drivingLicense?.number || "",
                expiryDate: details?.licenseExpiry || details?.drivingLicense?.expiryDate || "",
                image: details?.licenseImage || details?.drivingLicense?.image || "",
            },
        }

        if (!["at_showroom", "home_delivery"].includes(resolvedBookingType)) {
            return res.status(400).json({ message: "Invalid booking type" })
        }

        const user = await User.findById(req.user.id)
        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }

        const subscription = getActiveSubscription(user)
        const bookingLimit = subscription.limits.activeBookingsLimit
        if (!isUnlimited(bookingLimit)) {
            const activeBookingsCount = await TestDriveBooking.countDocuments({
                user: user._id,
                status: { $in: ["pending", "confirmed"] },
            })

            if (activeBookingsCount >= bookingLimit) {
                return res.status(403).json({
                    message: `Your ${subscription.planLabel} plan allows up to ${bookingLimit} active test drive booking${bookingLimit === 1 ? "" : "s"}.`,
                    limitReached: true,
                    activeBookingsLimit: bookingLimit,
                })
            }
        }

        const car = await Car.findById(resolvedCarId)
        if (!car) {
            return res.status(404).json({ message: "Car not found" })
        }

        let showroom = null
        if (resolvedShowroomId) {
            showroom = await Showroom.findById(resolvedShowroomId).populate("cars.carId")
        } else if (resolvedBookingType === "home_delivery") {
            const matchingShowrooms = await Showroom.find({
                status: "approved",
                servicePincodes: String(resolvedUserDetails?.pincode || "").trim(),
            }).populate("cars.carId")

            showroom = matchingShowrooms.find((item) =>
                (item.cars || []).some((entry) => String(entry.carId?._id || entry.carId) === String(car._id))
            ) || null
        }

        if (!showroom) {
            return res.status(404).json({ message: "No approved showroom is available for this selection" })
        }
        if (!showroomIsActive(showroom)) {
            return res.status(400).json({ message: "Selected showroom is unavailable" })
        }
        const hasCarInInventory = (showroom.cars || []).some((item) => String(item.carId?._id || item.carId) === String(car._id))
        const supportsBrand = matchesShowroomBrand(showroom, car.brand)

        if (!hasCarInInventory && !supportsBrand) {
            return res.status(400).json({ message: "Selected car brand is not supported by this showroom" })
        }
        if (!resolvedDate || !resolvedTime) {
            return res.status(400).json({ message: "Preferred date and time are required" })
        }
        if (!resolvedUserDetails?.fullName || !resolvedUserDetails?.phone) {
            return res.status(400).json({ message: "Full name and phone are required" })
        }
        if (!isValidPhoneNumber(resolvedUserDetails.phone)) {
            return res.status(400).json({ message: "Enter a valid 10-digit phone number" })
        }
        if (!resolvedUserDetails?.drivingLicense?.number || !resolvedUserDetails?.drivingLicense?.expiryDate) {
            return res.status(400).json({ message: "Driving license details are required" })
        }
        if (Number.isNaN(new Date(resolvedUserDetails.drivingLicense.expiryDate).getTime()) || new Date(resolvedUserDetails.drivingLicense.expiryDate) <= new Date()) {
            return res.status(400).json({ message: "Enter a valid future driving license expiry date" })
        }
        if (resolvedBookingType === "home_delivery" && !resolvedUserDetails?.address?.trim()) {
            return res.status(400).json({ message: "Full address is required for a home test drive" })
        }
        if (resolvedBookingType === "home_delivery" && !isValidPincode(resolvedUserDetails?.pincode)) {
            return res.status(400).json({ message: "Enter a valid 6-digit pincode for a home test drive" })
        }
        if (resolvedBookingType === "home_delivery" && !showroom.servicePincodes.includes(String(resolvedUserDetails?.pincode || "").trim())) {
            return res.status(400).json({ message: "Home test drive is not available for this pincode" })
        }

        await ensureAvailabilityForDate({
            showroomId: showroom._id,
            date: resolvedDate,
            showroom,
        })

        const booking = await TestDriveBooking.create({
            bookingId: buildBookingId(),
            user: user._id,
            showroom: showroom._id,
            car: car._id,
            carSnapshot: {
                name: car.name,
                brand: car.brand,
                image: car.image || "",
                fuel: car.fuel || "",
            },
            bookingType: resolvedBookingType,
            scheduledDate: normalizeDateOnly(resolvedDate),
            scheduledTime: resolvedTime,
            userDetails: {
                fullName: String(resolvedUserDetails.fullName || "").trim(),
                phone: String(resolvedUserDetails.phone || "").trim(),
                address: String(resolvedUserDetails.address || "").trim(),
                pincode: String(resolvedUserDetails.pincode || "").trim(),
                drivingLicense: {
                    number: String(resolvedUserDetails.drivingLicense.number || "").trim(),
                    expiryDate: new Date(resolvedUserDetails.drivingLicense.expiryDate),
                    image: String(resolvedUserDetails.drivingLicense.image || "").trim(),
                },
            },
            showroomSnapshot: buildShowroomSnapshot(showroom),
            status: "pending",
            statusHistory: [{
                status: "pending",
                updatedBy: user.name,
                updatedByRole: "user",
                note: "Booking submitted",
            }],
        })

        await reserveSlot({
            showroomId: showroom._id,
            date: booking.scheduledDate,
            time: booking.scheduledTime,
            bookingMongoId: booking._id,
        })

        await Promise.all([
            createBookingStatusNotification({
                booking,
                actorId: user._id,
                actorName: user.name || "E-CAR User",
                title: "Test drive request received",
                message: `Your ${booking.bookingType === "home_delivery" ? "home drive" : "showroom visit"} for ${booking.carSnapshot?.brand} ${booking.carSnapshot?.name} is pending confirmation on ${new Date(booking.scheduledDate).toLocaleDateString("en-IN")} at ${booking.scheduledTime}.`,
                type: "booking_created",
            }),
            createAdminBookingNotification({
                booking,
                actorId: user._id,
                actorName: user.name || "E-CAR User",
                title: "New test drive request",
                message: `${user.name || "A user"} requested a ${booking.bookingType === "home_delivery" ? "home drive" : "showroom visit"} for ${booking.carSnapshot?.brand} ${booking.carSnapshot?.name} on ${new Date(booking.scheduledDate).toLocaleDateString("en-IN")} at ${booking.scheduledTime}.`,
                type: "booking_created_admin",
            }),
        ])

        return res.status(201).json({ message: "Booking request submitted", data: booking })
    } catch (err) {
        logServerError("createBooking failed", err)
        if (err.code === 11000) {
            return res.status(409).json({ message: "This time slot is already reserved for the selected car. Please try another slot or date." })
        }
        return res.status(500).json({ message: "Error while creating booking" })
    }
}

router.post("/bookings", verifyToken, createBooking)
router.post("/test-drives", verifyToken, createBooking)

router.get("/bookings/taken-slots", verifyToken, async (req, res) => {
    try {
        const { carId, date } = req.query
        if (!carId || !date) {
            return res.status(400).json({ message: "carId and date are required" })
        }

        const scheduledDate = normalizeDateOnly(date)
        const bookings = await TestDriveBooking.find({
            car: carId,
            scheduledDate,
            status: { $ne: "cancelled" }
        }, "scheduledTime")

        const takenSlots = bookings.map(b => b.scheduledTime)
        return res.json({ message: "Taken slots fetched", data: takenSlots })
    } catch (err) {
        logServerError("get taken slots failed", err)
        return res.status(500).json({ message: "Error while fetching taken slots" })
    }
})

router.get("/bookings", verifyToken, async (req, res) => {
    try {
        const page = Math.max(Number(req.query.page || 1), 1)
        const limit = Math.min(Math.max(Number(req.query.limit || 10), 1), 100)
        const filter = { user: req.user.id }
        if (req.query.status) {
            const statuses = String(req.query.status)
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean)

            filter.status = statuses.length > 1 ? { $in: statuses } : statuses[0]
        }

        const [total, bookings] = await Promise.all([
            TestDriveBooking.countDocuments(filter),
            TestDriveBooking.find(filter)
                .populate("showroom", "name phone logo address openingHours availableDays")
                .populate("car", "name brand price image")
                .sort({ createdAt: -1, _id: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
        ])

        return res.json({
            message: "Bookings fetched successfully",
            data: bookings,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.max(Math.ceil(total / limit), 1),
            },
        })
    } catch (err) {
        logServerError("get user bookings failed", err)
        return res.status(500).json({ message: "Error while fetching bookings" })
    }
})

router.get("/bookings/:bookingId", verifyToken, async (req, res) => {
    try {
        const booking = await TestDriveBooking.findOne({
            _id: req.params.bookingId,
            user: req.user.id,
        })
            .populate("showroom", "name phone email logo address openingHours availableDays")
            .populate("car", "name brand price image")
            .lean()

        if (!booking) {
            return res.status(404).json({ message: "Booking not found" })
        }

        return res.json({ message: "Booking fetched successfully", data: booking })
    } catch (err) {
        logServerError("get booking by id failed", err)
        return res.status(500).json({ message: "Error while fetching booking" })
    }
})

router.post("/bookings/:bookingId/cancel", verifyToken, async (req, res) => {
    try {
        const booking = await TestDriveBooking.findOne({
            _id: req.params.bookingId,
            user: req.user.id,
        })

        if (!booking) {
            return res.status(404).json({ message: "Booking not found" })
        }
        if (booking.status !== "pending") {
            return res.status(400).json({ message: "Only pending bookings can be cancelled" })
        }

        booking.status = "cancelled"
        booking.statusHistory.push({
            status: "cancelled",
            updatedBy: "User",
            updatedByRole: "user",
            note: String(req.body?.reason || "Cancelled by user").trim(),
        })
        await booking.save()
        await releaseSlot({ showroomId: booking.showroom, date: booking.scheduledDate, time: booking.scheduledTime })
        await Promise.all([
            createBookingStatusNotification({
                booking,
                actorId: req.user.id,
                actorName: req.user?.name || "User",
                title: "Test drive cancelled",
                message: `Your booking ${booking.bookingId} has been cancelled and the reserved slot is now open again.`,
                type: "booking_cancelled",
            }),
            createAdminBookingNotification({
                booking,
                actorId: req.user.id,
                actorName: req.user?.name || "User",
                title: "Test drive cancelled",
                message: `Booking ${booking.bookingId} was cancelled by the user.`,
                type: "booking_cancelled_admin",
            }),
        ])

        return res.json({ message: "Booking cancelled", data: booking })
    } catch (err) {
        logServerError("cancel booking failed", err)
        return res.status(500).json({ message: "Error while cancelling booking" })
    }
})

router.delete("/bookings/:bookingId", verifyToken, async (req, res) => {
    try {
        const booking = await TestDriveBooking.findOne({
            _id: req.params.bookingId,
            user: req.user.id,
        })

        if (!booking) {
            return res.status(404).json({ message: "Booking not found" })
        }
        if (booking.status !== "pending") {
            return res.status(400).json({ message: "Only pending bookings can be deleted" })
        }
        
        booking.status = "cancelled"
        booking.statusHistory.push({
            status: "cancelled",
            updatedBy: "User",
            updatedByRole: "user",
            note: "Cancelled via DELETE request",
        })
        await booking.save()
        await releaseSlot({ showroomId: booking.showroom, date: booking.scheduledDate, time: booking.scheduledTime })
        
        return res.json({ message: "Booking deleted/cancelled successfully" })
    } catch (err) {
        logServerError("delete booking failed", err)
        return res.status(500).json({ message: "Error while deleting booking" })
    }
})

router.post("/bookings/:bookingId/rate", verifyToken, async (req, res) => {
    try {
        const booking = await TestDriveBooking.findOne({
            _id: req.params.bookingId,
            user: req.user.id,
        })

        if (!booking) {
            return res.status(404).json({ message: "Booking not found" })
        }
        if (booking.status !== "completed") {
            return res.status(400).json({ message: "Only completed bookings can be rated" })
        }

        const stars = Number(req.body?.stars || 0)
        const review = String(req.body?.review || "").trim()
        if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
            return res.status(400).json({ message: "Rating must be between 1 and 5 stars" })
        }
        booking.userRating = {
            stars,
            review,
            ratedAt: new Date(),
        }
        await booking.save()

        const showroom = await Showroom.findById(booking.showroom)
        if (showroom) {
            const currentTotal = Number(showroom.rating?.average || 0) * Number(showroom.rating?.count || 0)
            const nextCount = Number(showroom.rating?.count || 0) + 1
            showroom.rating.count = nextCount
            showroom.rating.average = (currentTotal + stars) / nextCount
            await showroom.save()
        }

        return res.json({ message: "Booking rated successfully", data: booking })
    } catch (err) {
        logServerError("rate booking failed", err)
        return res.status(500).json({ message: "Error while rating booking" })
    }
})

module.exports = router
