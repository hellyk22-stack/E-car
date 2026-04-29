const normalizeRating = (value, fallback = 0) => {
    const numeric = Number(value)
    if (!Number.isFinite(numeric)) return fallback
    return Number(Math.max(0, Math.min(5, numeric)).toFixed(1))
}

const resolveReviewRating = (car = {}) => (
    normalizeRating(car.reviewRating ?? car.rating ?? 0)
)

const resolveSafetyRating = (car = {}) => (
    normalizeRating(car.safetyRating ?? car.rating ?? car.reviewRating ?? 0)
)

const serializeCar = (car) => {
    const plainCar = car?.toObject ? car.toObject() : { ...car }
    const reviewRating = resolveReviewRating(plainCar)
    const safetyRating = resolveSafetyRating(plainCar)

    const rawId = plainCar._id || plainCar.id
    const finalId = rawId 
        ? String(rawId) 
        : `ext_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    return {
        ...plainCar,
        _id: finalId,
        id: finalId,
        rating: reviewRating,
        reviewRating,
        safetyRating,
    }
}

module.exports = {
    normalizeRating,
    resolveReviewRating,
    resolveSafetyRating,
    serializeCar,
}
