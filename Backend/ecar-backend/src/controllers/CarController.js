const carSchema = require("../models/CarModel")
const uploadToCloudinary = require("../utils/Cloudinary")
const { logAdminActivity } = require("../utils/AdminActivityLogger")
const { parseCsv, validateCarCsvRow } = require("../utils/CsvCarImport")
const { serializeCar, normalizeRating } = require("../utils/CarRatingUtil")

const buildRatingPayload = (payload = {}) => {
    const normalized = { ...payload }
    const hasLegacyRating = payload.rating !== undefined && payload.rating !== ""
    const hasReviewRating = payload.reviewRating !== undefined && payload.reviewRating !== ""
    const hasSafetyRating = payload.safetyRating !== undefined && payload.safetyRating !== ""

    if (hasLegacyRating) {
        normalized.rating = normalizeRating(payload.rating)
    }

    if (hasReviewRating || hasLegacyRating) {
        normalized.reviewRating = normalizeRating(hasReviewRating ? payload.reviewRating : payload.rating)
    }

    if (hasSafetyRating || hasLegacyRating) {
        normalized.safetyRating = normalizeRating(hasSafetyRating ? payload.safetyRating : payload.rating)
    }

    return normalized
}

const getAllCars = async (req, res) => {
    try {
        const cars = await carSchema.find({})
        res.json({ message: "All cars", data: cars.map(serializeCar) })
    } catch (err) {
        res.status(500).json({ message: "Error while fetching cars", err })
    }
}

const getCarById = async (req, res) => {
    try {
        const car = await carSchema.findById(req.params.id)
        if (car) {
            res.json({ message: "Car found", data: serializeCar(car) })
        } else {
            res.status(404).json({ message: "Car not found" })
        }
    } catch (err) {
        res.status(500).json({ message: "Error while fetching car", err })
    }
}

const getPriceHistory = async (req, res) => {
    try {
        const history = await carSchema.aggregate([
            { $match: { _id: carSchema.db.base.Types.ObjectId.createFromHexString(req.params.id) } },
            { $unwind: "$priceHistory" },
            {
                $project: {
                    _id: 0,
                    price: "$priceHistory.price",
                    changedAt: "$priceHistory.changedAt",
                    changedBy: "$priceHistory.changedBy"
                }
            },
            { $sort: { changedAt: 1 } }
        ])

        res.json({ message: "Price history", data: history })
    } catch (err) {
        res.status(500).json({ message: "Error while fetching price history", err })
    }
}

const addCar = async (req, res) => {
    try {
        let imageUrl = ""

        if (req.file) {
            imageUrl = await uploadToCloudinary(req.file.path)
        }

        const initialPrice = Number(req.body.price || 0)
        const savedCar = await carSchema.create({
            ...buildRatingPayload(req.body),
            userId: req.user?.id,
            image: imageUrl,
            price: initialPrice,
            priceHistory: initialPrice ? [{
                price: initialPrice,
                changedAt: req.body.priceChangeDate ? new Date(req.body.priceChangeDate) : new Date(),
                changedBy: req.user?.id,
            }] : [],
        })

        await logAdminActivity({
            actorId: req.user.id,
            action: "car_added",
            entityType: "car",
            entityId: savedCar._id,
            description: `Added car ${savedCar.name}`,
            metadata: { name: savedCar.name, brand: savedCar.brand, price: savedCar.price },
        })

        res.status(201).json({ message: "Car added successfully", data: serializeCar(savedCar) })
    } catch (err) {
        res.status(500).json({ message: "Error while adding car", err })
    }
}

const updateCar = async (req, res) => {
    try {
        const car = await carSchema.findById(req.params.id)
        if (!car) {
            return res.status(404).json({ message: "Car not found" })
        }

        if (req.file) {
            car.image = await uploadToCloudinary(req.file.path)
        }

        const nextPrice = req.body.price !== undefined && req.body.price !== '' ? Number(req.body.price) : car.price
        const previousPrice = Number(car.price || 0)

        Object.entries(req.body).forEach(([key, value]) => {
            if (key === 'priceChangeDate') return
            if (value !== undefined && value !== '') {
                car[key] = key === 'price' ? Number(value) : value
            }
        })

        const normalizedRatings = buildRatingPayload(req.body)
        if (normalizedRatings.rating !== undefined) {
            car.rating = normalizedRatings.rating
        }
        if (normalizedRatings.reviewRating !== undefined) {
            car.reviewRating = normalizedRatings.reviewRating
        }
        if (normalizedRatings.safetyRating !== undefined) {
            car.safetyRating = normalizedRatings.safetyRating
        }

        if (nextPrice !== previousPrice) {
            car.priceHistory.push({
                price: nextPrice,
                changedAt: req.body.priceChangeDate ? new Date(req.body.priceChangeDate) : new Date(),
                changedBy: req.user?.id,
            })
        }

        const updatedCar = await car.save()

        await logAdminActivity({
            actorId: req.user.id,
            action: "car_updated",
            entityType: "car",
            entityId: updatedCar._id,
            description: `Updated car ${updatedCar.name}`,
            metadata: { name: updatedCar.name, previousPrice, nextPrice },
        })

        res.json({ message: "Car updated successfully", data: serializeCar(updatedCar) })
    } catch (err) {
        res.status(500).json({ message: "Error while updating car", err })
    }
}

