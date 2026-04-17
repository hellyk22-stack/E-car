const TYPE_OPTIONS = ["Hatchback", "Sedan", "SUV", "Luxury"]
const FUEL_OPTIONS = ["Petrol", "Diesel", "Electric"]
const TRANSMISSION_OPTIONS = ["Manual", "Automatic"]
const STATUS_OPTIONS = ["active", "inactive"]
const RATING_MIN = 0
const RATING_MAX = 5

const splitCsvLine = (line) => {
    const values = []
    let current = ""
    let inQuotes = false

    for (let index = 0; index < line.length; index += 1) {
        const char = line[index]
        const nextChar = line[index + 1]

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                current += '"'
                index += 1
            } else {
                inQuotes = !inQuotes
            }
        } else if (char === ',' && !inQuotes) {
            values.push(current)
            current = ""
        } else {
            current += char
        }
    }

    values.push(current)
    return values.map((value) => value.trim())
}

const parseCsv = (content = "") => {
    const normalized = String(content || "").replace(/^\uFEFF/, "")
    const lines = normalized.split(/\r?\n/).filter((line) => line.trim() !== "")
    if (lines.length === 0) return { headers: [], rows: [] }

    const headers = splitCsvLine(lines[0]).map((header) => header.trim())
    const rows = lines.slice(1).map((line) => {
        const values = splitCsvLine(line)
        const row = {}
        headers.forEach((header, index) => {
            row[header] = values[index] ?? ""
        })
        return row
    })

    return { headers, rows }
}

const normalizeTitleCase = (value, allowed) => {
    const normalized = String(value || "").trim().toLowerCase()
    return allowed.find((option) => option.toLowerCase() === normalized) || ""
}

const toNumber = (value) => {
    if (value === "" || value === null || typeof value === "undefined") return null
    const cleaned = String(value).replace(/[^\d.-]/g, "")
    const parsed = Number(cleaned)
    return Number.isFinite(parsed) ? parsed : null
}

const validateCarCsvRow = (row, existingKeys = new Set()) => {
    const normalized = {
        name: String(row.name || row.Name || "").trim(),
        brand: String(row.brand || row.Brand || "").trim(),
        type: normalizeTitleCase(row.type || row.Type, TYPE_OPTIONS),
        price: toNumber(row.price || row.Price),
        mileage: toNumber(row.mileage || row.Mileage),
        engine: toNumber(row.engine || row.Engine),
        seating: toNumber(row.seating || row.Seating),
        fuel: normalizeTitleCase(row.fuel || row.Fuel, FUEL_OPTIONS),
        transmission: normalizeTitleCase(row.transmission || row.Transmission, TRANSMISSION_OPTIONS),
        rating: toNumber(row.rating || row.Rating),
        reviewRating: toNumber(row.reviewRating || row.ReviewRating || row.review_rating || row.rating || row.Rating),
        safetyRating: toNumber(row.safetyRating || row.SafetyRating || row.safety_rating || row.rating || row.Rating),
        image: String(row.image || row.Image || "").trim(),
        status: normalizeTitleCase(row.status || row.Status, STATUS_OPTIONS) || "active",
        priceChangeDate: String(row.priceChangeDate || row.PriceChangeDate || row.price_date || "").trim(),
    }

    const errors = []

    if (!normalized.name) errors.push("Name is required")
    if (!normalized.brand) errors.push("Brand is required")
    if (!normalized.type) errors.push(`Type must be one of: ${TYPE_OPTIONS.join(", ")}`)
    if (normalized.price === null || normalized.price < 0) errors.push("Price must be a valid number")
    if (normalized.fuel && !FUEL_OPTIONS.includes(normalized.fuel)) errors.push(`Fuel must be one of: ${FUEL_OPTIONS.join(", ")}`)
    if (normalized.transmission && !TRANSMISSION_OPTIONS.includes(normalized.transmission)) errors.push(`Transmission must be one of: ${TRANSMISSION_OPTIONS.join(", ")}`)
    if (normalized.status && !STATUS_OPTIONS.includes(normalized.status)) errors.push(`Status must be one of: ${STATUS_OPTIONS.join(", ")}`)
    if (normalized.rating !== null && (normalized.rating < RATING_MIN || normalized.rating > RATING_MAX)) errors.push("Rating must be between 0 and 5")
    if (normalized.reviewRating !== null && (normalized.reviewRating < RATING_MIN || normalized.reviewRating > RATING_MAX)) errors.push("Review rating must be between 0 and 5")
    if (normalized.safetyRating !== null && (normalized.safetyRating < RATING_MIN || normalized.safetyRating > RATING_MAX)) errors.push("Safety rating must be between 0 and 5")
    if (normalized.priceChangeDate && Number.isNaN(new Date(normalized.priceChangeDate).getTime())) errors.push("Price change date must be a valid date")

    const duplicateKey = `${normalized.name.toLowerCase()}::${normalized.brand.toLowerCase()}`
    if (normalized.name && normalized.brand && existingKeys.has(duplicateKey)) {
        errors.push("A car with the same name and brand already exists")
    }

    return { normalized, errors }
}

module.exports = {
    parseCsv,
    validateCarCsvRow,
    TYPE_OPTIONS,
    FUEL_OPTIONS,
    TRANSMISSION_OPTIONS,
    STATUS_OPTIONS,
}
