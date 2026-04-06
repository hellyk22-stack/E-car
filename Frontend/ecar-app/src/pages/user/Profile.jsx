import React from 'react'
import { useNavigate } from 'react-router-dom'
import { getName, getRole, clearAuth } from '../../utils/auth'
import { getWishlistCars } from '../../utils/wishlistApi'

const actionItems = [
    { key: 'dashboard', label: 'Dashboard', sub: 'View your activity and saved progress', route: '/user/dashboard', accent: 'from-blue-500/20 to-indigo-500/10 text-blue-100' },
    { key: 'wishlist', label: 'My Wishlist', sub: 'Keep your favorite cars close', route: '/user/wishlist', accent: 'from-pink-500/20 to-rose-500/10 text-pink-100' },
    { key: 'advisor', label: 'AI Advisor', sub: 'Get premium tailored recommendations', route: '/user/ai', accent: 'from-violet-500/20 to-fuchsia-500/10 text-violet-100' },
]

const Profile = () => {
    const navigate = useNavigate()
    const name = getName() || 'User'
    const role = getRole() || 'user'
    const initials = name.charAt(0).toUpperCase()
    const [wishlistCount, setWishlistCount] = React.useState(0)

    React.useEffect(() => {
        getWishlistCars()
            .then((cars) => setWishlistCount(cars.length))
            .catch((err) => console.error('Failed to fetch wishlist count', err))
    }, [])

    const handleLogout = () => {
        clearAuth()
        navigate('/login')
    }

    const profileStats = [
        { label: 'Saved Cars', value: wishlistCount, accent: 'text-pink-300' },
        { label: 'Account Type', value: role === 'admin' ? 'Admin' : 'User', accent: 'text-blue-300' },
        { label: 'Status', value: 'Active', accent: 'text-emerald-300' },
        { label: 'Member Since', value: '2026', accent: 'text-violet-300' },
    ]

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 px-4 py-10 text-slate-100">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
                .profile-shell { font-family: 'DM Sans', sans-serif; }
                .profile-title { font-family: 'Syne', sans-serif; letter-spacing: -0.03em; }
                .profile-panel { box-shadow: 0 28px 80px rgba(6, 8, 24, 0.45); }
                .profile-card { transition: transform 0.25s ease, border-color 0.25s ease, background-color 0.25s ease, box-shadow 0.25s ease; }
                .profile-card:hover { transform: translateY(-3px); border-color: rgba(129, 140, 248, 0.3); box-shadow: 0 18px 44px rgba(15, 23, 42, 0.28); }
                .profile-action:hover { background: rgba(99, 102, 241, 0.08); }
            `}</style>

            <div className="profile-shell mx-auto max-w-6xl">
                <div className="mb-5">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">Account</p>
                    <p className="max-w-2xl text-base text-slate-300 md:text-lg">
                        A refined account space for your saved cars, preferences, and shortcuts.
                    </p>
                </div>

                <div className="profile-panel overflow-hidden rounded-[28px] border border-white/10 bg-slate-900/65 backdrop-blur-xl">
                    <div className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(129,140,248,0.28),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(236,72,153,0.18),_transparent_28%),linear-gradient(135deg,_rgba(15,23,42,0.92),_rgba(49,46,129,0.82)_55%,_rgba(88,28,135,0.76))] px-6 py-8 md:px-8 md:py-9">
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.07)_1px,transparent_1px)] bg-[size:42px_42px] opacity-10" />
                        <div className="absolute -left-14 top-6 h-36 w-36 rounded-full bg-indigo-400/20 blur-3xl" />
                        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-pink-400/10 blur-3xl" />

                        <div className="relative z-10 flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                                <div className="flex h-24 w-24 items-center justify-center rounded-[28px] border border-white/15 bg-gradient-to-br from-indigo-400 via-violet-500 to-fuchsia-500 text-4xl font-bold text-white shadow-[0_22px_60px_rgba(99,102,241,0.42)]">
                                    {initials}
                                </div>

                                <div className="rounded-[24px] border border-white/12 bg-slate-950/30 px-5 py-4 backdrop-blur-md">
                                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-200/90">My Profile</p>
                                    <h1 className="profile-title text-3xl font-bold text-white md:text-4xl">{name}</h1>
                                    <div className="mt-3 flex flex-wrap items-center gap-2">
                                        <span className="inline-flex items-center rounded-full border border-blue-300/25 bg-blue-400/10 px-3 py-1 text-xs font-semibold text-blue-100">
                                            {role === 'admin' ? 'Admin Account' : 'User Account'}
                                        </span>
                                        <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
                                            Premium member area
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid max-w-full grid-cols-2 gap-3 sm:w-auto">
                                <div className="rounded-[22px] border border-white/12 bg-slate-950/30 px-5 py-4 text-left backdrop-blur-md">
                                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Portfolio</p>
                                    <p className="profile-title mt-2 text-2xl text-white">{wishlistCount}</p>
                                    <p className="text-sm text-slate-300">Cars tracked</p>
                                </div>
                                <div className="rounded-[22px] border border-white/12 bg-slate-950/30 px-5 py-4 text-left backdrop-blur-md">
                                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Status</p>
                                    <p className="profile-title mt-2 text-2xl text-white">Active</p>
                                    <p className="text-sm text-slate-300">All services ready</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="px-6 pb-6 pt-6 md:px-8 md:pb-8">

                        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
                            {profileStats.map((stat) => (
                                <div key={stat.label} className="profile-card rounded-[24px] border border-white/8 bg-white/[0.035] p-5">
                                    <p className={`mb-3 text-xs font-semibold uppercase tracking-[0.18em] ${stat.accent}`}>
                                        {stat.label}
                                    </p>
                                    <p className="profile-title text-2xl font-bold text-white">{stat.value}</p>
                                </div>
                            ))}
                        </div>

                        <div className="grid gap-4 lg:grid-cols-3">
                            {actionItems.map((item) => (
                                <button
                                    key={item.key}
                                    onClick={() => navigate(item.route)}
                                    className="profile-card profile-action flex min-h-[152px] flex-col rounded-[24px] border border-white/8 bg-white/[0.03] p-5 text-left"
                                >
                                    <div className={`mb-5 inline-flex rounded-2xl bg-gradient-to-br px-4 py-2 text-sm font-semibold ${item.accent}`}>
                                        {item.label}
                                    </div>
                                    <p className="mb-2 text-xl font-semibold text-white">{item.label}</p>
                                    <p className="text-sm leading-6 text-slate-400">
                                        {item.key === 'wishlist' ? `${wishlistCount} cars saved and ready to revisit.` : item.sub}
                                    </p>
                                    <span className="mt-auto pt-5 text-sm font-medium text-blue-300">Open</span>
                                </button>
                            ))}
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={handleLogout}
                                className="profile-card rounded-2xl border border-rose-400/25 bg-rose-500/10 px-6 py-3 text-sm font-semibold text-rose-300"
                            >
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Profile
