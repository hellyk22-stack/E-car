import React, { useState } from "react"
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom"

export const AdminSidebar = () => {
    const [isOpen, setIsOpen] = useState(true)
    const navigate = useNavigate()
    const location = useLocation()

    const isActive = (path) => location.pathname === path

    const handleLogout = () => {
        localStorage.removeItem("token")
        localStorage.removeItem("role")
        localStorage.removeItem("name")
        navigate("/login")
    }

    const name = localStorage.getItem("name") || "Admin"
    const initials = name.charAt(0).toUpperCase()

    const navItems = [
        { icon: "📈", label: "Analytics", path: "/admin/analytics" },
        { icon: "🚗", label: "Manage Cars", path: "/admin/managecars" },
    ]

    return (
        <div className="flex min-h-screen" style={{ fontFamily: "'Syne', sans-serif" }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500&display=swap');
                .sidebar-link { transition: all 0.2s; }
                .sidebar-link:hover { transform: translateX(4px); }
                .toggle-btn { transition: all 0.3s; }
                .toggle-btn:hover { transform: scale(1.1); }
                .noise { background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E"); }
            `}</style>

            {/* Sidebar */}
            <div
                className="relative flex flex-col transition-all duration-300"
                style={{
                    width: isOpen ? "260px" : "72px",
                    background: "#0d0d15",
                    borderRight: "1px solid rgba(255,255,255,0.07)",
                    minHeight: "100vh",
                    flexShrink: 0
                }}
            >
                <div className="noise absolute inset-0" />
                <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(99,102,241,0.05) 0%, transparent 40%)" }} />

                <div className="relative z-10 flex flex-col h-full">
                    {/* Logo + Toggle */}
                    <div className="flex items-center justify-between px-4 h-16" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                        {isOpen && (
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>🚗</div>
                                <span className="text-white font-bold text-sm tracking-tight">E‑CAR Admin</span>
                            </div>
                        )}
                        <button onClick={() => setIsOpen(!isOpen)}
                            className="toggle-btn flex flex-col gap-1 p-2 rounded-lg"
                            style={{ background: "rgba(255,255,255,0.05)", marginLeft: isOpen ? 0 : "auto", marginRight: isOpen ? 0 : "auto" }}>
                            <span className="block w-4 h-0.5 rounded" style={{ background: "rgba(255,255,255,0.6)" }} />
                            <span className="block w-4 h-0.5 rounded" style={{ background: "rgba(255,255,255,0.6)" }} />
                            <span className="block w-4 h-0.5 rounded" style={{ background: "rgba(255,255,255,0.6)" }} />
                        </button>
                    </div>

                    {/* Admin Avatar */}
                    {isOpen && (
                        <div className="px-4 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white"
                                    style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)", flexShrink: 0 }}>
                                    {initials}
                                </div>
                                <div>
                                    <p className="text-white font-semibold text-sm">{name}</p>
                                    <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(245,158,11,0.15)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.25)" }}>
                                        👑 Admin
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                    {!isOpen && (
                        <div className="flex justify-center py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white"
                                style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)" }}>
                                {initials}
                            </div>
                        </div>
                    )}

                    {/* Nav Items */}
                    <nav className="flex-1 px-3 py-4 space-y-1">
                        {isOpen && (
                            <p className="text-xs font-semibold uppercase tracking-widest px-3 mb-3" style={{ color: "rgba(255,255,255,0.25)", fontFamily: "'DM Sans', sans-serif" }}>
                                Management
                            </p>
                        )}
                        {navItems.map((item) => (
                            <Link key={item.path} to={item.path}
                                className={`sidebar-link flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium ${isActive(item.path) ? "" : ""}`}
                                style={{
                                    color: isActive(item.path) ? "#818cf8" : "rgba(255,255,255,0.55)",
                                    background: isActive(item.path) ? "rgba(99,102,241,0.15)" : "transparent",
                                    border: isActive(item.path) ? "1px solid rgba(99,102,241,0.25)" : "1px solid transparent",
                                    fontFamily: "'DM Sans', sans-serif",
                                    justifyContent: isOpen ? "flex-start" : "center"
                                }}>
                                <span className="text-lg">{item.icon}</span>
                                {isOpen && <span>{item.label}</span>}
                            </Link>
                        ))}
                    </nav>

                    {/* Logout */}
                    <div className="px-3 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                        <button onClick={handleLogout}
                            className="sidebar-link w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all"
                            style={{ color: "#f87171", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", fontFamily: "'DM Sans', sans-serif", justifyContent: isOpen ? "flex-start" : "center" }}>
                            <span className="text-lg">🚪</span>
                            {isOpen && "Sign Out"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col" style={{ background: "#0a0a0f", minHeight: "100vh" }}>
                {/* Top bar */}
                <div className="h-16 flex items-center px-8" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(13,13,21,0.9)" }}>
                    <h2 className="text-white font-bold" style={{ letterSpacing: "-0.02em" }}>
                        {navItems.find(n => isActive(n.path))?.label || "Admin Panel"}
                    </h2>
                    <span className="ml-3 px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: "rgba(245,158,11,0.15)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.2)" }}>
                        Admin
                    </span>
                </div>

                <div className="flex-1 p-8">
                    <Outlet />
                </div>
            </div>
        </div>
    )
}
