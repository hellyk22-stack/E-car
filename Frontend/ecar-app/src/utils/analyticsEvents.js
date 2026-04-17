import axiosInstance from './axiosInstance'

export const logCarView = async (carId) => {
    if (!carId) return

    try {
        await axiosInstance.post('/analytics/views', { carId })
    } catch (err) {
        console.error('Failed to log car view', err)
    }
}

export const logSearchEvent = async (filters) => {
    try {
        await axiosInstance.post('/analytics/searches', filters)
    } catch (err) {
        console.error('Failed to log search event', err)
    }
}