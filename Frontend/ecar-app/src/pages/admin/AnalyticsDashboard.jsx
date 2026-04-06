import React, { useEffect, useMemo, useState } from 'react'
import axiosInstance from '../../utils/axiosInstance'
import { getCarImage } from '../../utils/carImageUtils'

const FALLBACK = 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=300&q=80'

const MiniBarChart = ({ data = [] }) => {
    const max = Math.max(...data.map((item) => item.count || item.value || 0), 1)

    return (
        <div className="flex items-end gap-3">
            {data.map((item) => {
                const value = item.count ?? item.value ?? 0
                return (
                    <div key={item.label} className="flex flex-1 flex-col items-center gap-2">
                        <div className="flex h-44 w-full items-end rounded-2xl border border-white/8 bg-white/[0.03] p-2">
                            <div
                                className="w-full rounded-xl bg-gradient-to-t from-indigo-500 via-violet-500 to-fuchsia-500"
                                style={{ height: `${Math.max((value / max) * 100, value ? 10 : 4)}%` }}
                            />
                        </div>
                        <p className="text-xs font-semibold text-white">{value}</p>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
                    </div>
                )
            })}
        </div>
    )
}

const HorizontalBarList = ({ items = [], empty = 'No data yet' }) => {
    const max = Math.max(...items.map((item) => item.value || 0), 1)

    if (!items.length) {
        return <p className="text-sm text-slate-400">{empty}</p>
    }

    return (
        <div className="space-y-3">
            {items.map((item) => (
                <div key={item.label}>
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-white">{item.label}</p>
                        <p className="text-xs text-slate-400">{item.value}</p>
                    </div>
                    <div className="h-2.5 rounded-full bg-white/[0.05]">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                            style={{ width: `${(item.value / max) * 100}%` }}
                        />
                    </div>
                </div>
            ))}
        </div>
    )
}

const PieChart = ({ items = [] }) => {
    const total = items.reduce((sum, item) => sum + (item.value || 0), 0) || 1
    const colors = ['#818cf8', '#a78bfa', '#f472b6', '#22c55e', '#f59e0b']

    const gradient = items.length
        ? items.reduce((parts, item, index) => {
            const previous = items.slice(0, index).reduce((sum, current) => sum + current.value, 0)
            const start = (previous / total) * 100
            const end = ((previous + item.value) / total) * 100
            return `${parts}${colors[index % colors.length]} ${start}% ${end}%, `
        }, '').slice(0, -2)
        : '#1e293b 0% 100%'

    return (
        <div className="grid gap-5 lg:grid-cols-[220px_1fr] lg:items-center">
            <div className="mx-auto h-52 w-52 rounded-full border border-white/10" style={{ background: `conic-gradient(${gradient})` }}>
                <div className="m-10 flex h-[136px] w-[136px] items-center justify-center rounded-full border border-white/10 bg-slate-950/90 text-center">
                    <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Cars</p>
                        <p className="mt-2 text-3xl font-bold text-white">{total}</p>
                    </div>
                </div>
            </div>
            <div className="space-y-3">
                {items.map((item, index) => (
                    <div key={item.label} className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                        <div className="flex items-center gap-3">
                            <span className="h-3 w-3 rounded-full" style={{ background: colors[index % colors.length] }} />
                            <p className="text-sm font-medium text-white">{item.label}</p>
                        </div>
                        <p className="text-sm text-slate-300">{item.value}</p>
                    </div>
                ))}
            </div>
        </div>
    )
}

