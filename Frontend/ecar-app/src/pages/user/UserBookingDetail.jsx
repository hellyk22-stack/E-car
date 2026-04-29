import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import axiosInstance from '../../utils/axiosInstance'
import StatusTimeline from '../../components/bookings/StatusTimeline'
import ConfirmModal from '../../components/shared/ConfirmModal'
import {
    bookingTypeLabels,
    downloadBookingReceipt,
    formatDateTimeLabel,
    getBookingLocationLabel,
    getBookingLocationTitle,
    getStatusSummary,
    getStatusTone,
    statusLabels,
} from '../../utils/bookingUtils'

const UserBookingDetail = () => {
    const navigate = useNavigate()
    const { bookingId } = useParams()
    const [booking, setBooking] = useState(null)
    const [rating, setRating] = useState({ stars: 5, review: '' })
    const [loading, setLoading] = useState(true)
    const [confirmCancel, setConfirmCancel] = useState(false)
    const [cancelLoading, setCancelLoading] = useState(false)

    const loadBooking = async () => {
        setLoading(true)
        try {
            const res = await axiosInstance.get(`/user/bookings/${bookingId}`)
            setBooking(res.data.data)
        } catch (error) {
            toast.error('Unable to load booking details')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadBooking()
    }, [bookingId])

    const cancelBooking = async () => {
        setCancelLoading(true)
        try {
            await axiosInstance.post(`/user/bookings/${bookingId}/cancel`)
            toast.success('Booking cancelled')
            setConfirmCancel(false)
            await loadBooking()
        } catch (error) {
            toast.error(error.response?.data?.message || 'Unable to cancel booking')
        } finally {
            setCancelLoading(false)
        }
    }

    const submitRating = async () => {
        try {
            await axiosInstance.post(`/user/bookings/${bookingId}/rate`, rating)
            toast.success('Thanks for rating your experience')
            await loadBooking()
        } catch (error) {
            toast.error(error.response?.data?.message || 'Unable to submit rating')
        }
    }

    if (loading) {
        return (
            <div className="py-20 text-center">
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
            </div>
        )
    }

    if (!booking) {
        return <div className="p-10 text-center text-white">Booking not found.</div>
    }

    const tone = getStatusTone(booking.status)
    const locationTitle = getBookingLocationTitle(booking)
    const locationLabel = getBookingLocationLabel(booking)
    const appointmentConfirmed = ['confirmed', 'completed'].includes(booking.status)
    const completionReached = booking.status === 'completed'
    const statusSummary = getStatusSummary(booking.status)

    return (
        <div className="min-h-screen px-4 py-10">
            <div className="mx-auto max-w-6xl">
                <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
                    <div className="max-w-3xl">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: '#818cf8' }}>Booking detail</p>
                        <h1 className="mt-2 text-4xl font-black text-white">{booking.bookingId}</h1>
                        <p className="mt-2 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)', fontFamily: "'DM Sans', sans-serif" }}>
                            {locationTitle}: {locationLabel}
                        </p>
                        <p className="mt-3 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)', fontFamily: "'DM Sans', sans-serif" }}>
                            {[booking.showroom?.name, booking.car?.name, formatDateTimeLabel(booking.scheduledDate, booking.scheduledTime)]
                                .filter(Boolean)
                                .join(' • ')}
                        </p>
                    </div>
                    <div className="max-w-sm rounded-3xl p-4 text-right" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <span className="inline-flex rounded-full px-4 py-2 text-sm font-semibold" style={{ background: tone.bg, border: `1px solid ${tone.border}`, color: tone.color }}>
                            {statusLabels[booking.status] || booking.status}
                        </span>
                        <p className="mt-3 text-sm leading-relaxed text-white/65" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                            {statusSummary}
                        </p>
                    </div>
                </div>

                <div className="space-y-6">
                    <StatusTimeline booking={booking} />

                    <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
                        <div className="rounded-[28px] p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <h2 className="text-2xl font-bold text-white">Appointment details</h2>
                            {appointmentConfirmed ? (
                                <div className="mt-6 grid gap-4 text-sm md:grid-cols-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                    <div className="rounded-2xl bg-white/[0.02] p-4">
                                        <p style={{ color: 'rgba(255,255,255,0.45)' }}>{locationTitle}</p>
                                        <p className="mt-2 text-white">{locationLabel}</p>
                                    </div>
                                    <div className="rounded-2xl bg-white/[0.02] p-4">
                                        <p style={{ color: 'rgba(255,255,255,0.45)' }}>Car</p>
                                        <p className="mt-2 text-white">{booking.car?.name}</p>
                                    </div>
                                    <div className="rounded-2xl bg-white/[0.02] p-4">
                                        <p style={{ color: 'rgba(255,255,255,0.45)' }}>Test drive type</p>
                                        <p className="mt-2 text-white">{bookingTypeLabels[booking.bookingType] || booking.bookingType}</p>
                                    </div>
                                    <div className="rounded-2xl bg-white/[0.02] p-4">
                                        <p style={{ color: 'rgba(255,255,255,0.45)' }}>Confirmed schedule</p>
                                        <p className="mt-2 text-white">{formatDateTimeLabel(booking.scheduledDate, booking.scheduledTime)}</p>
                                    </div>
                                    <div className="rounded-2xl bg-white/[0.02] p-4">
                                        <p style={{ color: 'rgba(255,255,255,0.45)' }}>Assigned showroom contact</p>
                                        <p className="mt-2 text-white">
                                            {booking.assignedStaff?.name || '--'}
                                            {booking.assignedStaff?.phone ? ` (${booking.assignedStaff.phone})` : ''}
                                        </p>
                                    </div>
                                    <div className="rounded-2xl bg-white/[0.02] p-4">
                                        <p style={{ color: 'rgba(255,255,255,0.45)' }}>{locationTitle === 'Address' ? 'Service pincode' : 'Showroom address'}</p>
                                        <p className="mt-2 text-white">
                                            {locationTitle === 'Address'
                                                ? booking.userDetails?.pincode || '--'
                                                : [booking.showroom?.address?.street, booking.showroom?.address?.city].filter(Boolean).join(', ') || '--'}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-6 rounded-3xl p-5" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                                    <p className="text-lg font-semibold text-white">Waiting for showroom confirmation</p>
                                    <p className="mt-2 text-sm leading-relaxed text-white/70" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                        Your request has been submitted successfully. Final appointment details will appear here as soon as the showroom confirms the booking.
                                    </p>
                                    <div className="mt-5 grid gap-4 text-sm md:grid-cols-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                        <div className="rounded-2xl bg-black/10 p-4">
                                            <p style={{ color: 'rgba(255,255,255,0.45)' }}>Requested car</p>
                                            <p className="mt-2 text-white">{booking.car?.name}</p>
                                        </div>
                                        <div className="rounded-2xl bg-black/10 p-4">
                                            <p style={{ color: 'rgba(255,255,255,0.45)' }}>Requested test drive type</p>
                                            <p className="mt-2 text-white">{bookingTypeLabels[booking.bookingType] || booking.bookingType}</p>
                                        </div>
                                        <div className="rounded-2xl bg-black/10 p-4">
                                            <p style={{ color: 'rgba(255,255,255,0.45)' }}>Requested schedule</p>
                                            <p className="mt-2 text-white">{formatDateTimeLabel(booking.scheduledDate, booking.scheduledTime)}</p>
                                        </div>
                                        <div className="rounded-2xl bg-black/10 p-4">
                                            <p style={{ color: 'rgba(255,255,255,0.45)' }}>{locationTitle}</p>
                                            <p className="mt-2 text-white">{locationLabel}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {completionReached && booking.showroomResponse?.message && (
                                <div className="mt-5 rounded-2xl p-4 text-sm" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.18)', fontFamily: "'DM Sans', sans-serif" }}>
                                    <p className="font-semibold text-white">Showroom update</p>
                                    <p className="mt-2 leading-relaxed text-white/70">{booking.showroomResponse.message}</p>
                                </div>
                            )}

                            <div className="mt-8 flex flex-wrap gap-3">
                                <button type="button" onClick={() => downloadBookingReceipt(booking)} className="rounded-2xl px-5 py-3 text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>
                                    Download receipt
                                </button>
                                {booking.status === 'pending' && (
                                    <button type="button" onClick={() => setConfirmCancel(true)} className="rounded-2xl px-5 py-3 text-sm font-semibold" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.24)', color: '#fca5a5' }}>
                                        Cancel booking
                                    </button>
                                )}
                                <button type="button" onClick={() => navigate('/user/bookings')} className="rounded-2xl px-5 py-3 text-sm font-semibold text-white" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    Back to bookings
                                </button>
                            </div>
                        </div>

                        <div className="rounded-[28px] p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <h2 className="text-2xl font-bold text-white">Rate your experience</h2>
                            {booking.userRating?.stars ? (
                                <div className="mt-5 rounded-2xl p-5" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                                    <p className="font-semibold text-white">{booking.userRating.stars} / 5</p>
                                    <p className="mt-2 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.62)', fontFamily: "'DM Sans', sans-serif" }}>
                                        {booking.userRating.review || 'Thanks for sharing your feedback.'}
                                    </p>
                                </div>
                            ) : booking.status === 'completed' ? (
                                <div className="mt-5 space-y-4">
                                    <select value={rating.stars} onChange={(event) => setRating((prev) => ({ ...prev, stars: Number(event.target.value) }))} className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none">
                                        {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} stars</option>)}
                                    </select>
                                    <textarea value={rating.review} onChange={(event) => setRating((prev) => ({ ...prev, review: event.target.value }))} rows="5" placeholder="Tell us how the test drive went" className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" />
                                    <button type="button" onClick={submitRating} className="rounded-2xl px-5 py-3 text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}>
                                        Submit feedback
                                    </button>
                                </div>
                            ) : (
                                <p className="mt-5 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)', fontFamily: "'DM Sans', sans-serif" }}>
                                    You will be able to rate the experience after the showroom marks the test drive as completed.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <ConfirmModal
                open={confirmCancel}
                title="Cancel this test drive?"
                message="Are you sure you want to cancel this pending booking? This will release the reserved slot immediately."
                confirmLabel="Yes, cancel it"
                cancelLabel="Keep booking"
                loading={cancelLoading}
                onConfirm={cancelBooking}
                onClose={() => !cancelLoading && setConfirmCancel(false)}
            />
        </div>
    )
}

export default UserBookingDetail
