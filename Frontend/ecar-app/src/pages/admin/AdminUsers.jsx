import React, { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import axiosInstance from '../../utils/axiosInstance'
import { getUserId } from '../../utils/auth'
import { downloadCsvReport } from '../../utils/downloadCsv'
import { getCarImage } from '../../utils/carImageUtils'

const FALLBACK = 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=240&q=80'

const formatDate = (value) => {
    if (!value) return '--'
    return new Date(value).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    })
}

const ActivitySection = ({ title, count, children }) => (
    <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
        <div className="mb-4 flex items-end justify-between gap-3">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <span className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-xs font-medium text-slate-300">
                {count}
            </span>
        </div>
        {children}
    </div>
)

const AdminUsers = () => {
    const currentUserId = getUserId()
    const [users, setUsers] = useState([])
    const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0, limit: 10 })
    const [page, setPage] = useState(1)
    const [searchInput, setSearchInput] = useState('')
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)
    const [savingId, setSavingId] = useState(null)
    const [activityData, setActivityData] = useState(null)
    const [activityLoading, setActivityLoading] = useState(false)

    const fetchUsers = async (nextPage = page, nextSearch = search) => {
        setLoading(true)
        try {
            const res = await axiosInstance.get(`/user/users?page=${nextPage}&limit=10&search=${encodeURIComponent(nextSearch)}`)
            setUsers(res.data.data || [])
            setMeta(res.data.meta || { page: 1, totalPages: 1, total: 0, limit: 10 })
        } catch (err) {
            console.error('Failed to fetch users', err)
            toast.error('Unable to load users right now.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchUsers(page, search)
    }, [page, search])

    const handleSearch = (event) => {
        event.preventDefault()
        setPage(1)
        setSearch(searchInput.trim())
    }

    const handleUserUpdate = async (user, payload) => {
        setSavingId(user._id)
        try {
            const res = await axiosInstance.patch(`/user/users/${user._id}`, payload)
            const updated = res.data.data
            setUsers((prev) => prev.map((item) => (item._id === updated._id ? updated : item)))
            if (activityData?.user?._id === updated._id) {
                setActivityData((prev) => prev ? { ...prev, user: updated } : prev)
            }
            toast.success('User updated.')
        } catch (err) {
            console.error('Failed to update user', err)
            toast.error(err.response?.data?.message || 'Unable to update this user.')
        } finally {
            setSavingId(null)
        }
    }

    const openActivity = async (user) => {
        setActivityLoading(true)
        setActivityData({
            user,
            summary: { wishlistCount: 0, reviewCount: 0, aiSessionCount: 0, aiMessageCount: 0, searchCount: 0, viewCount: 0 },
            wishlist: [],
            reviews: [],
            aiSessions: [],
            searches: [],
            views: [],
        })
        try {
            const res = await axiosInstance.get(`/user/users/${user._id}/activity`)
            setActivityData(res.data.data)
        } catch (err) {
            console.error('Failed to load user activity', err)
            toast.error('Unable to load user activity.')
        } finally {
            setActivityLoading(false)
        }
    }

    return (
        <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
                .users-title { font-family: 'Syne', sans-serif; letter-spacing: -0.03em; }
            `}</style>

            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">Users</p>
                    <h1 className="users-title mt-1 text-3xl font-bold text-white md:text-4xl">Full User Table</h1>
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
                        Search users, review account status, promote admins, inspect cross-feature activity, and export reports to CSV.
                    </p>
                </div>
                <button
                    onClick={() => downloadCsvReport(`/user/users/export/csv?search=${encodeURIComponent(search)}`, 'users-report.csv')}
                    className="rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 px-5 py-3 text-sm font-semibold text-white"
                >
                    Export Users CSV
                </button>
            </div>

            <div className="mb-6 rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
                <form className="flex flex-wrap gap-3" onSubmit={handleSearch}>
                    <input
                        value={searchInput}
                        onChange={(event) => setSearchInput(event.target.value)}
                        placeholder="Search by name or email"
                        className="min-w-[260px] flex-1 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none"
                    />
                    <button type="submit" className="rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 px-5 py-3 text-sm font-semibold text-white">
                        Search
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setSearchInput('')
                            setSearch('')
                            setPage(1)
                        }}
                        className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-medium text-slate-200"
                    >
                        Reset
                    </button>
                </form>
            </div>

            <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                    <p className="text-sm text-slate-400">{meta.total} users found</p>
                    <p className="text-sm text-slate-400">Page {meta.page} of {meta.totalPages}</p>
                </div>

                {loading ? (
                    <div className="py-10 text-sm text-slate-400">Loading users...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px] text-left">
                            <thead>
                                <tr className="border-b border-white/8 text-xs uppercase tracking-[0.18em] text-slate-400">
                                    <th className="px-4 py-4">Name</th>
                                    <th className="px-4 py-4">Email</th>
                                    <th className="px-4 py-4">Role</th>
                                    <th className="px-4 py-4">Status</th>
                                    <th className="px-4 py-4">Joined</th>
                                    <th className="px-4 py-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => {
                                    const isCurrentUser = user._id === currentUserId
                                    const isSaving = savingId === user._id
                                    return (
                                        <tr key={user._id} className="border-b border-white/[0.05]">
                                            <td className="px-4 py-4">
                                                <div>
                                                    <p className="font-semibold text-white">{user.name}</p>
                                                    {isCurrentUser && <p className="mt-1 text-xs text-indigo-300">You</p>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-sm text-slate-300">{user.email}</td>
                                            <td className="px-4 py-4">
                                                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${user.role === 'admin' ? 'bg-amber-500/15 text-amber-300' : 'bg-blue-500/15 text-blue-300'}`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${user.status === 'active' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>
                                                    {user.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-sm text-slate-300">{formatDate(user.createdAt)}</td>
                                            <td className="px-4 py-4">
                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        onClick={() => openActivity(user)}
                                                        className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-white"
                                                    >
                                                        View Activity
                                                    </button>
                                                    <button
                                                        onClick={() => handleUserUpdate(user, { role: user.role === 'admin' ? 'user' : 'admin' })}
                                                        disabled={isSaving || isCurrentUser}
                                                        className="rounded-xl bg-indigo-500/15 px-3 py-2 text-xs font-medium text-indigo-200 disabled:opacity-40"
                                                    >
                                                        {user.role === 'admin' ? 'Make User' : 'Make Admin'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleUserUpdate(user, { status: user.status === 'active' ? 'inactive' : 'active' })}
                                                        disabled={isSaving || isCurrentUser}
                                                        className="rounded-xl bg-emerald-500/15 px-3 py-2 text-xs font-medium text-emerald-200 disabled:opacity-40"
                                                    >
                                                        {user.status === 'active' ? 'Deactivate' : 'Activate'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="mt-5 flex items-center justify-between gap-3">
                    <button
                        onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                        disabled={page <= 1}
                        className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white disabled:opacity-40"
                    >
                        Previous
                    </button>
                    <button
                        onClick={() => setPage((prev) => Math.min(prev + 1, meta.totalPages))}
                        disabled={page >= meta.totalPages}
                        className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white disabled:opacity-40"
                    >
                        Next
                    </button>
                </div>
            </div>

            {activityData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-6 backdrop-blur-sm">
                    <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[28px] border border-white/10 bg-[#0d1020] p-6 shadow-[0_30px_90px_rgba(2,6,23,0.75)]">
                        <div className="mb-6 flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">User Activity</p>
                                <h2 className="users-title mt-1 text-3xl text-white">{activityData.user.name}</h2>
                                <p className="mt-2 text-sm text-slate-400">{activityData.user.email}</p>
                            </div>
                            <button
                                onClick={() => setActivityData(null)}
                                className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white"
                            >
                                Close
                            </button>
                        </div>

                        {activityLoading ? (
                            <div className="text-sm text-slate-400">Loading activity...</div>
                        ) : (
                            <>
                                <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-6">
                                    {[
                                        { label: 'Wishlists', value: activityData.summary.wishlistCount },
                                        { label: 'Reviews', value: activityData.summary.reviewCount },
                                        { label: 'AI Sessions', value: activityData.summary.aiSessionCount },
                                        { label: 'AI Messages', value: activityData.summary.aiMessageCount },
                                        { label: 'Searches', value: activityData.summary.searchCount },
                                        { label: 'Views', value: activityData.summary.viewCount },
                                    ].map((item) => (
                                        <div key={item.label} className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                                            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
                                            <p className="mt-2 text-2xl font-bold text-white">{item.value}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="grid gap-5 xl:grid-cols-2">
                                    <ActivitySection title="Wishlist" count={activityData.summary.wishlistCount}>
                                        <div className="space-y-3">
                                            {activityData.wishlist.length === 0 && <p className="text-sm text-slate-400">No wishlist items yet.</p>}
                                            {activityData.wishlist.map((item) => (
                                                <div key={`${item.car?._id}-${item.savedAt}`} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-slate-950/40 p-3">
                                                    <img
                                                        src={getCarImage(item.car)}
                                                        alt={item.car?.name}
                                                        className="h-14 w-20 rounded-2xl object-cover"
                                                        onError={(event) => { event.target.src = FALLBACK }}
                                                    />
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-semibold text-white">{item.car?.name}</p>
                                                        <p className="mt-1 text-xs text-slate-400">{item.car?.brand} · saved {formatDate(item.savedAt)}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </ActivitySection>

                                    <ActivitySection title="AI Chats" count={activityData.summary.aiSessionCount}>
                                        <div className="space-y-3">
                                            {activityData.aiSessions.length === 0 && <p className="text-sm text-slate-400">No AI sessions yet.</p>}
                                            {activityData.aiSessions.map((session) => (
                                                <div key={session._id} className="rounded-2xl border border-white/8 bg-slate-950/40 p-4">
                                                    <p className="text-sm font-semibold text-white">{session.title}</p>
                                                    <p className="mt-1 text-xs text-slate-400">{session.messageCount} messages · updated {formatDate(session.updatedAt)}</p>
                                                    <p className="mt-3 text-sm leading-6 text-slate-300">{session.preview || 'No preview'}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </ActivitySection>

                                    <ActivitySection title="Reviews" count={activityData.summary.reviewCount}>
                                        <div className="space-y-3">
                                            {activityData.reviews.length === 0 && <p className="text-sm text-slate-400">No reviews yet.</p>}
                                            {activityData.reviews.map((review) => (
                                                <div key={review._id} className="rounded-2xl border border-white/8 bg-slate-950/40 p-4">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <p className="text-sm font-semibold text-white">{review.car?.name}</p>
                                                        <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-300">{review.rating}/5</span>
                                                    </div>
                                                    {review.title && <p className="mt-2 text-sm text-slate-200">{review.title}</p>}
                                                    <p className="mt-2 text-sm leading-6 text-slate-300">{review.comment || 'No written comment.'}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </ActivitySection>

                                    <ActivitySection title="Search History" count={activityData.summary.searchCount}>
                                        <div className="space-y-3">
                                            {activityData.searches.length === 0 && <p className="text-sm text-slate-400">No searches yet.</p>}
                                            {activityData.searches.map((item, index) => (
                                                <div key={`${item.searchedAt}-${index}`} className="rounded-2xl border border-white/8 bg-slate-950/40 p-4">
                                                    <p className="text-sm font-medium text-white">{item.queryText || 'Structured filter search'}</p>
                                                    <p className="mt-2 text-xs leading-6 text-slate-400">
                                                        {[item.brand, item.type, item.fuel, item.transmission, item.priceRangeLabel].filter(Boolean).join(' · ')}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </ActivitySection>

                                    <ActivitySection title="Viewed Cars" count={activityData.summary.viewCount}>
                                        <div className="space-y-3">
                                            {activityData.views.length === 0 && <p className="text-sm text-slate-400">No car views yet.</p>}
                                            {activityData.views.map((item) => (
                                                <div key={item._id} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-slate-950/40 p-3">
                                                    <img
                                                        src={getCarImage(item.car)}
                                                        alt={item.car?.name}
                                                        className="h-14 w-20 rounded-2xl object-cover"
                                                        onError={(event) => { event.target.src = FALLBACK }}
                                                    />
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-semibold text-white">{item.car?.name}</p>
                                                        <p className="mt-1 text-xs text-slate-400">{item.car?.brand} · viewed {formatDate(item.viewedAt)}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </ActivitySection>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

export default AdminUsers
