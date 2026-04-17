import axios from "axios"
import { clearAuth } from "./auth"

const axiosInstance = axios.create({
    baseURL: "http://localhost:3000"
})

// ✅ Auto attach token to every request
axiosInstance.interceptors.request.use((config) => {
    const token = localStorage.getItem("token")
    if (token) {
        config.headers.token = token
    }
    return config
})

// ✅ Auto logout on 401 and clear stale token
axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            const url = error.config?.url || ""
            if (!url.includes("/login")) {
                clearAuth()
                const returnTo = encodeURIComponent(`${window.location.pathname}${window.location.search}`)
                window.location.href = `/login?returnTo=${returnTo}`
            }
        }
        return Promise.reject(error)
    }
)

export default axiosInstance