import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import axiosInstance from '../../utils/axiosInstance'
import { daysUntilExpiry, fetchSubscriptionStatus, formatPlanName } from '../../utils/subscription'

export const UserNavbar = () => {
    const [menuOpen, setMenuOpen] = useState(false)
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const [notificationOpen, setNotificationOpen] = useState(false)
    const [notifications, setNotifications] = useState([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [subscription, setSubscription] = useState(null)
    const navigate = useNavigate()
    const location = useLocation()
    const dropdownRef = useRef(null)
    const notificationRef = useRef(null)

    const name = localStorage.getItem('name') || 'User'
    const initials = name.charAt(0).toUpperCase()

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false)
            }
            if (notificationRef.current && !notificationRef.current.contains(event.target)) {
                setNotificationOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    useEffect(() => {
        setMenuOpen(false)
    }, [location.pathname])

    useEffect(() => {
        if (!localStorage.getItem('token')) return undefined

        const loadHeaderData = async () => {
            try {
                const [notificationRes, status] = await Promise.all([
                    axiosInstance.get('/notification/my'),
                    fetchSubscriptionStatus(),
                ])
                setNotifications(notificationRes.data.data || [])
                setUnreadCount(notificationRes.data.meta?.unreadCount || 0)
                setSubscription(status)
            } catch (error) {
                console.error('Failed to fetch header data', error)
            }
        }

        loadHeaderData()
        const interval = window.setInterval(loadHeaderData, 30000)
        return () => window.clearInterval(interval)
    }, [])

    const handleLogout = () => {
        localStorage.removeItem('token')
        localStorage.removeItem('role')
        localStorage.removeItem('name')
        navigate('/login')
    }

    const isActive = (path) => location.pathname === path
    const expiryDays = daysUntilExpiry(subscription?.planExpiry)
    const showExpiryBanner = typeof expiryDays === 'number' && expiryDays >= 0 && expiryDays <= 3 && subscription?.plan !== 'explorer'

    const handleNotificationClick = async (notification) => {
        try {
            if (notification.unread) {
                await axiosInstance.post(`/notification/${notification._id}/read`)
                setNotifications((prev) => prev.map((item) => item._id === notification._id ? { ...item, unread: false } : item))
                setUnreadCount((prev) => Math.max(prev - 1, 0))
            }
            if (notification.data?.bookingId) {
                navigate(`/user/bookings/${notification.data.bookingId}`)
                setNotificationOpen(false)
            }
        } catch (error) {
            console.error('Failed to mark notification read', error)
        }
    }

    const handleMarkAllRead = async () => {
        try {
            await axiosInstance.post('/notification/read-all')
            setNotifications((prev) => prev.map((item) => ({ ...item, unread: false })))
            setUnreadCount(0)
        } catch (error) {
            console.error('Failed to mark all notifications read', error)
        }
    }

    const navLinks = useMemo(() => [
        { to: '/', label: 'Home' },
        { to: '/user/search', label: 'Search Cars' },
        { to: '/user/compare', label: 'Compare' },
        { to: '/user/showrooms', label: 'Showrooms' },
        { to: '/user/bookings', label: 'Test Drives' },
        { to: '/user/pricing', label: 'Pricing' },
    ], [])

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500&display=swap');
                .nav-link { position: relative; transition: color 0.2s; font-family: 'DM Sans', sans-serif; }
                .nav-link::after { content: ''; position: absolute; bottom: -4px; left: 0; right: 0; height: 2px; background: #6366f1; border-radius: 2px; transform: scaleX(0); transform-origin: center; transition: transform 0.25s cubic-bezier(0.4,0,0.2,1); }
                .nav-link.active::after, .nav-link:hover::after { transform: scaleX(1); }
            `}</style>

            {showExpiryBanner && (
                <div className="px-6 py-3 text-sm text-amber-100" style={{ background: 'rgba(245,158,11,0.18)', borderBottom: '1px solid rgba(245,158,11,0.25)', fontFamily: "'DM Sans', sans-serif" }}>
                    Your {formatPlanName(subscription?.plan)} plan expires in {expiryDays} day{expiryDays === 1 ? '' : 's'}.{' '}
                    <Link to="/user/pricing" className="font-semibold text-white underline">Renew</Link>
                </div>
            )}

            <nav style={{ background: 'rgba(13,13,21,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)', fontFamily: "'Syne', sans-serif" }} className="sticky top-0 z-50 px-6 py-0">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between">
                    <div className="group flex cursor-pointer items-center gap-2.5" onClick={() => navigate('/')}>
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg text-base transition-transform group-hover:scale-110" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>E</div>
                        <span className="text-lg font-bold tracking-tight text-white">E-CAR</span>
                    </div>

                    <ul className="hidden items-center gap-8 md:flex">
                        {navLinks.map(({ to, label }) => (
                            <li key={to}>
                                <Link to={to} className={`nav-link pb-1 text-sm font-medium ${isActive(to) ? 'active text-white' : 'text-gray-400 hover:text-white'}`}>
                                    {label}
                                </Link>
                            </li>
                        ))}
                        <li>
                            <Link to="/user/wishlist" className={`nav-link pb-1 text-sm font-medium ${isActive('/user/wishlist') ? 'active text-white' : 'text-gray-400 hover:text-white'}`}>
                                Wishlist
                            </Link>
                        </li>
                        <li className="relative" ref={notificationRef}>
                            <button
                                onClick={() => setNotificationOpen((prev) => !prev)}
                                className="relative flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-white"
                                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', fontFamily: "'DM Sans', sans-serif" }}
                                title="Notifications"
                            >
                                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 17a2 2 0 0 0 4 0" />
                                </svg>
                                {unreadCount > 0 && (
                                    <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                        {unreadCount}
                                    </span>
                                )}
                            </button>

                            {notificationOpen && (
                                <div className="absolute right-0 z-50 mt-3 w-80 rounded-2xl py-2 shadow-2xl" style={{ background: '#161625', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                        <div>
                                            <p className="text-sm font-semibold text-white">Notifications</p>
                                            <p className="text-xs text-white/35">{unreadCount} unread</p>
                                        </div>
                                        <button onClick={handleMarkAllRead} className="text-xs font-medium text-indigo-300">Mark all read</button>
                                    </div>
                                    <div className="max-h-80 overflow-y-auto">
                                        {notifications.length === 0 && (
                                            <div className="px-4 py-6 text-center text-sm text-white/45" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                                No notifications yet
                                            </div>
                                        )}
                                        {notifications.map((item) => (
                                            <button
                                                key={item._id}
                                                onClick={() => handleNotificationClick(item)}
                                                className="w-full px-4 py-3 text-left"
                                                style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: item.unread ? 'rgba(99,102,241,0.08)' : 'transparent' }}
                                            >
                                                <p className="text-sm font-semibold text-white">{item.title}</p>
                                                <p className="mt-1 text-xs leading-5 text-white/60" style={{ fontFamily: "'DM Sans', sans-serif" }}>{item.message}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </li>
                        <li className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setDropdownOpen((prev) => !prev)}
                                className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white"
                                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                            >
                                {initials}
                            </button>

                            {dropdownOpen && (
                                <div className="absolute right-0 z-50 mt-3 w-64 rounded-2xl py-2 shadow-2xl" style={{ background: '#161625', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                        <p className="text-sm font-semibold text-white">{name}</p>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-semibold text-slate-200">
                                                {formatPlanName(subscription?.plan)}
                                            </span>
                                            <span className="rounded-full border border-sky-300/20 bg-sky-400/10 px-3 py-1 text-xs font-semibold text-sky-100">
                                                {subscription?.limits?.smartCompareLimit || 3} car Smart Compare
                                            </span>
                                        </div>
                                    </div>
                                    {[
                                        { label: 'My Profile', path: '/user/profile' },
                                        { label: 'Subscription', path: '/user/subscription' },
                                        { label: 'My Wishlist', path: '/user/wishlist' },
                                        { label: 'Dashboard', path: '/user/dashboard' },
                                    ].map((item) => (
                                        <button
                                            key={item.path}
                                            onClick={() => { setDropdownOpen(false); navigate(item.path) }}
                                            className="w-full px-4 py-2.5 text-left text-sm text-white/75 hover:bg-white/[0.05]"
                                            style={{ fontFamily: "'DM Sans', sans-serif" }}
                                        >
                                            {item.label}
                                        </button>
                                    ))}
                                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 4, paddingTop: 4 }}>
                                        <button onClick={handleLogout} className="w-full px-4 py-2.5 text-left text-sm text-rose-300 hover:bg-rose-500/10" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                            Sign Out
                                        </button>
                                    </div>
                                </div>
                            )}
                        </li>
                    </ul>

                    <button className="flex flex-col gap-1.5 p-1 md:hidden" onClick={() => setMenuOpen((prev) => !prev)}>
                        <span className="block h-0.5 w-6" style={{ background: 'white' }} />
                        <span className="block h-0.5 w-6" style={{ background: 'white' }} />
                        <span className="block h-0.5 w-6" style={{ background: 'white' }} />
                    </button>
                </div>

                {menuOpen && (
                    <div className="pb-4 md:hidden" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="space-y-1 px-2 pt-4">
                            {[...navLinks, { to: '/user/wishlist', label: 'Wishlist' }, { to: '/user/subscription', label: 'Subscription' }, { to: '/user/dashboard', label: 'Dashboard' }, { to: '/user/profile', label: 'Profile' }].map(({ to, label }) => (
                                <Link
                                    key={to}
                                    to={to}
                                    className="block rounded-xl px-4 py-2.5 text-sm"
                                    style={{ color: isActive(to) ? '#818cf8' : 'rgba(255,255,255,0.65)', background: isActive(to) ? 'rgba(99,102,241,0.12)' : 'transparent', fontFamily: "'DM Sans', sans-serif" }}
                                >
                                    {label}
                                </Link>
                            ))}
                            <button onClick={handleLogout} className="mt-2 w-full rounded-xl px-4 py-2.5 text-left text-sm text-rose-300" style={{ background: 'rgba(239,68,68,0.08)', fontFamily: "'DM Sans', sans-serif" }}>
                                Sign Out
                            </button>
                        </div>
                    </div>
                )}
            </nav>

            <div style={{ background: '#0a0a0f', minHeight: 'calc(100vh - 64px)' }}>
                <Outlet />
            </div>
        </>
    )
}
