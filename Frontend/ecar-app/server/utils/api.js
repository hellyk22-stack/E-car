export const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
}

export const parsePagination = (req) => {
    const page = Math.max(Number(req.query.page || 1), 1)
    const limit = Math.max(Math.min(Number(req.query.limit || 10), 100), 1)
    const skip = (page - 1) * limit
    return { page, limit, skip }
}

export const paginatedResponse = ({ data, total, page, limit }) => ({
    success: true,
    data,
    meta: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
    },
})

export const normalizeDateOnly = (value) => {
    const date = new Date(value)
    date.setHours(0, 0, 0, 0)
    return date
}

export const buildBookingId = () =>
    `TDB-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`
