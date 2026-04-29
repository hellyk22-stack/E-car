const router = require("express").Router()
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const upload = require("../middleware/UploadMiddleware")
const uploadToCloudinary = require("../utils/Cloudinary")
const Showroom = require("../models/ShowroomModel")
const User = require("../models/UserModel")
const Car = require("../models/CarModel")
const TestDriveBooking = require("../models/TestDriveBookingModel")
const ShowroomAvailability = require("../models/ShowroomAvailabilityModel")
const { verifyToken } = require("../middleware/AuthMiddleware")
const { logAdminActivity } = require("../utils/AdminActivityLogger")
const {
    createBookingStatusNotification,
    createAdminBookingNotification,
} = require("../utils/BookingNotificationUtil")
const {
    DEFAULT_SHOWROOM_DAYS,
    DEFAULT_OPEN_TIME,
    DEFAULT_CLOSE_TIME,
    normalizeDateOnly,
    ensureAvailabilityForDate,
    seedUpcomingAvailability,
    releaseSlot,
} = require("../utils/ShowroomScheduleUtil")
const { serializeCar } = require("../utils/CarRatingUtil")

const JWT_SECRET = process.env.JWT_SECRET || "ecar_secret"

const logServerError = (context, error) => {
    console.error(`[ShowroomRoutes] ${context}`, error)
}

const splitList = (value) => {
    if (Array.isArray(value)) {
        return value.map((item) => String(item).trim()).filter(Boolean)
    }

    return String(value || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
}

const canUploadToCloudinary = () => (
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
)

const ensureShowroom = (req, res, next) => {
    if (req.user?.role !== "showroom") {
        return res.status(403).json({ message: "Showroom access only" })
    }
    return next()
}

const getShowroomId = (req) => req.user?.showroomId || req.user?.id
const normalizeBookingType = (value) => {
    if (value === "home") return "home_delivery"
    if (value === "showroom") return "at_showroom"
    return value
}

const showroomOwnsBrand = (showroom, brand) => {
    const normalizedBrand = String(brand || "").trim().toLowerCase()
    if (!normalizedBrand) return false

    return (showroom?.brands || []).some((item) => String(item).trim().toLowerCase() === normalizedBrand)
}

const serializeShowroomCarItem = (item) => {
    const plainItem = item?.toObject ? item.toObject() : { ...item }
    const plainCar = plainItem?.carId && typeof plainItem.carId === "object"
        ? serializeCar(plainItem.carId)
        : plainItem.carId

    return {
        ...plainItem,
        carId: plainCar,
    }
}

router.post("/register", upload.single("logo"), async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            phone,
            street,
            city,
            state,
            pincode,
            description,
            brands,
            serviceRadius,
            servicePincodes,
            availableDays,
            openingOpen,
            openingClose,
            lat,
            lng,
        } = req.body || {}

        if (!name || !email || !password) {
            return res.status(400).json({ message: "Name, email, and password are required" })
        }

        const normalizedEmail = String(email).trim().toLowerCase()
        const [existingUser, existingShowroom] = await Promise.all([
            User.findOne({ email: normalizedEmail }).select("_id").lean(),
            Showroom.findOne({ email: normalizedEmail }).select("_id").lean(),
        ])

        if (existingUser || existingShowroom) {
            return res.status(409).json({ message: "An account with this email already exists" })
        }

        let logoUrl = ""
        if (req.file?.path && canUploadToCloudinary()) {
            try {
                logoUrl = await uploadToCloudinary(req.file.path)
            } catch (uploadError) {
                console.error("Showroom logo upload failed:", uploadError.message)
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10)
        const showroom = await Showroom.create({
            name: String(name).trim(),
            email: normalizedEmail,
            password: hashedPassword,
            phone: String(phone || "").trim(),
            brands: splitList(brands),
            logo: logoUrl,
            description: String(description || "").trim(),
            address: {
                street: String(street || "").trim(),
                city: String(city || "").trim(),
                state: String(state || "").trim(),
                pincode: String(pincode || "").trim(),
            },
            location: {
                lat: Number(lat || 0),
                lng: Number(lng || 0),
            },
            serviceRadius: Number(serviceRadius || 0),
            servicePincodes: splitList(servicePincodes),
            availableDays: splitList(availableDays).length ? splitList(availableDays) : DEFAULT_SHOWROOM_DAYS,
            openingHours: {
                open: String(openingOpen || DEFAULT_OPEN_TIME).trim(),
                close: String(openingClose || DEFAULT_CLOSE_TIME).trim(),
            },
        })

        await seedUpcomingAvailability({ showroomId: showroom._id, showroom, days: 14 })

        return res.status(201).json({
            message: "Showroom registration submitted successfully",
            data: {
                _id: showroom._id,
                name: showroom.name,
                email: showroom.email,
                status: showroom.status,
                submittedAt: showroom.createdAt,
            },
        })
    } catch (error) {
        logServerError("register showroom failed", error)
        return res.status(500).json({ message: "Error while registering showroom" })
    }
})

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body || {}
        const showroom = await Showroom.findOne({ email: String(email || "").trim().toLowerCase() })

        if (!showroom) {
            return res.status(404).json({ message: "Showroom not found" })
        }

        const isMatch = await bcrypt.compare(String(password || ""), showroom.password)
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" })
        }

        if (showroom.status === "inactive") {
            return res.status(403).json({ message: "Showroom account is deactivated" })
        }

        if (showroom.status !== "approved") {
            return res.status(403).json({
                message: "Your showroom account is pending admin approval",
                data: {
                    pendingApproval: true,
                    showroom: {
                        id: showroom._id,
                        name: showroom.name,
                        city: showroom.address?.city || "",
                        pincode: showroom.address?.pincode || "",
                        submittedAt: showroom.createdAt,
                        status: showroom.status,
                    },
                },
            })
        }

        const token = jwt.sign(
            { id: showroom._id, showroomId: showroom._id, role: "showroom", name: showroom.name },
            JWT_SECRET,
            { expiresIn: "30d" }
        )

        return res.json({
            message: "Showroom login successful",
            data: {
                token,
                role: "showroom",
                name: showroom.name,
                showroomId: showroom._id,
            },
        })
    } catch (error) {
        logServerError("showroom login failed", error)
        return res.status(500).json({ message: "Error while logging in showroom" })
    }
})

router.use(verifyToken, ensureShowroom)

router.get("/profile", async (req, res) => {
    try {
        const showroom = await Showroom.findById(getShowroomId(req)).select("-password").lean()
        if (!showroom) {
            return res.status(404).json({ message: "Showroom not found" })
        }

        return res.json({ message: "Showroom profile fetched", data: showroom })
    } catch (err) {
        logServerError("get showroom profile failed", err)
        return res.status(500).json({ message: "Error while fetching showroom profile" })
    }
})

router.put("/profile", upload.single("logo"), async (req, res) => {
    try {
        const showroom = await Showroom.findById(getShowroomId(req))
        if (!showroom) {
            return res.status(404).json({ message: "Showroom not found" })
        }

        if (req.file?.path && canUploadToCloudinary()) {
            try {
                showroom.logo = await uploadToCloudinary(req.file.path)
            } catch (uploadError) {
                console.error("Showroom profile logo upload failed:", uploadError.message)
            }
        }

        const { name, email, phone, description, serviceRadius, servicePincodes, availableDays, openingHours, street, city, state, pincode, lat, lng, staff, brands, open, close } = req.body || {}

        if (name !== undefined) showroom.name = String(name).trim()
        if (email !== undefined) showroom.email = String(email).trim().toLowerCase()
        if (phone !== undefined) showroom.phone = String(phone).trim()
        if (description !== undefined) showroom.description = String(description).trim()
        if (serviceRadius !== undefined) showroom.serviceRadius = Number(serviceRadius || 0)
        if (servicePincodes !== undefined) showroom.servicePincodes = splitList(servicePincodes)
        if (availableDays !== undefined) showroom.availableDays = splitList(availableDays)
        if (brands !== undefined) showroom.brands = splitList(brands)

        if (openingHours !== undefined) {
            const parsed = typeof openingHours === "string" ? JSON.parse(openingHours) : openingHours
            showroom.openingHours = {
                open: String(parsed?.open || DEFAULT_OPEN_TIME).trim(),
                close: String(parsed?.close || DEFAULT_CLOSE_TIME).trim(),
            }
        } else if (open !== undefined || close !== undefined) {
            showroom.openingHours = {
                open: String(open ?? (showroom.openingHours?.open || DEFAULT_OPEN_TIME)).trim(),
                close: String(close ?? (showroom.openingHours?.close || DEFAULT_CLOSE_TIME)).trim(),
            }
        }

        showroom.address = {
            street: street !== undefined ? String(street).trim() : showroom.address?.street || "",
            city: city !== undefined ? String(city).trim() : showroom.address?.city || "",
            state: state !== undefined ? String(state).trim() : showroom.address?.state || "",
            pincode: pincode !== undefined ? String(pincode).trim() : showroom.address?.pincode || "",
        }

        showroom.location = {
            lat: lat !== undefined ? Number(lat || 0) : showroom.location?.lat || 0,
            lng: lng !== undefined ? Number(lng || 0) : showroom.location?.lng || 0,
        }

        if (staff !== undefined) {
            const parsedStaff = typeof staff === "string" ? JSON.parse(staff) : staff
            showroom.staff = Array.isArray(parsedStaff)
                ? parsedStaff.filter((item) => item?.name || item?.phone).map((item) => ({
                    name: String(item.name || "").trim(),
                    phone: String(item.phone || "").trim(),
                    role: String(item.role || "test_drive_attendant").trim(),
                }))
                : []
        }

        await showroom.save()
        return res.json({ message: "Showroom profile updated", data: showroom.toObject({ getters: false, virtuals: false }) })
    } catch (err) {
        logServerError("update showroom profile failed", err)
        return res.status(500).json({ message: "Error while updating showroom profile" })
    }
})

