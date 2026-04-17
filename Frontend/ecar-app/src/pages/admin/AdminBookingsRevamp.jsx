import React, { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import axiosInstance from '../../utils/axiosInstance'
import Pagination from '../../components/shared/Pagination'
import {
    bookingTypeLabels,
    formatDateTimeLabel,
    getBookingLocationLabel,
    getBookingLocationTitle,
    getStatusTone,
    statusLabels,
} from '../../utils/bookingUtils'

const statKeys = [
    ['total', 'Total'],
    ['pending', 'Pending'],
    ['confirmed', 'Confirmed'],
    ['completed', 'Completed'],
    ['cancelled', 'Cancelled'],
]

const buildParams = (filters, page) => {
    const params = new URLSearchParams({ page: String(page), limit: '10' })

    Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value)
    })

    return params.toString()
}

const AdminBookingView = ({ booking, onClose }) => {
    if (!booking) return null

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4" style={{ background: 'rgba(2,6,23,0.78)', backdropFilter: 'blur(8px)' }}>
            <div className="w-full max-w-3xl rounded-[28px] p-6" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: '#fbbf24' }}>Booking View</p>
                        <h2 className="mt-2 text-2xl font-bold text-white">{booking.bookingId}</h2>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-2xl px-4 py-2 text-sm font-semibold text-white" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        Close
                    </button>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.45)' }}>Customer</p>
                        <p className="mt-3 text-white">{booking.userDetails?.fullName || booking.user?.name || '--'}</p>
                        <p className="mt-2 text-white/65">{booking.userDetails?.phone || '--'}</p>
                        <p className="mt-1 text-white/55">{booking.user?.email || '--'}</p>
                    </div>
                    <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.45)' }}>Car & Schedule</p>
                        <p className="mt-3 text-white">{booking.car?.name || '--'}</p>
                        <p className="mt-2 text-white/65">{formatDateTimeLabel(booking.scheduledDate, booking.scheduledTime)}</p>
                        <p className="mt-1 text-white/55">{bookingTypeLabels[booking.bookingType] || booking.bookingType}</p>
                    </div>
                    <div className="rounded-2xl p-5 md:col-span-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.45)' }}>{getBookingLocationTitle(booking)}</p>
                        <p className="mt-3 text-white">{getBookingLocationLabel(booking)}</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

