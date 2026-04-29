import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import axiosInstance from '../../utils/axiosInstance'
import BookingProgressBar from '../../components/bookings/BookingProgressBar'
import ConfirmModal from '../../components/shared/ConfirmModal'
import Pagination from '../../components/shared/Pagination'
import {
    bookingTypeLabels,
    formatDateTimeLabel,
    getBookingLocationLabel,
    getBookingLocationTitle,
    getBookingTypeTone,
    getStatusTone,
    statusLabels,
} from '../../utils/bookingUtils'

const bookingSkeletons = Array.from({ length: 3 }, (_, index) => index)
const activeBookingStatuses = ['pending', 'confirmed']

const TestDriveBookings = () => {
    const navigate = useNavigate()
    const [bookings, setBookings] = useState([])
    const [page, setPage] = useState(1)
    const [meta, setMeta] = useState({ totalPages: 1 })
    const [status, setStatus] = useState('')
    const [loading, setLoading] = useState(true)
    const [cancelTarget, setCancelTarget] = useState(null)
    const [cancellingId, setCancellingId] = useState('')
    const [hasActiveBooking, setHasActiveBooking] = useState(false)

    const loadBookings = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({ page: String(page), limit: '10' })
            if (status) params.set('status', status)
            const [res, activeResponses] = await Promise.all([
                axiosInstance.get(`/user/bookings?${params.toString()}`),
                Promise.all(
                    activeBookingStatuses.map((bookingStatus) =>
                        axiosInstance.get(`/user/bookings?page=1&limit=1&status=${bookingStatus}`)
                    )
                ),
            ])

            setBookings(res.data.data || [])
            setMeta(res.data.meta || { totalPages: 1 })
            setHasActiveBooking(
                activeResponses.some((response) => (response.data.data || []).length > 0)
            )
        } catch (error) {
            console.error('Failed to load user bookings', error)
            toast.error('Unable to load your bookings right now.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadBookings()
    }, [page, status])

    const cancelBooking = async () => {
        if (!cancelTarget?._id) return

        setCancellingId(cancelTarget._id)
        try {
            await axiosInstance.post(`/user/bookings/${cancelTarget._id}/cancel`)
            toast.success('Booking cancelled successfully.')
            setCancelTarget(null)
            await loadBookings()
        } catch (error) {
            toast.error(error.response?.data?.message || 'Unable to cancel booking.')
        } finally {
            setCancellingId('')
        }
    }

    const showFilter = !loading && bookings.length > 0
    const showBookTestDriveButton = !hasActiveBooking

    return (
        <div className="min-h-screen px-4 py-10">
            <div className="mx-auto max-w-6xl">
                <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: '#818cf8' }}>Bookings</p>
                        <h1 className="mt-2 text-4xl font-black text-white">My test drive bookings</h1>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        {showFilter && (
                            <select value={status} onChange={(event) => { setPage(1); setStatus(event.target.value) }} className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none">
                                <option value="">All statuses</option>
                                <option value="pending">Pending</option>
                                <option value="confirmed">Confirmed</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        )}
                    </div>
                </div>

                <div className="rounded-[28px] p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    {loading ? (
                        <div className="space-y-4">
                            {bookingSkeletons.map((item) => (
                                <div key={item} className="animate-pulse rounded-[28px] px-5 py-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    <div className="flex flex-wrap items-start justify-between gap-4">
                                        <div className="space-y-3">
                                            <div className="h-4 w-28 rounded-full bg-white/10" />
                                            <div className="h-7 w-56 rounded-full bg-white/10" />
                                            <div className="h-4 w-64 rounded-full bg-white/10" />
                                        </div>
                                        <div className="h-8 w-24 rounded-full bg-white/10" />
                                    </div>
                                    <div className="mt-5 h-12 rounded-2xl bg-white/5" />
                                </div>
                            ))}
                        </div>
                    ) : bookings.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center">
                            <p className="text-white text-2xl font-semibold">No test drives on your timeline yet</p>
                            <p className="mx-auto mt-3 max-w-xl text-sm leading-6" style={{ color: 'rgba(255,255,255,0.58)', fontFamily: "'DM Sans', sans-serif" }}>
                                Explore nearby showrooms, choose a Home drive or Showroom drive, and we&apos;ll keep the full booking journey here.
                            </p>
                            <div className="mt-6 flex flex-wrap justify-center gap-3">
                                {showBookTestDriveButton && (
                                    <button
                                        type="button"
                                        onClick={() => navigate('/user/book-test-drive')}
                                        className="rounded-2xl px-5 py-3 text-sm font-semibold text-white"
                                        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                                    >
                                        Book a test drive
                                    </button>
                                )}
                                {status && (
                                    <button
                                        type="button"
                                        onClick={() => { setPage(1); setStatus('') }}
                                        className="rounded-2xl px-5 py-3 text-sm font-semibold text-white"
                                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                                    >
                                        Clear filter
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {bookings.map((booking) => {
                                const tone = getStatusTone(booking.status)
                                const typeTone = getBookingTypeTone(booking.bookingType)
                                return (
                                    <div
                                        key={booking._id}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => navigate(`/user/bookings/${booking._id}`)}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter' || event.key === ' ') {
                                                event.preventDefault()
                                                navigate(`/user/bookings/${booking._id}`)
                                            }
                                        }}
                                        className="rounded-[28px] px-5 py-5 text-left"
                                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }}
                                    >
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.45)' }}>{booking.bookingId}</p>
                                            <p className="mt-2 text-xl font-semibold text-white">{booking.car?.name || 'Selected car'}</p>
                                            <p className="mt-2 text-sm" style={{ color: 'rgba(255,255,255,0.55)', fontFamily: "'DM Sans', sans-serif" }}>
                                                {booking.showroom?.name} • {booking.car?.name}
                                            </p>
                                            <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.45)', fontFamily: "'DM Sans', sans-serif" }}>
                                                {formatDateTimeLabel(booking.scheduledDate, booking.scheduledTime)}
                                            </p>
                                            <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.48)', fontFamily: "'DM Sans', sans-serif" }}>
                                                {getBookingLocationTitle(booking)}: {getBookingLocationLabel(booking)}
                                            </p>
                                            <BookingProgressBar status={booking.status} />
                                        </div>
                                        <div className="flex flex-wrap items-center justify-end gap-2">
                                            <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: typeTone.bg, border: `1px solid ${typeTone.border}`, color: typeTone.color }}>
                                                {bookingTypeLabels[booking.bookingType] || booking.bookingType}
                                            </span>
                                            <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: tone.bg, border: `1px solid ${tone.border}`, color: tone.color }}>
                                                {statusLabels[booking.status] || booking.status}
                                            </span>
                                            {booking.status === 'pending' && (
                                                <button
                                                    type="button"
                                                    onClick={(event) => {
                                                        event.stopPropagation()
                                                        setCancelTarget(booking)
                                                    }}
                                                    className="rounded-2xl px-4 py-2.5 text-sm font-semibold"
                                                    style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.24)', color: '#fca5a5' }}
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                    {!loading && bookings.length > 0 && (
                        <Pagination page={page} totalPages={meta.totalPages || 1} onChange={setPage} />
                    )}
                </div>
            </div>

            <ConfirmModal
                open={!!cancelTarget}
                title="Cancel this test drive?"
                message="Are you sure you want to cancel this pending booking? This will release the reserved slot immediately."
                confirmLabel="Yes, cancel it"
                cancelLabel="Keep booking"
                loading={cancellingId === cancelTarget?._id}
                onConfirm={cancelBooking}
                onClose={() => !cancellingId && setCancelTarget(null)}
            />
        </div>
    )
}

export default TestDriveBookings
