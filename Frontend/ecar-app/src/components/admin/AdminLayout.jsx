import React, { useEffect, useRef, useState } from "react"
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom"
import axiosInstance from "../../utils/axiosInstance"

const navItems = [
    { icon: "📈", label: "Analytics", path: "/admin/analytics" },
    { icon: "👥", label: "Users", path: "/admin/users" },
    { icon: "🔔", label: "System", path: "/admin/system" },
    { icon: "🚗", label: "Manage Cars", path: "/admin/managecars" },
    { icon: "🏬", label: "Showrooms", path: "/admin/showrooms" },
    { icon: "📋", label: "Bookings", path: "/admin/bookings" },
]

const AdminLayout = () => {
    const [collapsed, setCollapsed] = useState(false)
    const [notifications, setNotifications] = useState([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [notificationOpen, setNotificationOpen] = useState(false)
    const location = useLocation()
    const navigate = useNavigate()
    const notificationRef = useRef(null)
    const name = localStorage.getItem("name") || "Admin"
    const initials = name.charAt(0).toUpperCase()

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target)) {
                setNotificationOpen(false)
            }
        }

        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    useEffect(() => {
        const loadNotifications = async () => {
            try {
                const res = await axiosInstance.get("/notification/my")
                setNotifications(res.data.data || [])
                setUnreadCount(res.data.meta?.unreadCount || 0)
            } catch (error) {
                console.error("Failed to load admin notifications", error)
            }
        }

        loadNotifications()
        const interval = window.setInterval(loadNotifications, 30000)
        return () => window.clearInterval(interval)
    }, [])

    const handleLogout = () => {
        localStorage.removeItem("token")
        localStorage.removeItem("role")
        localStorage.removeItem("name")
        navigate("/login")
    }

    const handleNotificationClick = async (notification) => {
        try {
            if (notification.unread) {
                await axiosInstance.post(`/notification/${notification._id}/read`)
                setNotifications((prev) => prev.map((item) => item._id === notification._id ? { ...item, unread: false } : item))
                setUnreadCount((prev) => Math.max(prev - 1, 0))
            }

            if (notification.data?.showroomId) {
                navigate("/admin/showrooms")
                setNotificationOpen(false)
            }
            if (notification.data?.bookingId) {
                navigate("/admin/bookings")
                setNotificationOpen(false)
            }
        } catch (error) {
            console.error("Failed to mark notification read", error)
        }
    }

    const handleMarkAllRead = async () => {
        try {
            await axiosInstance.post("/notification/read-all")
            setNotifications((prev) => prev.map((item) => ({ ...item, unread: false })))
            setUnreadCount(0)
        } catch (error) {
            console.error("Failed to mark notifications read", error)
        }
    }

    return (
        <div className="flex min-h-screen" style={{ fontFamily: "'Syne', sans-serif" }}>
            <div
                className="flex flex-col"
                style={{
                    width: collapsed ? 80 : 270,
                    background: "#0d0d15",
                    borderRight: "1px solid rgba(255,255,255,0.07)",
                    transition: "width 0.25s ease",
                }}
            >
                <div className="flex items-center justify-between px-4 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                    {!collapsed && (
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: "#fbbf24" }}>E-CAR</p>
                            <h1 className="text-white text-lg font-bold">Admin Desk</h1>
                        </div>
                    )}
                    <button type="button" onClick={() => setCollapsed((value) => !value)} className="rounded-xl px-3 py-2 text-white" style={{ background: "rgba(255,255,255,0.06)" }}>
                        ☰
                    </button>
                </div>

                <div className="px-4 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl font-bold text-white" style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)" }}>
                            {initials}
                        </div>
                        {!collapsed && (
                            <div>
                                <p className="font-semibold text-white">{name}</p>
                                <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)", fontFamily: "'DM Sans', sans-serif" }}>Admin account</p>
                            </div>
                        )}
                    </div>
                </div>

                <nav className="flex-1 space-y-2 p-3">
                    {navItems.map((item) => {
                        const active = location.pathname === item.path
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium"
                                style={{
                                    background: active ? "rgba(245,158,11,0.15)" : "transparent",
                                    color: active ? "#fde68a" : "rgba(255,255,255,0.62)",
                                    border: active ? "1px solid rgba(245,158,11,0.24)" : "1px solid transparent",
                                    justifyContent: collapsed ? "center" : "flex-start",
                                }}
                            >
                                <span>{item.icon}</span>
                                {!collapsed && <span>{item.label}</span>}
                            </Link>
                        )
                    })}
                </nav>

                <div className="p-3" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                    <button type="button" onClick={handleLogout} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold" style={{ background: "rgba(239,68,68,0.08)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.18)", justifyContent: collapsed ? "center" : "flex-start" }}>
                        <span>⎋</span>
                        {!collapsed && <span>Sign Out</span>}
                    </button>
                </div>
            </div>

            <div className="flex-1" style={{ background: "#0a0a0f", minHeight: "100vh" }}>
                <div className="flex items-center justify-between px-8 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(13,13,21,0.9)" }}>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: "#fbbf24" }}>Admin</p>
                        <h2 className="text-xl font-bold text-white">{navItems.find((item) => item.path === location.pathname)?.label || "Admin Panel"}</h2>
                    </div>
                    <div className="relative" ref={notificationRef}>
                        <button
                            type="button"
                            onClick={() => setNotificationOpen((prev) => !prev)}
                            className="relative flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold text-white"
                            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                        >
                            N
                            {unreadCount > 0 && (
                                <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                    {unreadCount}
                                </span>
                            )}
                        </button>

                        {notificationOpen && (
                            <div className="absolute right-0 z-50 mt-3 w-96 rounded-[24px] py-2 shadow-2xl" style={{ background: "#161625", border: "1px solid rgba(255,255,255,0.08)" }}>
                                <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                                    <div>
                                        <p className="text-sm font-semibold text-white">Admin Notifications</p>
                                        <p className="text-xs text-white/35">{unreadCount} unread</p>
                                    </div>
                                    <button type="button" onClick={handleMarkAllRead} className="text-xs font-medium text-amber-300">
                                        Mark all read
                                    </button>
                                </div>
                                <div className="max-h-96 overflow-y-auto">
                                    {notifications.length === 0 && (
                                        <div className="px-4 py-6 text-center text-sm text-white/45">
                                            No approval requests or booking alerts yet
                                        </div>
                                    )}
                                    {notifications.map((item) => (
                                        <button
                                            key={item._id}
                                            type="button"
                                            onClick={() => handleNotificationClick(item)}
                                            className="w-full px-4 py-3 text-left"
                                            style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: item.unread ? "rgba(245,158,11,0.08)" : "transparent" }}
                                        >
                                            <p className="text-sm font-semibold text-white">{item.title}</p>
                                            <p className="mt-1 text-xs leading-5 text-white/60" style={{ fontFamily: "'DM Sans', sans-serif" }}>{item.message}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="p-8">
                    <Outlet />
                </div>
            </div>
        </div>
    )
}

export default AdminLayout
