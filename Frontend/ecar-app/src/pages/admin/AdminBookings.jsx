import React, { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import axiosInstance from '../../utils/axiosInstance'
import Pagination from '../../components/shared/Pagination'
import { bookingTypeLabels, formatDateTimeLabel, getStatusTone, statusLabels } from '../../utils/bookingUtils'

const AdminBookings = () => {
    const [stats, setStats] = useState({})
    const [bookings, setBookings] = useState([])
    const [page, setPage] = useState(1)
    const [meta, setMeta] = useState({ totalPages: 1 })
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState('')
    const [actionLoadingId, setActionLoadingId] = useState('')

    const loadData = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({
                page: String(page),
                limit: '10',
            })
            if (statusFilter) {
                params.set('status', statusFilter)
            }
            const [statsRes, bookingsRes] = await Promise.all([
                axiosInstance.get('/admin/bookings/stats'),
                axiosInstance.get(`/admin/bookings?${params.toString()}`),
            ])
            setStats(statsRes.data.data || {})
            setBookings(bookingsRes.data.data || [])
            setMeta(bookingsRes.data.meta || { totalPages: 1 })
        } catch (error) {
            console.error('Failed to load admin bookings', error)
            toast.error('Unable to load bookings right now.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [page, statusFilter])

    const pendingBookings = useMemo(
        () => bookings.filter((booking) => booking.status === 'pending'),
        [bookings],
    )

    const updateBookingStatus = async (bookingId, status) => {
        setActionLoadingId(bookingId)
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

    return (
        <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: '#fbbf24' }}>System bookings</p>
                <div className="w-full flex flex-wrap items-end justify-between gap-4">
                    <h1 className="mt-2 text-3xl font-bold text-white" style={{ fontFamily: "'Syne', sans-serif" }}>Incoming Bookings</h1>
                    <select
                        value={statusFilter}
                        onChange={(event) => {
                            setPage(1)
                            setStatusFilter(event.target.value)
                        }}
                        className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
                    >
                        <option value="">All statuses</option>
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                {[
                    ['total', 'Total'],
                    ['pending', 'Pending'],
                    ['confirmed', 'Confirmed'],
                    ['completed', 'Completed'],
                    ['cancelled', 'Cancelled'],
                ].map(([key, label]) => (
                    <div key={key} className="rounded-[28px] p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.45)' }}>{label}</p>
                        <p className="mt-3 text-3xl font-black text-white">{stats[key] || 0}</p>
                    </div>
                ))}
            </div>

            <div className="mt-8 rounded-[28px] border border-white/8 bg-white/[0.03] p-6">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: '#bfdbfe' }}>Priority Queue</p>
                        <h2 className="mt-2 text-2xl font-bold text-white" style={{ fontFamily: "'Syne', sans-serif" }}>Bookings Awaiting Approval</h2>
                    </div>
                    <span className="rounded-full border border-sky-300/20 bg-sky-400/10 px-3 py-1 text-xs font-semibold text-sky-100">
                        {pendingBookings.length} pending
                    </span>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    {pendingBookings.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-white/10 px-5 py-10 text-center text-sm text-white/55 lg:col-span-2">
                            No pending bookings on this page.
                        </div>
                    )}
                    {pendingBookings.map((booking) => (
                        <div key={booking._id} className="rounded-[24px] border border-white/8 bg-slate-950/40 p-5">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: '#93c5fd' }}>{booking.bookingId}</p>
                                    <h3 className="mt-2 text-xl font-bold text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
                                        {booking.userDetails?.fullName || booking.user?.name}
                                    </h3>
                                    <p className="mt-2 text-sm text-white/60">
                                        {booking.car?.name} • {booking.showroom?.name}
                                    </p>
                                    <p className="mt-2 text-sm text-white/55">
                                        {bookingTypeLabels[booking.bookingType] || booking.bookingType} • {formatDateTimeLabel(booking.scheduledDate, booking.scheduledTime)}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => updateBookingStatus(booking._id, 'confirmed')}
                                    disabled={actionLoadingId === booking._id}
                                    className="rounded-2xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                                    style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}
                                >
                                    {actionLoadingId === booking._id ? 'Approving...' : 'Approve'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-8 rounded-[28px] p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {loading ? (
                    <div className="py-16 text-center">
                        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                    {['Booking', 'Customer Name', 'Car Model', 'Type', 'Schedule', 'Status', 'Actions'].map((head) => (
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
                                            <td className="px-3 py-4 text-white">{booking.userDetails?.fullName || booking.user?.name}</td>
                                            <td className="px-3 py-4 text-white">{booking.car?.name}</td>
                                            <td className="px-3 py-4 text-white">{bookingTypeLabels[booking.bookingType] || booking.bookingType}</td>
                                            <td className="px-3 py-4" style={{ color: 'rgba(255,255,255,0.55)', fontFamily: "'DM Sans', sans-serif" }}>{formatDateTimeLabel(booking.scheduledDate, booking.scheduledTime)}</td>
                                            <td className="px-3 py-4">
                                                <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: tone.bg, border: `1px solid ${tone.border}`, color: tone.color }}>
                                                    {statusLabels[booking.status] || booking.status}
                                                </span>
                                            </td>
                                            <td className="px-3 py-4">
                                                <div className="flex flex-wrap gap-2">
                                                    {booking.status === 'pending' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => updateBookingStatus(booking._id, 'confirmed')}
                                                            disabled={actionLoadingId === booking._id}
                                                            className="rounded-xl px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                                                            style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}
                                                        >
                                                            Approve
                                                        </button>
                                                    )}
                                                    {booking.status === 'confirmed' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => updateBookingStatus(booking._id, 'completed')}
                                                            disabled={actionLoadingId === booking._id}
                                                            className="rounded-xl px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                                                            style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
                                                        >
                                                            Complete
                                                        </button>
                                                    )}
                                                    {!['completed', 'cancelled'].includes(booking.status) && (
                                                        <button
                                                            type="button"
                                                            onClick={() => updateBookingStatus(booking._id, 'cancelled')}
                                                            disabled={actionLoadingId === booking._id}
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
                <Pagination page={page} totalPages={meta.totalPages || 1} onChange={setPage} />
            </div>
        </div>
    )
}

export default AdminBookings
