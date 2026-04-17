import React, { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'

const navItems = [
    { label: 'Dashboard', path: '/showroom/dashboard', icon: '⌂' },
    { label: 'Inventory', path: '/showroom/cars', icon: '🚗' },
    { label: 'Bookings', path: '/showroom/bookings', icon: '📋' },
    { label: 'Availability', path: '/showroom/availability', icon: '🗓' },
    { label: 'Profile', path: '/showroom/profile', icon: '⚙' },
]

const ShowroomLayout = () => {
    const [collapsed, setCollapsed] = useState(false)
    const navigate = useNavigate()
    const location = useLocation()
    const name = localStorage.getItem('name') || 'Showroom'
    const initials = name.charAt(0).toUpperCase()

    const handleLogout = () => {
        localStorage.removeItem('token')
        localStorage.removeItem('role')
        localStorage.removeItem('name')
        navigate('/login')
    }

    return (
        <div className="flex min-h-screen" style={{ fontFamily: "'Syne', sans-serif" }}>
            <div
                className="flex flex-col"
                style={{
                    width: collapsed ? 78 : 270,
                    background: '#0d0d15',
                    borderRight: '1px solid rgba(255,255,255,0.08)',
                    transition: 'width 0.25s ease',
                }}
            >
                <div className="flex items-center justify-between px-4 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {!collapsed && (
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: '#60a5fa' }}>E-CAR</p>
                            <h1 className="text-white text-lg font-bold">Showroom Desk</h1>
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={() => setCollapsed((value) => !value)}
                        className="rounded-xl px-3 py-2 text-white"
                        style={{ background: 'rgba(255,255,255,0.06)' }}
                    >
                        ☰
                    </button>
                </div>

                <div className="px-4 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl font-bold text-white" style={{ background: 'linear-gradient(135deg, #0ea5e9, #2563eb)' }}>
                            {initials}
                        </div>
                        {!collapsed && (
                            <div>
                                <p className="font-semibold text-white">{name}</p>
                                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)', fontFamily: "'DM Sans', sans-serif" }}>Showroom account</p>
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
                                    background: active ? 'rgba(37,99,235,0.18)' : 'transparent',
                                    color: active ? '#bfdbfe' : 'rgba(255,255,255,0.62)',
                                    border: active ? '1px solid rgba(96,165,250,0.25)' : '1px solid transparent',
                                }}
                            >
                                <span className="text-base">{item.icon}</span>
                                {!collapsed && <span>{item.label}</span>}
                            </Link>
                        )
                    })}
                </nav>

                <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold"
                        style={{ background: 'rgba(239,68,68,0.08)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.2)' }}
                    >
                        <span>⎋</span>
                        {!collapsed && <span>Sign Out</span>}
                    </button>
                </div>
            </div>

            <div className="flex-1" style={{ background: 'linear-gradient(180deg, #0a0a0f, #111827)', minHeight: '100vh' }}>
                <div className="flex items-center justify-between px-8 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(13,13,21,0.9)' }}>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: '#93c5fd' }}>Showroom</p>
                        <h2 className="text-xl font-bold text-white">{navItems.find((item) => item.path === location.pathname)?.label || 'Dashboard'}</h2>
                    </div>
                    <button
                        type="button"
                        onClick={() => navigate('/')}
                        className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                        Go to homepage
                    </button>
                </div>
                <div className="p-8">
                    <Outlet />
                </div>
            </div>
        </div>
    )
}

export default ShowroomLayout
