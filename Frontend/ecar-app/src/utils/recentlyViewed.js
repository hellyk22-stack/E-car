const STORAGE_KEY = 'recentlyViewedCars'
const MAX_RECENTLY_VIEWED = 10

export const getRecentlyViewedCars = () => {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    } catch (err) {
        console.error('Failed to read recently viewed cars', err)
        return []
    }
}

export const addRecentlyViewedCar = (car) => {
    if (!car?._id) return

    const current = getRecentlyViewedCars()
    const next = [
        car,
        ...current.filter((item) => item._id !== car._id),
    ].slice(0, MAX_RECENTLY_VIEWED)

    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}
