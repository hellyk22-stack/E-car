import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom"
import Login from "../components/Login"
import Signup from "../components/Signup"
import { UserNavbar } from "../components/user/UserNavbar"
import { AdminSidebar } from "../components/admin/AdminSidebar"
import ProtectedRoute from "./ProtectedRoute"
import Home from "../pages/user/Home"
import SearchCars from "../pages/user/SearchCars"
import CompareCars from "../pages/user/CompareCars"
import ManageCars from "../pages/admin/ManageCars"
import AnalyticsDashboard from "../pages/admin/AnalyticsDashboard"
import CarDetail from "../pages/user/CarDetail"
import Profile from "../pages/user/Profile"
import Wishlist from "../pages/user/Wishlist"
import Dashboard from "../pages/user/Dashboard"
import AIRecommend from "../pages/user/AIRecommend"
import AccessDenied from "../pages/AccessDenied"

// BUG FIX: `car/:id` was at root level — navbar wouldn't show. Moved inside /user children.
// NEW: Added /user/wishlist, /user/dashboard, /user/ai routes.

const router = createBrowserRouter([
    { path: "/", element: <Home /> },
    { path: "/login", element: <Login /> },
    { path: "/signup", element: <Signup /> },
    { path: "/403", element: <AccessDenied /> },
    {
        path: "/user",
        element: (
            <ProtectedRoute>
                <UserNavbar />
            </ProtectedRoute>
        ),
        children: [
            { path: "profile", element: <Profile /> },
            { path: "search", element: <SearchCars /> },
            { path: "compare", element: <CompareCars /> },
            { path: "wishlist", element: <Wishlist /> },       // NEW
            { path: "dashboard", element: <Dashboard /> },     // NEW
            { path: "ai", element: <AIRecommend /> },          // NEW
            { path: "car/:id", element: <CarDetail /> },       // BUG FIX: moved from root to /user
        ]
    },
    {
        path: "/admin",
        element: (
            <ProtectedRoute allowedRoles={["admin"]}>
                <AdminSidebar />
            </ProtectedRoute>
        ),
        children: [
            { index: true, element: <Navigate to="analytics" replace /> },
            { path: "analytics", element: <AnalyticsDashboard /> },
            { path: "managecars", element: <ManageCars /> }
        ]
    },
])

const AppRouter = () => <RouterProvider router={router} />

export default AppRouter
