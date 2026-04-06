import axiosInstance from './axiosInstance'

export const getWishlistCars = async () => {
    const res = await axiosInstance.get('/wishlist/my')
    return res.data.data || []
}

export const getWishlistIds = async () => {
    const res = await axiosInstance.get('/wishlist/my?idsOnly=true')
    return res.data.data || []
}

export const isCarWishlisted = async (carId) => {
    const res = await axiosInstance.get(`/wishlist/check/${carId}`)
    return !!res.data.data?.inWishlist
}

export const addCarToWishlist = async (carId) => {
    await axiosInstance.post(`/wishlist/${carId}`)
}

export const removeCarFromWishlist = async (carId) => {
    await axiosInstance.delete(`/wishlist/${carId}`)
}

export const clearWishlist = async () => {
    await axiosInstance.delete('/wishlist/my/all')
}