const AdminBookingsRevamp = () => {
    const [stats, setStats] = useState({})
    const [bookings, setBookings] = useState([])
    const [showrooms, setShowrooms] = useState([])
    const [page, setPage] = useState(1)
    const [meta, setMeta] = useState({ totalPages: 1 })
    const [loading, setLoading] = useState(true)
    const [showroomsLoading, setShowroomsLoading] = useState(true)
    const [filters, setFilters] = useState({ status: '', fromDate: '', toDate: '', showroom: '', bookingType: '' })
    const [actionLoadingId, setActionLoadingId] = useState('')
    const [selectedBooking, setSelectedBooking] = useState(null)
    const [errorMessage, setErrorMessage] = useState('')

    const queryString = useMemo(() => buildParams(filters, page), [filters, page])

    const showLoadErrorToast = (message, retry) => {
        toast.dismiss('admin-bookings-load-error')
        toast.error(
            <div className="space-y-3">
                <p className="text-sm text-white">{message}</p>
                <button
                    type="button"
                    onClick={() => {
                        toast.dismiss('admin-bookings-load-error')
                        retry()
                    }}
                    className="rounded-xl px-3 py-2 text-xs font-semibold text-white"
                    style={{ background: 'rgba(255,255,255,0.08)' }}
                >
                    Retry
                </button>
            </div>,
            { toastId: 'admin-bookings-load-error', autoClose: false, closeOnClick: false }
        )
    }

    const loadShowrooms = async () => {
        setShowroomsLoading(true)
        try {
            const res = await axiosInstance.get('/admin/showrooms?limit=100&status=approved')
            setShowrooms(res.data.data || [])
        } catch (error) {
            console.error('Failed to load showrooms', error)
        } finally {
            setShowroomsLoading(false)
        }
    }

    const loadData = async () => {
        setLoading(true)
        setErrorMessage('')
        try {
            const [statsRes, bookingsRes] = await Promise.all([
                axiosInstance.get(`/admin/bookings/stats?${buildParams(filters, 1)}`),
                axiosInstance.get(`/admin/bookings?${queryString}`),
            ])
            setStats(statsRes.data.data || {})
            setBookings(bookingsRes.data.data || [])
            setMeta(bookingsRes.data.meta || { totalPages: 1 })
        } catch (error) {
            console.error('Failed to load admin bookings', error)
            const message = error.response?.data?.message || 'Unable to load bookings right now.'
            setErrorMessage(message)
            showLoadErrorToast(message, loadData)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadShowrooms()
    }, [])

    useEffect(() => {
        loadData()
    }, [queryString])

    const updateBookingStatus = async (bookingId, status) => {
        setActionLoadingId(`${bookingId}:${status}`)
        try {
            await axiosInstance.patch(`/admin/bookings/${bookingId}`, { status })
            toast.success(`Booking marked ${status}.`)
            await loadData()
        } catch (error) {
            toast.error(error.response?.data?.message || `Unable to mark booking ${status}.`)
        } finally {
            setActionLoadingId('')
        }
    }

    const clearFilters = () => {
        setPage(1)
        setFilters({ status: '', fromDate: '', toDate: '', showroom: '', bookingType: '' })
    }

    return (
        <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
            <div className="mb-8">
                <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: '#fbbf24' }}>System bookings</p>
                <h1 className="mt-2 text-3xl font-bold text-white" style={{ fontFamily: "'Syne', sans-serif" }}>Incoming Bookings</h1>
            </div>

            <div className="mb-6 flex flex-wrap items-end gap-3">
                <select value={filters.status} onChange={(event) => { setPage(1); setFilters((prev) => ({ ...prev, status: event.target.value })) }} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none">
                    <option value="">All statuses</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="rejected">Rejected</option>
                </select>
                <input type="date" value={filters.fromDate} onChange={(event) => { setPage(1); setFilters((prev) => ({ ...prev, fromDate: event.target.value })) }} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" />
                <input type="date" value={filters.toDate} onChange={(event) => { setPage(1); setFilters((prev) => ({ ...prev, toDate: event.target.value })) }} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" />
                {showroomsLoading ? (
                    <div className="h-[50px] w-56 animate-pulse rounded-2xl bg-white/5" />
                ) : (
                    <select value={filters.showroom} onChange={(event) => { setPage(1); setFilters((prev) => ({ ...prev, showroom: event.target.value })) }} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none">
                        <option value="">All showrooms</option>
                        {showrooms.map((showroom) => (
                            <option key={showroom._id} value={showroom._id}>{showroom.name}</option>
                        ))}
                    </select>
                )}
                <select value={filters.bookingType} onChange={(event) => { setPage(1); setFilters((prev) => ({ ...prev, bookingType: event.target.value })) }} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none">
                    <option value="">All types</option>
                    <option value="home_delivery">Home drive</option>
                    <option value="at_showroom">Showroom drive</option>
                </select>
                <button type="button" onClick={clearFilters} className="rounded-2xl px-4 py-3 text-sm font-semibold text-white" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    Clear filters
                </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                {statKeys.map(([key, label]) => (
                    <div key={key} className="rounded-[28px] p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.45)' }}>{label}</p>
                        <p className="mt-3 text-3xl font-black text-white">{loading ? '--' : stats[key] || 0}</p>
                    </div>
                ))}
            </div>

            <div className="mt-8 rounded-[28px] p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {loading ? (
                    <div className="space-y-3">
                        {Array.from({ length: 6 }, (_, index) => (
                            <div key={index} className="h-16 animate-pulse rounded-2xl bg-white/5" />
                        ))}
                    </div>
                ) : errorMessage ? (
                    <div className="rounded-2xl border border-dashed border-red-400/20 px-6 py-12 text-center">
                        <p className="text-white text-lg font-semibold">{errorMessage}</p>
                        <button type="button" onClick={loadData} className="mt-5 rounded-2xl px-5 py-3 text-sm font-semibold text-white" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            Retry
                        </button>
                    </div>
                ) : bookings.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center">
                        <p className="text-white text-lg font-semibold">No bookings matched these filters.</p>
                        <div className="mt-5 flex flex-wrap justify-center gap-3">
                            <button type="button" onClick={clearFilters} className="rounded-2xl px-5 py-3 text-sm font-semibold text-white" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                Clear filters
                            </button>
                            <button type="button" onClick={loadData} className="rounded-2xl px-5 py-3 text-sm font-semibold text-white" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                Retry
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                    {['Booking ID', 'Customer name', 'Car model', 'Type', 'Schedule', 'Status', 'Actions'].map((head) => (
                                        <th key={head} className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                                            {head}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {bookings.map((booking) => {
                                    const tone = getStatusTone(booking.status)
                                    return (
                                        <tr key={booking._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <td className="px-3 py-4 text-white">{booking.bookingId}</td>
                                            <td className="px-3 py-4 text-white">
                                                <p>{booking.userDetails?.fullName || booking.user?.name || '--'}</p>
                                                <p className="mt-1 text-xs text-white/45">{getBookingLocationTitle(booking)}: {getBookingLocationLabel(booking)}</p>
                                            </td>
                                            <td className="px-3 py-4 text-white">{booking.car?.name || '--'}</td>
                                            <td className="px-3 py-4 text-white">{bookingTypeLabels[booking.bookingType] || booking.bookingType}</td>
                                            <td className="px-3 py-4 text-white/65">{formatDateTimeLabel(booking.scheduledDate, booking.scheduledTime)}</td>
                                            <td className="px-3 py-4">
                                                <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: tone.bg, border: `1px solid ${tone.border}`, color: tone.color }}>
                                                    {statusLabels[booking.status] || booking.status}
                                                </span>
                                            </td>
                                            <td className="px-3 py-4">
                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedBooking(booking)}
                                                        className="rounded-xl px-3 py-2 text-xs font-semibold text-white"
                                                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                                                    >
                                                        View
                                                    </button>
                                                    {booking.status === 'pending' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => updateBookingStatus(booking._id, 'confirmed')}
                                                            disabled={actionLoadingId === `${booking._id}:confirmed`}
                                                            className="rounded-xl px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                                                            style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
                                                        >
                                                            Update status
                                                        </button>
                                                    )}
                                                    {booking.status === 'confirmed' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => updateBookingStatus(booking._id, 'completed')}
                                                            disabled={actionLoadingId === `${booking._id}:completed`}
                                                            className="rounded-xl px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                                                            style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}
                                                        >
                                                            Update status
                                                        </button>
                                                    )}
                                                    {!['completed', 'cancelled', 'rejected'].includes(booking.status) && (
                                                        <button
                                                            type="button"
                                                            onClick={() => updateBookingStatus(booking._id, 'cancelled')}
                                                            disabled={actionLoadingId === `${booking._id}:cancelled`}
                                                            className="rounded-xl px-3 py-2 text-xs font-semibold disabled:opacity-50"
                                                            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.24)', color: '#fca5a5' }}
                                                        >
                                                            Cancel
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {!loading && bookings.length > 0 && (
                    <Pagination page={page} totalPages={meta.totalPages || 1} onChange={setPage} />
                )}
            </div>

            <AdminBookingView booking={selectedBooking} onClose={() => setSelectedBooking(null)} />
        </div>
    )
}

export default AdminBookingsRevamp
