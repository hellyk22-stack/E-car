import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom"
import RoleLogin from "../components/RoleLogin"
import Signup from "../components/Signup"
import { UserNavbar } from "../components/user/UserNavbar"
import AdminLayout from "../components/admin/AdminLayout"
import ProtectedRoute from "./ProtectedRoute"
import Home from "../pages/user/Home"
import SearchCars from "../pages/user/SearchCars"
import CompareCars from "../pages/user/CompareCars"
import ManageCars from "../pages/admin/ManageCars"
import AnalyticsDashboard from "../pages/admin/AnalyticsDashboard"
import AdminUsers from "../pages/admin/AdminUsers"
import SystemCenter from "../pages/admin/SystemCenter"
import CarDetail from "../pages/user/CarDetail"
import Profile from "../pages/user/Profile"
import Wishlist from "../pages/user/Wishlist"
import Dashboard from "../pages/user/Dashboard"
import AIRecommend from "../pages/user/AIRecommend"
import RoleAccessDenied from "../pages/RoleAccessDenied"
import ShowroomLayout from "../components/showroom/ShowroomLayout"
import ShowroomDashboard from "../pages/showroom/ShowroomDashboard"
import ShowroomCars from "../pages/showroom/ShowroomCarsRevamp"
import ShowroomBookings from "../pages/showroom/ShowroomBookings"
import ShowroomAvailability from "../pages/showroom/ShowroomAvailability"
import ShowroomProfile from "../pages/showroom/ShowroomProfile"
import ShowroomRegister from "../pages/showroom/ShowroomRegister"
import AdminShowrooms from "../pages/admin/AdminShowrooms"
import AdminBookings from "../pages/admin/AdminBookingsRevamp"
import Showrooms from "../pages/user/Showrooms"
import ShowroomDetail from "../pages/user/ShowroomDetail"
import BookTestDrive from "../pages/user/BookTestDrive"
import BookingSuccess from "../pages/user/BookingSuccess"
import TestDriveBookings from "../pages/user/TestDriveBookings"
import UserBookingDetail from "../pages/user/UserBookingDetail"
import Pricing from "../pages/user/Pricing"
import Subscription from "../pages/user/Subscription"

const router = createBrowserRouter([
    { path: "/", element: <Home /> },
    { path: "/login", element: <RoleLogin /> },
    { path: "/signup", element: <Signup /> },
    { path: "/showroom/register", element: <ShowroomRegister /> },
    { path: "/403", element: <RoleAccessDenied /> },
    {
        path: "/user",
        element: (
            <ProtectedRoute allowedRoles={["user"]}>
                <UserNavbar />
            </ProtectedRoute>
        ),
        children: [
            { path: "profile", element: <Profile /> },
            { path: "search", element: <SearchCars /> },
            { path: "compare", element: <CompareCars /> },
            { path: "wishlist", element: <Wishlist /> },
            { path: "dashboard", element: <Dashboard /> },
            { path: "ai", element: <AIRecommend /> },
            { path: "car/:id", element: <CarDetail /> },
            { path: "showrooms", element: <Showrooms /> },
            { path: "showrooms/:id", element: <ShowroomDetail /> },
            { path: "book-test-drive", element: <BookTestDrive /> },
            { path: "book-test-drive/:showroomId", element: <BookTestDrive /> },
            { path: "bookings", element: <TestDriveBookings /> },
            { path: "bookings/:bookingId", element: <UserBookingDetail /> },
            { path: "pricing", element: <Pricing /> },
            { path: "subscription", element: <Subscription /> },
        ]
    },
    {
        path: "/booking",
        element: (
            <ProtectedRoute allowedRoles={["user"]}>
                <UserNavbar />
            </ProtectedRoute>
        ),
        children: [
            { path: "success", element: <BookingSuccess /> },
        ],
    },
    {
        path: "/showroom",
        element: (
            <ProtectedRoute allowedRoles={["showroom"]}>
                <ShowroomLayout />
            </ProtectedRoute>
        ),
        children: [
            { index: true, element: <Navigate to="dashboard" replace /> },
            { path: "dashboard", element: <ShowroomDashboard /> },
            { path: "cars", element: <ShowroomCars /> },
            { path: "bookings", element: <ShowroomBookings /> },
            { path: "availability", element: <ShowroomAvailability /> },
            { path: "profile", element: <ShowroomProfile /> },
        ],
    },
    {
        path: "/admin",
        element: (
            <ProtectedRoute allowedRoles={["admin"]}>
                <AdminLayout />
            </ProtectedRoute>
        ),
        children: [
            { index: true, element: <Navigate to="analytics" replace /> },
            { path: "analytics", element: <AnalyticsDashboard /> },
            { path: "users", element: <AdminUsers /> },
            { path: "system", element: <SystemCenter /> },
            { path: "managecars", element: <ManageCars /> },
            { path: "showrooms", element: <AdminShowrooms /> },
            { path: "bookings", element: <AdminBookings /> },
        ]
    },
])

const AppRouter = () => <RouterProvider router={router} />

export default AppRouter