router.get("/cars", async (req, res) => {
    try {
        const showroom = await Showroom.findById(getShowroomId(req)).populate("cars.carId").lean()
        if (!showroom) {
            return res.status(404).json({ message: "Showroom not found" })
        }

        return res.json({
            message: "Showroom inventory fetched",
            data: (showroom.cars || []).map(serializeShowroomCarItem),
            meta: { allowedBrands: showroom.brands || [] },
        })
    } catch (err) {
        logServerError("get showroom cars failed", err)
        return res.status(500).json({ message: "Error while fetching showroom cars" })
    }
})

router.post("/cars", upload.single("image"), async (req, res) => {
    try {
        const showroom = await Showroom.findById(getShowroomId(req))
        if (!showroom) {
            return res.status(404).json({ message: "Showroom not found" })
        }

        const { carId, customPrice, name, brand, type, price, mileage, engine, seating, fuel, transmission, rating, reviewRating, safetyRating, priceChangeDate } = req.body || {}
        let car

        if (carId) {
            car = await Car.findById(carId)
            if (!car) {
                return res.status(404).json({ message: "Car not found" })
            }
            if (!showroomOwnsBrand(showroom, car.brand)) {
                return res.status(403).json({ message: "You can only add cars from your registered showroom brands" })
            }
        } else {
            if (!name || !brand || !price) {
                return res.status(400).json({ message: "Name, brand, and price are required" })
            }
            if (!showroomOwnsBrand(showroom, brand)) {
                return res.status(403).json({ message: "You can only add cars from your registered showroom brands" })
            }

            let imageUrl = ""
            if (req.file?.path && canUploadToCloudinary()) {
                try {
                    imageUrl = await uploadToCloudinary(req.file.path)
                } catch (uploadError) {
                    console.error("Showroom car image upload failed:", uploadError.message)
                }
            }

            const numericPrice = Number(price || 0)
            car = await Car.create({
                name: String(name).trim(),
                brand: String(brand).trim(),
                type: type || undefined,
                price: numericPrice,
                mileage: mileage !== undefined && mileage !== "" ? Number(mileage) : undefined,
                engine: engine !== undefined && engine !== "" ? Number(engine) : undefined,
                seating: seating !== undefined && seating !== "" ? Number(seating) : undefined,
                fuel: fuel || undefined,
                transmission: transmission || undefined,
                rating: rating !== undefined && rating !== "" ? Number(rating) : 0,
                reviewRating: reviewRating !== undefined && reviewRating !== "" ? Number(reviewRating) : (rating !== undefined && rating !== "" ? Number(rating) : 0),
                safetyRating: safetyRating !== undefined && safetyRating !== "" ? Number(safetyRating) : (rating !== undefined && rating !== "" ? Number(rating) : 0),
                image: imageUrl,
                status: "active",
                priceHistory: numericPrice ? [{
                    price: numericPrice,
                    changedAt: priceChangeDate ? new Date(priceChangeDate) : new Date(),
                }] : [],
            })
        }

        const exists = showroom.cars.some((item) => String(item.carId) === String(car._id))
        if (exists) {
            return res.status(409).json({ message: "Car already exists in showroom inventory" })
        }

        showroom.cars.push({
            carId: car._id,
            customPrice: customPrice !== undefined && customPrice !== "" ? Number(customPrice) : undefined,
        })
        if (!showroom.availableCars.some((item) => String(item) === String(car._id))) {
            showroom.availableCars.push(car._id)
        }
        await showroom.save()

        await logAdminActivity({
            actorId: showroom._id,
            action: "showroom_inventory_car_added",
            entityType: "showroom",
            entityId: showroom._id,
            description: `Showroom ${showroom.name} added ${car.name} to inventory`,
            metadata: { carId: String(car._id), brand: car.brand, createdNewCar: !carId },
        })

        return res.status(201).json({
            message: "Car added to showroom inventory",
            data: {
                carId: serializeCar(car),
                customPrice: customPrice !== undefined && customPrice !== "" ? Number(customPrice) : undefined,
            },
        })
    } catch (err) {
        logServerError("add showroom car failed", err)
        return res.status(500).json({ message: "Error while adding showroom car" })
    }
})