const LeaderboardTable = ({ title, items = [], metricLabel }) => (
    <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
        <div className="mb-4 flex items-end justify-between gap-3">
            <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">Leaderboard</p>
                <h3 className="mt-1 text-2xl font-bold text-white" style={{ fontFamily: "'Syne', sans-serif", letterSpacing: '-0.03em' }}>{title}</h3>
            </div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{metricLabel}</p>
        </div>
        <div className="space-y-3">
            {items.length === 0 && <p className="text-sm text-slate-400">No data yet.</p>}
            {items.map((item, index) => (
                <div key={item._id || `${item.name}-${index}`} className="flex items-center gap-4 rounded-2xl border border-white/8 bg-slate-950/40 p-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05] text-sm font-bold text-white">
                        {index + 1}
                    </div>
                    <img
                        src={getCarImage(item)}
                        alt={item.name}
                        className="h-14 w-20 rounded-2xl object-cover"
                        onError={(event) => { event.target.src = FALLBACK }}
                    />
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">{item.name}</p>
                        <p className="mt-1 truncate text-xs text-slate-400">{item.brand} · {item.type}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-lg font-bold text-indigo-300">{item.views ?? item.saves ?? 0}</p>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{metricLabel}</p>
                    </div>
                </div>
            ))}
        </div>
    </div>
)

