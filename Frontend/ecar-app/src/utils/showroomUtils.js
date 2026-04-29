const parseCoordinate = (value) => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
}

const buildLatLng = (latValue, lngValue) => {
    const lat = parseCoordinate(latValue)
    const lng = parseCoordinate(lngValue)
    if (lat === null || lng === null || (lat === 0 && lng === 0)) return null
    return { lat, lng }
}

export const isValidCoordinate = (location) => {
    const lat = parseCoordinate(location?.lat)
    const lng = parseCoordinate(location?.lng)
    return lat !== null && lng !== null && !(lat === 0 && lng === 0)
}

export const getShowroomLocation = (showroom) => {
    const candidates = [
        showroom?.mapLocation,
        showroom?.location,
        showroom?.coordinates,
        showroom?.address?.location,
        showroom?.address?.coordinates,
        showroom?.geoLocation,
    ]

    for (const candidate of candidates) {
        if (!candidate) continue

        if (isValidCoordinate(candidate)) {
            return buildLatLng(candidate.lat, candidate.lng)
        }

        const latLngKeys = buildLatLng(candidate.latitude, candidate.longitude)
        if (latLngKeys) return latLngKeys

        const geoJsonCoordinates = Array.isArray(candidate.coordinates)
            ? buildLatLng(candidate.coordinates[1], candidate.coordinates[0])
            : null
        if (geoJsonCoordinates) return geoJsonCoordinates

        const directArrayCoordinates = Array.isArray(candidate)
            ? buildLatLng(candidate[1], candidate[0])
            : null
        if (directArrayCoordinates) return directArrayCoordinates

        const nestedLatLng = buildLatLng(candidate.lat ?? candidate.latitude, candidate.lng ?? candidate.lon ?? candidate.longitude)
        if (nestedLatLng) {
            return nestedLatLng
        }
    }

    const showroomLevelLatLng = buildLatLng(
        showroom?.lat ?? showroom?.latitude,
        showroom?.lng ?? showroom?.lon ?? showroom?.longitude,
    )
    if (showroomLevelLatLng) return showroomLevelLatLng

    return null
}

export const getShowroomRatingValue = (showroom) => {
    const candidates = [
        showroom?.rating?.average,
        showroom?.rating?.value,
        showroom?.averageRating,
        showroom?.reviewStats?.average,
        showroom?.reviewSummary?.average,
        showroom?.reviews?.average,
    ]

    for (const candidate of candidates) {
        const value = Number(candidate)
        if (Number.isFinite(value) && value > 0) {
            return value
        }
    }

    if (Array.isArray(showroom?.reviews) && showroom.reviews.length) {
        const ratings = showroom.reviews
            .map((review) => Number(review?.rating ?? review?.stars))
            .filter((value) => Number.isFinite(value) && value > 0)

        if (ratings.length) {
            return ratings.reduce((sum, value) => sum + value, 0) / ratings.length
        }
    }

    return 0
}

export const formatShowroomRating = (showroom) => getShowroomRatingValue(showroom).toFixed(1)
