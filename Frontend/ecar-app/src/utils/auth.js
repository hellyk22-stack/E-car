// Auth utility helpers

export const getToken = () => localStorage.getItem("token")
export const getRole = () => localStorage.getItem("role")
export const getName = () => localStorage.getItem("name") || "User"

export const clearAuth = () => {
  localStorage.removeItem("token")
  localStorage.removeItem("role")
  localStorage.removeItem("name")
}

const decodeJwtPayload = (token) => {
  if (!token) return null
  const parts = token.split(".")
  if (parts.length !== 3) return null

  try {
    const payload = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
    return JSON.parse(decodeURIComponent(escape(payload)))
  } catch (err) {
    console.error("Failed to decode token", err)
    return null
  }
}

export const getUserId = () => {
  const token = getToken()
  const payload = decodeJwtPayload(token)
  return payload?.id || null
}

export const isTokenValid = (token) => {
  if (!token) return false
  const payload = decodeJwtPayload(token)
  if (!payload || !payload.exp) return false
  return Date.now() < payload.exp * 1000
}

export const isAuthenticated = () => {
  const token = getToken()
  if (!token) return false
  if (!isTokenValid(token)) {
    clearAuth()
    return false
  }

  return true
}