const deleteCar = async (req, res) => {
    try {
        const deletedCar = await carSchema.findByIdAndDelete(req.params.id)
        if (deletedCar) {
            await logAdminActivity({
                actorId: req.user.id,
                action: "car_deleted",
                entityType: "car",
                entityId: deletedCar._id,
                description: `Deleted car ${deletedCar.name}`,
                metadata: { name: deletedCar.name, brand: deletedCar.brand },
            })
            res.json({ message: "Car deleted successfully", data: serializeCar(deletedCar) })
        } else {
            res.status(404).json({ message: "Car not found" })
        }
    } catch (err) {
        res.status(500).json({ message: "Error while deleting car", err })
    }
}

const searchCars = async (req, res) => {
    try {
        const { brand, type, fuel, transmission, maxPrice } = req.query
        const filter = { status: "active" }
        if (brand) filter.brand = { $regex: brand, $options: "i" }
        if (type) filter.type = type
        if (fuel) filter.fuel = fuel
        if (transmission) filter.transmission = transmission
        if (maxPrice) filter.price = { $lte: parseInt(maxPrice) }
        const cars = await carSchema.find(filter)
        res.json({ message: "Search results", data: cars.map(serializeCar) })
    } catch (err) {
        res.status(500).json({ message: "Error while searching cars", err })
    }
}

const getCarsByUser = async (req, res) => {
    try {
        const userId = req.user.id
        const cars = await carSchema.find({ userId: userId, status: "active" })
        res.json({ message: "My cars", data: cars.map(serializeCar) })
    } catch (err) {
        res.status(500).json({ message: "Error while fetching user's cars", err })
    }
}

const getExistingCarKeys = async (rows) => {
    const pairs = rows
        .map((row) => ({ name: row.name, brand: row.brand }))
        .filter((row) => row.name && row.brand)

    if (!pairs.length) return new Set()

    const existingCars = await carSchema.find({
        $or: pairs.map((pair) => ({ name: pair.name, brand: pair.brand })),
    }).select("name brand").lean()

    return new Set(existingCars.map((car) => `${String(car.name).toLowerCase()}::${String(car.brand).toLowerCase()}`))
}

const previewCsvImport = async (req, res) => {
    try {
        if (!req.file?.buffer) {
            return res.status(400).json({ message: "CSV file is required" })
        }

        const content = req.file.buffer.toString("utf-8")
        const { rows } = parseCsv(content)
        const existingKeys = await getExistingCarKeys(rows)
        const preview = rows.map((row, index) => {
            const { normalized, errors } = validateCarCsvRow(row, existingKeys)
            return {
                rowNumber: index + 2,
                raw: row,
                normalized,
                errors,
                isValid: errors.length === 0,
            }
        })

        return res.json({
            message: "CSV preview generated",
            data: preview,
            meta: {
                totalRows: preview.length,
                validRows: preview.filter((row) => row.isValid).length,
                invalidRows: preview.filter((row) => !row.isValid).length,
            },
        })
    } catch (err) {
        return res.status(500).json({ message: "Error while previewing CSV import", err })
    }
}

const confirmCsvImport = async (req, res) => {
    try {
        const rows = Array.isArray(req.body?.rows) ? req.body.rows : []
        if (!rows.length) {
            return res.status(400).json({ message: "No rows provided for import" })
        }

        const existingKeys = await getExistingCarKeys(rows)
        const validRows = []
        const rejectedRows = []
        const seenKeys = new Set(existingKeys)

        rows.forEach((row, index) => {
            const { normalized, errors } = validateCarCsvRow(row, seenKeys)
            const key = `${String(normalized.name || "").toLowerCase()}::${String(normalized.brand || "").toLowerCase()}`
            if (errors.length === 0) {
                seenKeys.add(key)
                validRows.push({
                    ...normalized,
                    userId: req.user.id,
                    priceHistory: normalized.price ? [{
                        price: normalized.price,
                        changedAt: normalized.priceChangeDate ? new Date(normalized.priceChangeDate) : new Date(),
                        changedBy: req.user.id,
                    }] : [],
                })
            } else {
                rejectedRows.push({ rowNumber: index + 1, normalized, errors })
            }
        })

        let inserted = []
        if (validRows.length) {
            inserted = await carSchema.insertMany(validRows)
            await logAdminActivity({
                actorId: req.user.id,
                action: "car_bulk_imported",
                entityType: "car",
                description: `Imported ${inserted.length} cars via CSV`,
                metadata: { insertedCount: inserted.length, rejectedCount: rejectedRows.length },
            })
        }

        return res.status(201).json({
            message: "CSV import completed",
            data: {
                insertedCount: inserted.length,
                rejectedCount: rejectedRows.length,
                rejectedRows,
                inserted: inserted.map(serializeCar),
            },
        })
    } catch (err) {
        return res.status(500).json({ message: "Error while confirming CSV import", err })
    }
}

module.exports = {
    getAllCars,
    getCarById,
    getPriceHistory,
    addCar,
    updateCar,
    deleteCar,
    searchCars,
    getCarsByUser,
    previewCsvImport,
    confirmCsvImport,
}
