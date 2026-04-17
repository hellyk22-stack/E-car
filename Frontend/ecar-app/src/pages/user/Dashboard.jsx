import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axiosInstance from '../../utils/axiosInstance'
import RecentlyViewedStrip from '../../components/user/RecentlyViewedStrip'
import { getCarImage } from '../../utils/carImageUtils'
import { getRecentlyViewedCars } from '../../utils/recentlyViewed'
import { getWishlistCars } from '../../utils/wishlistApi'

const FALLBACK = 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=200&q=80'
const fuelColor = { Petrol: '#f59e0b', Diesel: '#3b82f6', Electric: '#10b981' }

const Dashboard = () => {
    const navigate = useNavigate()
    const name = localStorage.getItem('name') || 'User'
    const initials = name.charAt(0).toUpperCase()
    const [totalCars, setTotalCars] = useState(0)
    const [wishlist, setWishlist] = useState([])
    const [recentlyViewed, setRecentlyViewed] = useState([])
    const [loading, setLoading] = useState(true)
    const [greeting, setGreeting] = useState('Good day')

    useEffect(() => {
        const hour = new Date().getHours()
        if (hour < 12) setGreeting('Good morning')
        else if (hour < 17) setGreeting('Good afternoon')
        else setGreeting('Good evening')

        setRecentlyViewed(getRecentlyViewedCars())

        Promise.all([
            axiosInstance.get('/car/cars'),
            getWishlistCars(),
        ])
            .then(([carsRes, wishlistCars]) => {
                setTotalCars(carsRes.data.data?.length || 0)
                setWishlist(wishlistCars)
            })
            .catch(() => {})
            .finally(() => setLoading(false))
    }, [])

    const stats = [
        { label: 'Cars Available', value: loading ? '--' : totalCars, eyebrow: 'Inventory', accent: 'text-blue-300', glow: 'from-blue-500/20 to-indigo-500/5' },
        { label: 'Saved Cars', value: wishlist.length, eyebrow: 'Collection', accent: 'text-pink-300', glow: 'from-pink-500/20 to-rose-500/5' },
        { label: 'Comparisons', value: parseInt(localStorage.getItem('compareCount') || '0'), eyebrow: 'Insights', accent: 'text-emerald-300', glow: 'from-emerald-500/20 to-teal-500/5' },
        { label: 'AI Chats', value: parseInt(localStorage.getItem('aiChatCount') || '0'), eyebrow: 'Advisor', accent: 'text-amber-300', glow: 'from-amber-500/20 to-orange-500/5' },
    ]

    const quickActions = [
        { label: 'Search Cars', desc: 'Explore the latest curated listings', path: '/user/search', accent: 'from-blue-500/20 to-indigo-500/10 text-blue-100' },
        { label: 'Compare Cars', desc: 'Review specs side by side instantly', path: '/user/compare', accent: 'from-violet-500/20 to-fuchsia-500/10 text-violet-100' },
        { label: 'My Wishlist', desc: `${wishlist.length} saved cars waiting for you`, path: '/user/wishlist', accent: 'from-pink-500/20 to-rose-500/10 text-pink-100' },
        { label: 'AI Advisor', desc: 'Get personalized car suggestions fast', path: '/user/ai', accent: 'from-emerald-500/20 to-teal-500/10 text-emerald-100' },
    ]

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 px-4 py-10 text-slate-100">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
                .dashboard-shell { font-family: 'DM Sans', sans-serif; }
                .dashboard-title { font-family: 'Syne', sans-serif; letter-spacing: -0.03em; }
                .dash-card { transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease, background-color 0.25s ease; }
                .dash-card:hover { transform: translateY(-3px); border-color: rgba(129,140,248,0.28); box-shadow: 0 18px 45px rgba(15,23,42,0.24); }
            `}</style>

            <div className="dashboard-shell mx-auto max-w-6xl">
                <div className="mb-8 overflow-hidden rounded-[28px] border border-white/10 bg-slate-900/65 shadow-[0_28px_80px_rgba(6,8,24,0.45)] backdrop-blur-xl">
                    <div className="relative bg-[radial-gradient(circle_at_top_left,_rgba(129,140,248,0.4),_transparent_28%),linear-gradient(120deg,_rgba(15,23,42,0.35),_rgba(79,70,229,0.18)_50%,_rgba(236,72,153,0.12))] px-6 py-8 md:px-8 md:py-10">
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:38px_38px] opacity-10" />
                        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                            <div className="flex items-start gap-4">
                                <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-gradient-to-br from-indigo-500 to-violet-500 text-4xl font-bold text-white shadow-[0_18px_45px_rgba(99,102,241,0.42)]">
                                    {initials}
                                </div>
                                <div>
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">Dashboard</p>
                                    <h1 className="dashboard-title text-3xl font-bold text-white md:text-4xl">{greeting}, {name}</h1>
                                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
                                        A premium overview of your saved cars, comparisons, and discovery tools.
                                    </p>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Collection</p>
                                <p className="dashboard-title mt-1 text-2xl text-white">{wishlist.length}</p>
                                <p className="text-sm text-slate-400">Saved vehicles</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
                    {stats.map((stat) => (
                        <div key={stat.label} className={`dash-card rounded-[24px] border border-white/8 bg-gradient-to-br ${stat.glow} bg-slate-900/50 p-5`}>
                            <p className={`mb-3 text-xs font-semibold uppercase tracking-[0.18em] ${stat.accent}`}>{stat.eyebrow}</p>
                            <p className="dashboard-title text-3xl text-white">{stat.value}</p>
                            <p className="mt-2 text-sm text-slate-400">{stat.label}</p>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        <div className="mb-4 flex items-end justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">Shortcuts</p>
                                <h2 className="dashboard-title mt-1 text-2xl text-white">Quick Actions</h2>
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            {quickActions.map((action) => (
                                <button
                                    key={action.label}
                                    onClick={() => navigate(action.path)}
                                    className="dash-card flex min-h-[190px] flex-col rounded-[24px] border border-white/8 bg-white/[0.03] p-5 text-left"
                                >
                                    <div className={`mb-6 inline-flex rounded-2xl bg-gradient-to-br px-4 py-2 text-sm font-semibold ${action.accent}`}>
                                        {action.label}
                                    </div>
                                    <p className="mb-2 text-xl font-semibold text-white">{action.label}</p>
                                    <p className="text-sm leading-6 text-slate-400">{action.desc}</p>
                                    <span className="mt-auto pt-6 text-sm font-medium text-blue-300">Open</span>
                                </button>
                            ))}
                        </div>

                        <div className="mt-6 rounded-[24px] border border-amber-400/15 bg-amber-500/8 p-5">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">Premium Tip</p>
                            <p className="text-sm leading-6 text-slate-300">
                                Use <span className="font-semibold text-white">Compare Cars</span> for a cleaner spec review, then save the strongest options to your wishlist before making a final choice.
                            </p>
                        </div>
                    </div>

                    <div>
                        <div className="mb-4 flex items-end justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-300">Saved</p>
                                <h2 className="dashboard-title mt-1 text-2xl text-white">Wishlist</h2>
                            </div>
                            {wishlist.length > 0 && (
                                <button onClick={() => navigate('/user/wishlist')} className="text-sm font-medium text-blue-300">
                                    View all
                                </button>
                            )}
                        </div>

                        {wishlist.length === 0 ? (
                            <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-6 text-center">
                                <p className="dashboard-title text-2xl text-white">No saved cars yet</p>
                                <p className="mt-2 text-sm leading-6 text-slate-400">Start exploring and build a shortlist of cars you love.</p>
                                <button
                                    onClick={() => navigate('/user/search')}
                                    className="mt-5 rounded-2xl bg-gradient-to-r from-blue-500 to-violet-500 px-5 py-3 text-sm font-semibold text-white"
                                >
                                    Browse Cars
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {wishlist.slice(0, 4).map((car) => (
                                    <button
                                        key={car._id}
                                        onClick={() => navigate(`/user/car/${car._id}`)}
                                        className="dash-card flex w-full items-center gap-3 rounded-[22px] border border-white/8 bg-white/[0.03] p-3 text-left"
                                    >
                                        <img
                                            src={getCarImage(car)}
                                            alt={car.name}
                                            className="h-14 w-14 rounded-2xl object-cover"
                                            onError={(e) => { e.target.src = FALLBACK }}
                                        />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold text-white">{car.name}</p>
                                            <p className="mt-1 truncate text-xs text-slate-400">
                                                {car.brand} · <span style={{ color: fuelColor[car.fuel] || '#ffffff' }}>{car.fuel}</span>
                                            </p>
                                        </div>
                                        <p className="dashboard-title text-lg text-blue-300">
                                            Rs {(car.price / 100000).toFixed(1)}L
                                        </p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-8">
                    <RecentlyViewedStrip cars={recentlyViewed} title="Recently Viewed" eyebrow="Jump Back In" />
                </div>
            </div>
        </div>
    )
}

export default Dashboard