const AnalyticsDashboard = () => {
    const [dashboard, setDashboard] = useState(null)
    const [mostViewedPeriod, setMostViewedPeriod] = useState('week')
    const [mostViewed, setMostViewed] = useState([])
    const [searchInsights, setSearchInsights] = useState(null)
    const [wishlistLeaderboard, setWishlistLeaderboard] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchAnalytics = async () => {
            setLoading(true)
            try {
                const [dashboardRes, mostViewedRes, searchRes, wishlistRes] = await Promise.all([
                    axiosInstance.get('/analytics/dashboard'),
                    axiosInstance.get('/analytics/most-viewed?period=week'),
                    axiosInstance.get('/analytics/search-insights?period=week'),
                    axiosInstance.get('/analytics/wishlist-leaderboard'),
                ])

                setDashboard(dashboardRes.data.data)
                setMostViewed(mostViewedRes.data.data || [])
                setSearchInsights(searchRes.data.data)
                setWishlistLeaderboard(wishlistRes.data.data || [])
            } catch (err) {
                console.error('Failed to load analytics', err)
            } finally {
                setLoading(false)
            }
        }

        fetchAnalytics()
    }, [])

    useEffect(() => {
        axiosInstance.get(`/analytics/most-viewed?period=${mostViewedPeriod}`)
            .then((res) => setMostViewed(res.data.data || []))
            .catch((err) => console.error('Failed to load most viewed report', err))
    }, [mostViewedPeriod])

    const summaryCards = useMemo(() => {
        if (!dashboard?.totals) return []

        return [
            { label: 'Total Users', value: dashboard.totals.totalUsers, eyebrow: 'Audience', accent: 'text-blue-300' },
            { label: 'Cars Listed', value: dashboard.totals.totalCars, eyebrow: 'Inventory', accent: 'text-violet-300' },
            { label: 'Wishlists', value: dashboard.totals.totalWishlists, eyebrow: 'Demand', accent: 'text-pink-300' },
            { label: 'AI Chats Today', value: dashboard.totals.aiChatsToday, eyebrow: 'Advisor', accent: 'text-emerald-300' },
        ]
    }, [dashboard])

    return (
        <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
                .analytics-title { font-family: 'Syne', sans-serif; letter-spacing: -0.03em; }
            `}</style>

            <div className="mb-8">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">Analytics</p>
                <h1 className="analytics-title mt-1 text-3xl font-bold text-white md:text-4xl">Live Admin Dashboard</h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
                    Real-time visibility into signups, demand signals, car popularity, and what buyers are searching for across the platform.
                </p>
            </div>

            {loading ? (
                <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-8 text-sm text-slate-400">
                    Loading analytics...
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                        {summaryCards.map((card) => (
                            <div key={card.label} className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
                                <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${card.accent}`}>{card.eyebrow}</p>
                                <p className="analytics-title mt-3 text-3xl text-white">{card.value}</p>
                                <p className="mt-2 text-sm text-slate-400">{card.label}</p>
                            </div>
                        ))}
                    </div>

                    <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
                        <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">Growth</p>
                            <h2 className="analytics-title mt-1 text-2xl text-white">Signups Per Day</h2>
                            <p className="mt-2 text-sm text-slate-400">New accounts created over the last 7 days.</p>
                            <div className="mt-6">
                                <MiniBarChart data={dashboard?.signupsByDay || []} />
                            </div>
                        </div>

                        <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Inventory Mix</p>
                            <h2 className="analytics-title mt-1 text-2xl text-white">Car Type Distribution</h2>
                            <p className="mt-2 text-sm text-slate-400">Current active listings split by body type.</p>
                            <div className="mt-6">
                                <PieChart items={dashboard?.carTypeDistribution || []} />
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                        <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
                            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">Report</p>
                                    <h2 className="analytics-title mt-1 text-2xl text-white">Most Viewed Cars</h2>
                                    <p className="mt-2 text-sm text-slate-400">Top 10 car detail pages by view events.</p>
                                </div>
                                <div className="flex gap-2">
                                    {['week', 'month'].map((period) => (
                                        <button
                                            key={period}
                                            onClick={() => setMostViewedPeriod(period)}
                                            className="rounded-xl px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em]"
                                            style={{
                                                background: mostViewedPeriod === period ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.04)',
                                                color: 'white',
                                                border: mostViewedPeriod === period ? 'none' : '1px solid rgba(255,255,255,0.08)',
                                            }}
                                        >
                                            {period}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                {mostViewed.map((car, index) => (
                                    <div key={car._id} className="flex items-center gap-4 rounded-2xl border border-white/8 bg-slate-950/40 p-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05] text-sm font-bold text-white">
                                            {index + 1}
                                        </div>
                                        <img
                                            src={getCarImage(car)}
                                            alt={car.name}
                                            className="h-16 w-24 rounded-2xl object-cover"
                                            onError={(event) => { event.target.src = FALLBACK }}
                                        />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold text-white">{car.name}</p>
                                            <p className="mt-1 truncate text-xs text-slate-400">{car.brand} · {car.type} · {car.fuel}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-indigo-300">{car.views}</p>
                                            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Views</p>
                                        </div>
                                    </div>
                                ))}
                                {mostViewed.length === 0 && <p className="text-sm text-slate-400">No view events recorded yet.</p>}
                            </div>
                        </div>

                        <LeaderboardTable title="Wishlist Leaderboard" items={wishlistLeaderboard} metricLabel="Saves" />
                    </div>

                    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                        <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-300">Demand Signals</p>
                            <h2 className="analytics-title mt-1 text-2xl text-white">Search Keyword Tracker</h2>
                            <p className="mt-2 text-sm text-slate-400">What buyers are filtering for most often this week.</p>

                            <div className="mt-6 grid gap-6 lg:grid-cols-3">
                                <div>
                                    <p className="mb-3 text-xs uppercase tracking-[0.18em] text-slate-400">Brands</p>
                                    <HorizontalBarList items={searchInsights?.brands || []} empty="No brand searches yet." />
                                </div>
                                <div>
                                    <p className="mb-3 text-xs uppercase tracking-[0.18em] text-slate-400">Types</p>
                                    <HorizontalBarList items={searchInsights?.types || []} empty="No type filters yet." />
                                </div>
                                <div>
                                    <p className="mb-3 text-xs uppercase tracking-[0.18em] text-slate-400">Price Ranges</p>
                                    <HorizontalBarList items={searchInsights?.priceRanges || []} empty="No price range data yet." />
                                </div>
                            </div>
                        </div>

                        <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">Recent Activity</p>
                            <h2 className="analytics-title mt-1 text-2xl text-white">Latest Searches</h2>
                            <div className="mt-5 space-y-3">
                                {(searchInsights?.recentSearches || []).map((item, index) => (
                                    <div key={`${item.searchedAt}-${index}`} className="rounded-2xl border border-white/8 bg-slate-950/40 p-4">
                                        <p className="text-sm font-medium text-white">{item.queryText || 'Structured filter search'}</p>
                                        <p className="mt-2 text-xs leading-5 text-slate-400">
                                            {[item.brand, item.type, item.fuel, item.transmission, item.priceRangeLabel].filter(Boolean).join(' · ')}
                                        </p>
                                    </div>
                                ))}
                                {(!searchInsights?.recentSearches || searchInsights.recentSearches.length === 0) && (
                                    <p className="text-sm text-slate-400">No searches logged yet.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AnalyticsDashboard
