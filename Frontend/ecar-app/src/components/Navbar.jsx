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

    const handleLogout = () => {
        localStorage.removeItem("token")
        localStorage.removeItem("role")
        localStorage.removeItem("name")
        navigate("/login")
    }

    const isActive = (path) => location.pathname === path

    return (
        <>
            <nav className="bg-gray-900 px-8 py-4 sticky top-0 z-50 shadow-lg">
                <div className="flex justify-between items-center">
                    {/* Logo */}
                    <div
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={() => navigate("/")}
                    >
                        <span className="text-2xl">🚗</span>
                        <h1 className="text-xl font-bold text-white tracking-tight">E-CAR</h1>
                    </div>

                    {/* Desktop Links */}
                    <ul className="hidden md:flex gap-8 items-center">
                        <li>
                            <Link
                                to="/"
                                className={`text-sm font-medium transition ${isActive("/") ? "text-blue-400" : "text-gray-300 hover:text-white"}`}
                            >
                                Home
                            </Link>
                        </li>
                        <li>
                            <Link
                                to="/user/search"
                                className={`text-sm font-medium transition ${isActive("/user/search") ? "text-blue-400" : "text-gray-300 hover:text-white"}`}
                            >
                                Search Cars
                            </Link>
                        </li>
                        <li>
                            <Link
                                to="/user/compare"
                                className={`text-sm font-medium transition ${isActive("/user/compare") ? "text-blue-400" : "text-gray-300 hover:text-white"}`}
                            >
                                Compare Cars
                            </Link>
                        </li>
                        <li>
                            <Link
                                to="/user/bookings"
                                className={`text-sm font-medium transition ${isActive("/user/bookings") ? "text-blue-400" : "text-gray-300 hover:text-white"}`}
                            >
                                My Bookings
                            </Link>
                        </li>

                        {/* Profile Dropdown */}
                        <li className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setDropdownOpen(!dropdownOpen)}
                                className="w-10 h-10 rounded-full bg-blue-500 text-white font-bold text-sm flex items-center justify-center hover:bg-blue-400 transition shadow-lg ring-2 ring-blue-400/30"
                            >
                                {initials}
                            </button>

                            {dropdownOpen && (
                                <div className="absolute right-0 mt-3 w-52 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-50">
                                    <div className="px-4 py-3 border-b border-gray-100">
                                        <p className="font-bold text-sm text-gray-900">{name}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">User Account</p>
                                    </div>
                                    <button
                                        onClick={() => { setDropdownOpen(false); navigate("/user/profile") }}
                                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition flex items-center gap-2"
                                    >
                                        👤 My Profile
                                    </button>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition flex items-center gap-2"
                                    >
                                        🚪 Logout
                                    </button>
                                </div>
                            )}
                        </li>
                    </ul>

                    {/* Mobile Hamburger */}
                    <button
                        className="md:hidden text-white text-2xl"
                        onClick={() => setMenuOpen(!menuOpen)}
                    >
                        ☰
                    </button>
                </div>

                {/* Mobile Menu */}
                {menuOpen && (
                    <ul className="md:hidden flex flex-col mt-4 gap-4 pb-2 border-t border-gray-700 pt-4">
                        <li><Link to="/" className="text-gray-300 text-sm" onClick={() => setMenuOpen(false)}>Home</Link></li>
                        <li><Link to="/user/search" className="text-gray-300 text-sm" onClick={() => setMenuOpen(false)}>Search Cars</Link></li>
                        <li><Link to="/user/compare" className="text-gray-300 text-sm" onClick={() => setMenuOpen(false)}>Compare Cars</Link></li>
                        <li><Link to="/user/bookings" className="text-gray-300 text-sm" onClick={() => setMenuOpen(false)}>My Bookings</Link></li>
                        <li><button className="text-red-400 text-sm font-medium" onClick={handleLogout}>🚪 Logout</button></li>
                    </ul>
                )}
            </nav>

            {/* Page Content */}
            <div className="bg-gray-50 min-h-[calc(100vh-72px)]">
                <div className="max-w-7xl mx-auto px-6 py-8">
                    <Outlet />
                </div>
            </div>
        </>
    )
}