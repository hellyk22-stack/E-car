import React, { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import axiosInstance from '../../utils/axiosInstance'
import BookingDetailModal from '../../components/showroom/BookingDetailModal'
import Pagination from '../../components/shared/Pagination'
import { bookingTypeLabels, formatDateTimeLabel, getStatusTone, statusLabels } from '../../utils/bookingUtils'

const toDateInput = (value) => value.toISOString().slice(0, 10)
const getTodayValue = () => toDateInput(new Date())
const getWeekRange = () => {
    const start = new Date()
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    return { fromDate: toDateInput(start), toDate: toDateInput(end) }
}

const ShowroomBookings = () => {
    const [bookings, setBookings] = useState([])
    const [page, setPage] = useState(1)
    const [meta, setMeta] = useState({ totalPages: 1 })
    const [filters, setFilters] = useState({ status: '', date: '', quickRange: '' })
    const [selectedBooking, setSelectedBooking] = useState(null)
    const [loading, setLoading] = useState(true)
    const [selectedIds, setSelectedIds] = useState([])
    const [bulkLoading, setBulkLoading] = useState(false)

    const activeDateRange = useMemo(() => {
        if (filters.quickRange === 'week' && !filters.date) {
            return getWeekRange()
        }

        if (filters.date) {
            return { fromDate: filters.date, toDate: filters.date }
        }

        return { fromDate: '', toDate: '' }
    }, [filters.date, filters.quickRange])

    const loadBookings = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({ page: String(page), limit: '10' })
            if (filters.status) params.set('status', filters.status)
            if (activeDateRange.fromDate) params.set('fromDate', activeDateRange.fromDate)
            if (activeDateRange.toDate) params.set('toDate', activeDateRange.toDate)
            const res = await axiosInstance.get(`/showroom/bookings?${params.toString()}`)
            setBookings(res.data.data || [])
            setMeta(res.data.meta || { totalPages: 1 })
            setSelectedIds([])
        } catch (error) {
            console.error('Failed to fetch bookings', error)
            toast.error('Unable to load showroom bookings right now.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadBookings()
    }, [page, filters.status, filters.date, filters.quickRange])

    const clearFilters = () => {
        setPage(1)
        setFilters({ status: '', date: '', quickRange: '' })
    }

    const toggleSelection = (bookingId) => {
        setSelectedIds((prev) => prev.includes(bookingId) ? prev.filter((item) => item !== bookingId) : [...prev, bookingId])
    }

    const confirmSelected = async () => {
        if (!selectedIds.length) return

        setBulkLoading(true)
        try {
            await axiosInstance.put('/showroom/bookings/bulk-confirm', { bookingIds: selectedIds })
            toast.success(`Confirmed ${selectedIds.length} booking${selectedIds.length === 1 ? '' : 's'}.`)
            await loadBookings()
        } catch (error) {
            toast.error(error.response?.data?.message || 'Unable to confirm selected bookings.')
        } finally {
            setBulkLoading(false)
        }
    }

    return (
        <div>
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: '#93c5fd' }}>Pipeline</p>
                    <h1 className="mt-2 text-3xl font-bold text-white">Showroom bookings</h1>
                </div>
                <div className="flex flex-wrap gap-3">
                    <select value={filters.status} onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none">
                        <option value="">All statuses</option>
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="rejected">Rejected</option>
                    </select>
                    <input type="date" value={filters.date} onChange={(event) => setFilters((prev) => ({ ...prev, date: event.target.value, quickRange: event.target.value ? 'custom' : '' }))} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" />
                    <button type="button" onClick={() => setFilters((prev) => ({ ...prev, date: getTodayValue(), quickRange: 'today' }))} className="rounded-2xl px-4 py-3 text-sm font-semibold text-white" style={{ background: filters.quickRange === 'today' ? 'rgba(37,99,235,0.18)' : 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        Today
                    </button>
                    <button type="button" onClick={() => setFilters((prev) => ({ ...prev, date: '', quickRange: 'week' }))} className="rounded-2xl px-4 py-3 text-sm font-semibold text-white" style={{ background: filters.quickRange === 'week' ? 'rgba(37,99,235,0.18)' : 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        This week
                    </button>
                </div>
            </div>

            <div className="rounded-[28px] p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-white/55">{selectedIds.length} selected</p>
                    <button
                        type="button"
                        onClick={confirmSelected}
                        disabled={bulkLoading || !selectedIds.length}
                        className="rounded-2xl px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
                    >
                        {bulkLoading ? 'Confirming...' : 'Confirm selected'}
                    </button>
                </div>
                {loading ? (
                    <div className="py-16 text-center">
                        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                    </div>
                ) : bookings.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center">
                        <p className="text-white text-lg font-semibold">No bookings match these filters</p>
                        <p className="mt-2 text-sm text-white/55">Try resetting the filters to see your full booking pipeline again.</p>
                        <button type="button" onClick={clearFilters} className="mt-5 rounded-2xl px-5 py-3 text-sm font-semibold text-white" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            Clear filters
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                    {['', 'Booking', 'Customer', 'Contact', 'Car', 'Type', 'Date', 'Status'].map((head) => (
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
                                        <tr key={booking._id} onClick={() => setSelectedBooking(booking)} className="cursor-pointer" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <td className="px-3 py-4">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(booking._id)}
                                                    onClick={(event) => event.stopPropagation()}
                                                    onChange={() => toggleSelection(booking._id)}
                                                    disabled={booking.status !== 'pending'}
                                                    className="h-4 w-4 rounded border-white/10 bg-slate-900 text-blue-500"
                                                />
                                            </td>
                                            <td className="px-3 py-4 text-white">{booking.bookingId}</td>
                                            <td className="px-3 py-4 text-white">{booking.userDetails?.fullName}</td>
                                            <td className="px-3 py-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                                <div className="space-y-1">
                                                    <a href={`tel:${booking.userDetails?.phone || ''}`} onClick={(event) => event.stopPropagation()} className="block text-white/80 hover:text-white">
                                                        {booking.userDetails?.phone || '--'}
                                                    </a>
                                                    <a href={`mailto:${booking.user?.email || ''}`} onClick={(event) => event.stopPropagation()} className="block text-white/55 hover:text-white">
                                                        {booking.user?.email || '--'}
                                                    </a>
                                                </div>
                                            </td>
                                            <td className="px-3 py-4 text-white">{booking.car?.name || '--'}</td>
                                            <td className="px-3 py-4" style={{ color: 'rgba(255,255,255,0.55)', fontFamily: "'DM Sans', sans-serif" }}>{bookingTypeLabels[booking.bookingType] || booking.bookingType}</td>
                                            <td className="px-3 py-4" style={{ color: 'rgba(255,255,255,0.55)', fontFamily: "'DM Sans', sans-serif" }}>{formatDateTimeLabel(booking.scheduledDate, booking.scheduledTime)}</td>
                                            <td className="px-3 py-4">
                                                <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: tone.bg, border: `1px solid ${tone.border}`, color: tone.color }}>
                                                    {statusLabels[booking.status] || booking.status}
                                                </span>
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

            {selectedBooking && (
                <BookingDetailModal booking={selectedBooking} onClose={() => setSelectedBooking(null)} onUpdated={loadBookings} />
            )}
        </div>
    )
}

export default ShowroomBookings
