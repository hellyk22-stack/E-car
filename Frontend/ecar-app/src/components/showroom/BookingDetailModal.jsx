import React, { useState } from 'react'
import { toast } from 'react-toastify'
import axiosInstance from '../../utils/axiosInstance'
import StatusTimeline from '../bookings/StatusTimeline'
import { formatDateTimeLabel, getStatusTone, normalizeBookingType, statusLabels } from '../../utils/bookingUtils'

const BookingDetailModal = ({ booking, onClose, onUpdated }) => {
    const [staff, setStaff] = useState({
        name: booking?.assignedStaff?.name || '',
        phone: booking?.assignedStaff?.phone || '',
    })
    const [reason, setReason] = useState(booking?.showroomResponse?.message || '')
    const [loadingAction, setLoadingAction] = useState('')

    if (!booking) return null

    const statusTone = getStatusTone(booking.status)
    const bookingTypeLabel = normalizeBookingType(booking.bookingType) === 'home' ? 'Home test drive' : 'Showroom test drive'

    const runAction = async (type) => {
        setLoadingAction(type)
        try {
            if (type === 'confirm') {
                await axiosInstance.put(`/showroom/bookings/${booking._id}/confirm`, {
                    ...staff,
                    message: reason,
                })
                toast.success('Booking confirmed')
            }
            if (type === 'reject') {
                await axiosInstance.put(`/showroom/bookings/${booking._id}/reject`, { reason })
                toast.success('Booking rejected')
            }
            if (type === 'complete') {
                await axiosInstance.put(`/showroom/bookings/${booking._id}/complete`, { note: reason })
                toast.success('Booking marked complete')
            }

            await onUpdated?.()
            onClose()
        } catch (error) {
            toast.error(error.response?.data?.message || 'Unable to update booking')
        } finally {
            setLoadingAction('')
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto px-4 py-6" style={{ background: 'rgba(2,6,23,0.75)', backdropFilter: 'blur(10px)' }}>
            <div className="flex max-h-[calc(100vh-3rem)] w-full max-w-6xl flex-col overflow-hidden rounded-[30px]" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 30px 80px rgba(15,23,42,0.45)' }}>
                <div className="border-b border-white/10 px-6 py-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: '#60a5fa' }}>Booking detail</p>
                            <h3 className="mt-2 truncate text-2xl font-bold text-white">{booking.bookingId}</h3>
                            <p className="mt-2 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)', fontFamily: "'DM Sans', sans-serif" }}>
                                {[booking.car?.name || 'Selected car', formatDateTimeLabel(booking.scheduledDate, booking.scheduledTime)]
                                    .filter(Boolean)
                                    .join(' • ')}
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-3">
                            <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: statusTone.bg, border: `1px solid ${statusTone.border}`, color: statusTone.color }}>
                                {statusLabels[booking.status] || booking.status}
                            </span>
                            <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                Close
                            </button>
                        </div>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-3">
                        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                            <p className="text-[11px] uppercase tracking-[0.2em] text-white/40">Customer</p>
                            <p className="mt-2 truncate text-sm font-semibold text-white">{booking.userDetails?.fullName || '--'}</p>
                        </div>
                        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                            <p className="text-[11px] uppercase tracking-[0.2em] text-white/40">Drive type</p>
                            <p className="mt-2 text-sm font-semibold text-white">{bookingTypeLabel}</p>
                        </div>
                        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                            <p className="text-[11px] uppercase tracking-[0.2em] text-white/40">Contact</p>
                            <p className="mt-2 truncate text-sm font-semibold text-white">{booking.userDetails?.phone || '--'}</p>
                        </div>
                    </div>
                </div>

                <div className="overflow-y-auto px-6 py-6">
                    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_380px]">
                        <div className="min-w-0 space-y-6">
                            <StatusTimeline booking={booking} compact />

                            <div className="rounded-[24px] p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <h4 className="text-lg font-bold text-white">Customer details</h4>
                                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                    <div className="rounded-2xl bg-white/[0.02] p-4">
                                        <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.4)' }}>Name</p>
                                        <p className="mt-2 break-words text-white">{booking.userDetails?.fullName || '--'}</p>
                                    </div>
                                    <div className="rounded-2xl bg-white/[0.02] p-4">
                                        <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.4)' }}>Phone</p>
                                        <p className="mt-2 break-all text-white">{booking.userDetails?.phone || '--'}</p>
                                    </div>
                                    <div className="rounded-2xl bg-white/[0.02] p-4">
                                        <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.4)' }}>License number</p>
                                        <p className="mt-2 break-all text-white">{booking.userDetails?.drivingLicense?.number || '--'}</p>
                                    </div>
                                    <div className="rounded-2xl bg-white/[0.02] p-4">
                                        <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.4)' }}>License expiry</p>
                                        <p className="mt-2 text-white">{booking.userDetails?.drivingLicense?.expiryDate ? new Date(booking.userDetails.drivingLicense.expiryDate).toLocaleDateString('en-IN') : '--'}</p>
                                    </div>
                                </div>
                                {booking.userDetails?.drivingLicense?.image && (
                                    <a
                                        href={booking.userDetails.drivingLicense.image}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="mt-4 inline-flex rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                                    >
                                        View uploaded license
                                    </a>
                                )}
                                {normalizeBookingType(booking.bookingType) === 'home' && (
                                    <div className="mt-4 rounded-2xl p-4" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.18)' }}>
                                        <p className="text-xs uppercase tracking-[0.18em] text-blue-100/80">Delivery address</p>
                                        <p className="mt-2 break-words text-sm leading-relaxed text-white">{booking.userDetails?.address || '--'}</p>
                                        <p className="mt-2 text-xs" style={{ color: '#bfdbfe', fontFamily: "'DM Sans', sans-serif" }}>Pincode: {booking.userDetails?.pincode || '--'}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="min-w-0 space-y-6">
                            <div className="rounded-[24px] p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <h4 className="text-lg font-bold text-white">Assign showroom contact</h4>
                                <p className="mt-2 text-sm leading-relaxed text-white/60" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                    Add the staff member the customer should expect for this booking confirmation.
                                </p>
                                <div className="mt-4 space-y-3">
                                    <input
                                        value={staff.name}
                                        onChange={(event) => setStaff((prev) => ({ ...prev, name: event.target.value }))}
                                        placeholder="Staff member name"
                                        className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none transition focus:border-blue-400"
                                    />
                                    <input
                                        value={staff.phone}
                                        onChange={(event) => setStaff((prev) => ({ ...prev, phone: event.target.value }))}
                                        placeholder="Staff contact number"
                                        className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none transition focus:border-blue-400"
                                    />
                                </div>
                            </div>

                            <div className="rounded-[24px] p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <h4 className="text-lg font-bold text-white">Customer note</h4>
                                <p className="mt-2 text-sm leading-relaxed text-white/60" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                    Use this message for confirmation details, a rejection reason, or a completion note.
                                </p>
                                <textarea
                                    rows="6"
                                    value={reason}
                                    onChange={(event) => setReason(event.target.value)}
                                    placeholder="Add a note the customer will understand"
                                    className="mt-4 w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none transition focus:border-blue-400"
                                />

                                <div className="mt-6 space-y-3">
                                    <button
                                        type="button"
                                        disabled={loadingAction === 'confirm' || !staff.name || !staff.phone}
                                        onClick={() => runAction('confirm')}
                                        className="w-full rounded-xl px-5 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                                        style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
                                    >
                                        {loadingAction === 'confirm' ? 'Confirming...' : 'Confirm booking'}
                                    </button>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <button
                                            type="button"
                                            disabled={loadingAction === 'complete'}
                                            onClick={() => runAction('complete')}
                                            className="w-full rounded-xl px-5 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                                            style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}
                                        >
                                            {loadingAction === 'complete' ? 'Updating...' : 'Mark complete'}
                                        </button>
                                        <button
                                            type="button"
                                            disabled={loadingAction === 'reject' || !reason.trim()}
                                            onClick={() => runAction('reject')}
                                            className="w-full rounded-xl px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
                                            style={{ background: 'rgba(239,68,68,0.12)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.25)' }}
                                        >
                                            {loadingAction === 'reject' ? 'Rejecting...' : 'Reject booking'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default BookingDetailModal