router.delete("/cars/:carId", async (req, res) => {
    try {
        const showroom = await Showroom.findById(getShowroomId(req))
        if (!showroom) {
            return res.status(404).json({ message: "Showroom not found" })
        }

        showroom.cars = showroom.cars.filter((item) => String(item.carId) !== String(req.params.carId))
        showroom.availableCars = showroom.availableCars.filter((item) => String(item) !== String(req.params.carId))
        await showroom.save()

        return res.json({ message: "Car removed from showroom inventory", data: showroom.cars })
    } catch (err) {
        logServerError("remove showroom car failed", err)
        return res.status(500).json({ message: "Error while removing showroom car" })
    }
})

router.get("/bookings", async (req, res) => {
    try {
        const page = Math.max(Number(req.query.page || 1), 1)
        const limit = Math.min(Math.max(Number(req.query.limit || 10), 1), 100)
        const filter = { showroom: getShowroomId(req) }
        if (req.query.status) filter.status = req.query.status
        if (req.query.bookingType) filter.bookingType = normalizeBookingType(req.query.bookingType)
        if (req.query.date) {
            filter.scheduledDate = normalizeDateOnly(req.query.date)
        } else if (req.query.fromDate || req.query.toDate) {
            filter.scheduledDate = {}
            if (req.query.fromDate) {
                filter.scheduledDate.$gte = normalizeDateOnly(req.query.fromDate)
            }
            if (req.query.toDate) {
                const endDate = normalizeDateOnly(req.query.toDate)
                endDate.setHours(23, 59, 59, 999)
                filter.scheduledDate.$lte = endDate
            }
        }

        const [total, bookings] = await Promise.all([
            TestDriveBooking.countDocuments(filter),
            TestDriveBooking.find(filter)
                .populate("car", "name brand price image fuel transmission")
                .populate("user", "name email")
                .sort({ createdAt: -1, _id: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
        ])

        return res.json({
            message: "Showroom bookings fetched",
            data: bookings,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.max(Math.ceil(total / limit), 1),
            },
        })
    } catch (err) {
        logServerError("get showroom bookings failed", err)
        return res.status(500).json({ message: "Error while fetching showroom bookings" })
    }
})

router.put("/bookings/bulk-confirm", async (req, res) => {
    try {
        const bookingIds = Array.isArray(req.body?.bookingIds) ? req.body.bookingIds.map((item) => String(item)).filter(Boolean) : []
        if (!bookingIds.length) {
            return res.status(400).json({ message: "Select at least one booking to confirm" })
        }

        const bookings = await TestDriveBooking.find({
            _id: { $in: bookingIds },
            showroom: getShowroomId(req),
            status: "pending",
        })

        if (!bookings.length) {
            return res.status(404).json({ message: "No pending bookings found for confirmation" })
        }

        const note = String(req.body?.message || "Booking confirmed").trim()
        await Promise.all(bookings.map(async (booking) => {
            booking.status = "confirmed"
            booking.showroomResponse = {
                message: note,
                respondedAt: new Date(),
            }
            booking.statusHistory.push({
                status: "confirmed",
                updatedBy: req.user?.name || "Showroom",
                updatedByRole: "showroom",
                note,
            })
            await booking.save()
            await createBookingStatusNotification({
                booking,
                actorId: req.user?.id,
                actorName: req.user?.name || "Showroom",
                title: "Test drive confirmed",
                message: `Your booking ${booking.bookingId} has been confirmed for ${new Date(booking.scheduledDate).toLocaleDateString("en-IN")} at ${booking.scheduledTime}.`,
            })
            await createAdminBookingNotification({
                booking,
                actorId: req.user?.id,
                actorName: req.user?.name || "Showroom",
                title: "Booking confirmed by showroom",
                message: `${booking.showroomSnapshot?.name || "A showroom"} confirmed booking ${booking.bookingId}.`,
                type: "booking_confirmed_admin",
            })
        }))

        return res.json({
            message: "Selected bookings confirmed",
            data: {
                updatedCount: bookings.length,
                bookingIds: bookings.map((booking) => booking._id),
            },
        })
    } catch (err) {
        logServerError("bulk confirm bookings failed", err)
        return res.status(500).json({ message: "Error while bulk confirming bookings" })
    }
})

router.put("/bookings/:bookingId/confirm", async (req, res) => {
    try {
        const booking = await TestDriveBooking.findOne({
            _id: req.params.bookingId,
            showroom: getShowroomId(req),
        })

        if (!booking) {
            return res.status(404).json({ message: "Booking not found" })
        }
        if (booking.status !== "pending") {
            return res.status(400).json({ message: "Only pending bookings can be confirmed" })
        }

        const { name, phone, message } = req.body || {}
        booking.status = "confirmed"
        booking.assignedStaff = {
            name: String(name || "").trim(),
            phone: String(phone || "").trim(),
        }
        booking.showroomResponse = {
            message: String(message || "").trim(),
            respondedAt: new Date(),
        }
        booking.statusHistory.push({
            status: "confirmed",
            updatedBy: req.user?.name || "Showroom",
            updatedByRole: "showroom",
            note: String(message || "Booking confirmed").trim(),
        })
        await booking.save()
        await createBookingStatusNotification({
            booking,
            actorId: req.user?.id,
            actorName: req.user?.name || "Showroom",
            title: "Test drive confirmed",
            message: `Your booking ${booking.bookingId} has been confirmed for ${new Date(booking.scheduledDate).toLocaleDateString("en-IN")} at ${booking.scheduledTime}.`,
        })
        await createAdminBookingNotification({
            booking,
            actorId: req.user?.id,
            actorName: req.user?.name || "Showroom",
            title: "Booking confirmed by showroom",
            message: `${booking.showroomSnapshot?.name || "A showroom"} confirmed booking ${booking.bookingId}.`,
            type: "booking_confirmed_admin",
        })

        return res.json({ message: "Booking confirmed", data: booking })
    } catch (err) {
        logServerError("confirm booking failed", err)
        return res.status(500).json({ message: "Error while confirming booking" })
    }
})

router.put("/bookings/:bookingId/reject", async (req, res) => {
    try {
        const booking = await TestDriveBooking.findOne({
            _id: req.params.bookingId,
            showroom: getShowroomId(req),
        })

        if (!booking) {
            return res.status(404).json({ message: "Booking not found" })
        }
        if (["completed", "cancelled", "rejected"].includes(booking.status)) {
            return res.status(400).json({ message: "This booking can no longer be rejected" })
        }

        const reason = String(req.body?.reason || "Booking rejected by showroom").trim()
        booking.status = "rejected"
        booking.showroomResponse = {
            message: reason,
            respondedAt: new Date(),
        }
        booking.statusHistory.push({
            status: "rejected",
            updatedBy: req.user?.name || "Showroom",
            updatedByRole: "showroom",
            note: reason,
        })
        await booking.save()
        await releaseSlot({ showroomId: booking.showroom, date: booking.scheduledDate, time: booking.scheduledTime })
        await createBookingStatusNotification({
            booking,
            actorId: req.user?.id,
            actorName: req.user?.name || "Showroom",
            title: "Test drive update",
            message: `Your booking ${booking.bookingId} was declined by the showroom.`,
            type: "booking_rejected",
        })
        await createAdminBookingNotification({
            booking,
            actorId: req.user?.id,
            actorName: req.user?.name || "Showroom",
            title: "Booking rejected by showroom",
            message: `${booking.showroomSnapshot?.name || "A showroom"} rejected booking ${booking.bookingId}.`,
            type: "booking_rejected_admin",
        })

        return res.json({ message: "Booking rejected", data: booking })
    } catch (err) {
        logServerError("reject booking failed", err)
        return res.status(500).json({ message: "Error while rejecting booking" })
    }
})

router.put("/bookings/:bookingId/complete", async (req, res) => {
    try {
        const booking = await TestDriveBooking.findOne({
            _id: req.params.bookingId,
            showroom: getShowroomId(req),
        })

        if (!booking) {
            return res.status(404).json({ message: "Booking not found" })
        }
        if (booking.status !== "confirmed") {
            return res.status(400).json({ message: "Only confirmed bookings can be completed" })
        }

        const note = String(req.body?.note || "Test drive completed").trim()
        booking.status = "completed"
        booking.statusHistory.push({
            status: "completed",
            updatedBy: req.user?.name || "Showroom",
            updatedByRole: "showroom",
            note,
        })
        await booking.save()
        await createBookingStatusNotification({
            booking,
            actorId: req.user?.id,
            actorName: req.user?.name || "Showroom",
            title: "Test drive completed",
            message: `Your booking ${booking.bookingId} has been marked as completed.`,
        })
        await createAdminBookingNotification({
            booking,
            actorId: req.user?.id,
            actorName: req.user?.name || "Showroom",
            title: "Booking completed",
            message: `${booking.showroomSnapshot?.name || "A showroom"} completed booking ${booking.bookingId}.`,
            type: "booking_completed_admin",
        })

        return res.json({ message: "Booking completed", data: booking })
    } catch (err) {
        logServerError("complete booking failed", err)
        return res.status(500).json({ message: "Error while completing booking" })
    }
})

router.get("/availability", async (req, res) => {
    try {
        const page = Math.max(Number(req.query.page || 1), 1)
        const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100)
        const filter = { showroom: getShowroomId(req) }
        if (req.query.date) {
            filter.date = normalizeDateOnly(req.query.date)
        }

        const [total, items] = await Promise.all([
            ShowroomAvailability.countDocuments(filter),
            ShowroomAvailability.find(filter)
                .sort({ date: 1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
        ])

        return res.json({
            message: "Showroom availability fetched",
            data: items,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.max(Math.ceil(total / limit), 1),
            },
        })
    } catch (err) {
        logServerError("get showroom availability failed", err)
        return res.status(500).json({ message: "Error while fetching showroom availability" })
    }
})

router.post("/availability", async (req, res) => {
    try {
        const { date, slots } = req.body || {}
        const showroomId = getShowroomId(req)
        const showroom = await Showroom.findById(showroomId)
        if (!showroom) {
            return res.status(404).json({ message: "Showroom not found" })
        }

        const normalizedDate = normalizeDateOnly(date)
        await ensureAvailabilityForDate({ showroomId, date: normalizedDate, showroom })

        const previous = await ShowroomAvailability.findOne({ showroom: showroomId, date: normalizedDate })
        const bookedMap = new Map(
            (previous?.slots || [])
                .filter((slot) => slot.isBooked)
                .map((slot) => [slot.time, slot])
        )

        const nextSlots = Array.isArray(slots)
            ? slots
                .map((slot) => {
                    const time = typeof slot === "string" ? slot : slot?.time
                    if (!time) return null
                    const booked = bookedMap.get(time)
                    if (booked) {
                        return {
                            time,
                            isBooked: true,
                            bookingId: booked.bookingId,
                        }
                    }
                    return {
                        time,
                        isBooked: false,
                    }
                })
                .filter(Boolean)
            : []

        const availability = await ShowroomAvailability.findOneAndUpdate(
            { showroom: showroomId, date: normalizedDate },
            {
                showroom: showroomId,
                date: normalizedDate,
                slots: nextSlots,
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        )

        return res.status(201).json({ message: "Availability saved", data: availability })
    } catch (err) {
        logServerError("save availability failed", err)
        return res.status(500).json({ message: "Error while saving availability" })
    }
})

module.exports = router
