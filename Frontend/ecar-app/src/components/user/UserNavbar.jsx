import React, { useState, useRef, useEffect } from "react"
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom"

export const UserNavbar = () => {
    const [menuOpen, setMenuOpen] = useState(false)
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const navigate = useNavigate()
    const location = useLocation()
    const dropdownRef = useRef(null)

    const name = localStorage.getItem("name") || "User"
    const initials = name.charAt(0).toUpperCase()

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    // Close mobile menu on route change
    useEffect(() => { setMenuOpen(false) }, [location.pathname])

    const handleLogout = () => {
        localStorage.removeItem("token")
        localStorage.removeItem("role")
        localStorage.removeItem("name")
        navigate("/login")
    }

    const isActive = (path) => location.pathname === path

    const navLinks = [
        { to: "/", label: "Home" },
        { to: "/user/search", label: "Search Cars" },
        { to: "/user/compare", label: "Compare" },
    ]

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500&display=swap');
                .nav-link { position: relative; transition: color 0.2s; font-family: 'DM Sans', sans-serif; }
                .nav-link::after { content: ''; position: absolute; bottom: -4px; left: 0; right: 0; height: 2px; background: #6366f1; border-radius: 2px; transform: scaleX(0); transform-origin: center; transition: transform 0.25s cubic-bezier(0.4,0,0.2,1); }
                .nav-link.active::after, .nav-link:hover::after { transform: scaleX(1); }
                .dropdown-item { transition: all 0.15s; }
                .dropdown-item:hover { transform: translateX(3px); }
                .avatar-btn { transition: all 0.2s; }
                .avatar-btn:hover { transform: scale(1.08); }
                @keyframes dropIn { from { opacity: 0; transform: translateY(-8px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
                .drop-in { animation: dropIn 0.2s cubic-bezier(0.4,0,0.2,1) forwards; }
                @keyframes slideDown { from { opacity: 0; max-height: 0; } to { opacity: 1; max-height: 300px; } }
                .slide-down { animation: slideDown 0.3s ease forwards; overflow: hidden; }
            `}</style>

            <nav style={{ background: "rgba(13,13,21,0.95)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)", fontFamily: "'Syne', sans-serif" }}
                className="px-6 py-0 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto flex items-center justify-between h-16">
                    {/* Logo */}
                    <div className="flex items-center gap-2.5 cursor-pointer group" onClick={() => navigate("/")}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base transition-transform group-hover:scale-110" style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>🚗</div>
                        <span className="text-white font-bold text-lg tracking-tight">E‑CAR</span>
                    </div>

                    {/* Desktop Links */}
                    <ul className="hidden md:flex items-center gap-8">
                        {navLinks.map(({ to, label }) => (
                            <li key={to}>
                                <Link
                                    to={to}
                                    className={`nav-link text-sm font-medium pb-1 ${isActive(to) ? "active text-white" : "text-gray-400 hover:text-white"}`}
                                >
                                    {label}
                                </Link>
                            </li>
                        ))}

                        {/* Wishlist quick link */}
                        <li>
                            <Link to="/user/wishlist"
                                className={`nav-link text-sm font-medium pb-1 flex items-center gap-1.5 ${isActive("/user/wishlist") ? "active text-white" : "text-gray-400 hover:text-white"}`}>
                                <span style={{ fontSize: 13 }}>❤️</span> Wishlist
                            </Link>
                        </li>

                        {/* Avatar Dropdown */}
                        <li className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setDropdownOpen(!dropdownOpen)}
                                className="avatar-btn w-9 h-9 rounded-full text-white font-bold text-sm flex items-center justify-center ring-2 ring-offset-2 ring-offset-transparent"
                                style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", ringColor: "rgba(99,102,241,0.5)" }}
                            >
                                {initials}
                            </button>

                            {dropdownOpen && (
                                <div className="drop-in absolute right-0 mt-3 w-56 rounded-2xl py-2 shadow-2xl z-50"
                                    style={{ background: "#161625", border: "1px solid rgba(255,255,255,0.08)" }}>
                                    <div className="px-4 py-3 mb-1" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>{initials}</div>
                                            <div>
                                                <p className="text-white text-sm font-semibold leading-tight">{name}</p>
                                                <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>User Account</p>
                                            </div>
                                        </div>
                                    </div>
                                    {[
                                        { icon: "👤", label: "My Profile", action: () => { setDropdownOpen(false); navigate("/user/profile") } },
                                        { icon: "❤️", label: "My Wishlist", action: () => { setDropdownOpen(false); navigate("/user/wishlist") } },
                                        { icon: "📊", label: "Dashboard", action: () => { setDropdownOpen(false); navigate("/user/dashboard") } },
                                    ].map((item, i) => (
                                        <button key={i} onClick={item.action}
                                            className="dropdown-item w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5"
                                            style={{ color: "rgba(255,255,255,0.7)", fontFamily: "'DM Sans', sans-serif" }}
                                            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                            <span>{item.icon}</span> {item.label}
                                        </button>
                                    ))}
                                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: 4, paddingTop: 4 }}>
                                        <button onClick={handleLogout}
                                            className="dropdown-item w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5"
                                            style={{ color: "#f87171", fontFamily: "'DM Sans', sans-serif" }}
                                            onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.08)"}
                                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                            <span>🚪</span> Sign Out
                                        </button>
                                    </div>
                                </div>
                            )}
                        </li>
                    </ul>

                    {/* Mobile Hamburger */}
                    <button className="md:hidden flex flex-col gap-1.5 p-1" onClick={() => setMenuOpen(!menuOpen)}>
                        <span className="block w-6 h-0.5 transition-all" style={{ background: menuOpen ? "#6366f1" : "white", transform: menuOpen ? "rotate(45deg) translateY(8px)" : "none" }} />
                        <span className="block w-6 h-0.5" style={{ background: menuOpen ? "transparent" : "white", opacity: menuOpen ? 0 : 1 }} />
                        <span className="block w-6 h-0.5 transition-all" style={{ background: menuOpen ? "#6366f1" : "white", transform: menuOpen ? "rotate(-45deg) translateY(-8px)" : "none" }} />
                    </button>
                </div>

                {/* Mobile Menu */}
                {menuOpen && (
                    <div className="slide-down md:hidden pb-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                        <div className="px-2 pt-4 space-y-1">
                            {[...navLinks, { to: "/user/wishlist", label: "❤️ Wishlist" }, { to: "/user/dashboard", label: "📊 Dashboard" }, { to: "/user/profile", label: "👤 Profile" }].map(({ to, label }) => (
                                <Link key={to} to={to}
                                    className="block px-4 py-2.5 rounded-xl text-sm transition-colors"
                                    style={{ color: isActive(to) ? "#818cf8" : "rgba(255,255,255,0.65)", background: isActive(to) ? "rgba(99,102,241,0.12)" : "transparent", fontFamily: "'DM Sans', sans-serif" }}>
                                    {label}
                                </Link>
                            ))}
                            <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 rounded-xl text-sm mt-2"
                                style={{ color: "#f87171", background: "rgba(239,68,68,0.08)", fontFamily: "'DM Sans', sans-serif" }}>
                                🚪 Sign Out
                            </button>
                        </div>
                    </div>
                )}
            </nav>

            {/* Page Content */}
            <div style={{ background: "#0a0a0f", minHeight: "calc(100vh - 64px)" }}>
                <Outlet />
            </div>
        </>
    )
}
