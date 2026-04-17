import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { getRole, isAuthenticated } from '../utils/auth'

const buildReturnTo = (location) => encodeURIComponent(`${location.pathname}${location.search}`)

const ProtectedRoute = ({ children, allowedRoles = null }) => {
    const location = useLocation()

    if (!isAuthenticated()) {
        return <Navigate to={`/login?returnTo=${buildReturnTo(location)}`} replace />
    }

    if (allowedRoles?.length) {
        const role = getRole()
        if (!allowedRoles.includes(role)) {
            return <Navigate to="/403" replace state={{ from: location.pathname }} />
        }
    }

    return children
}

export default ProtectedRoute