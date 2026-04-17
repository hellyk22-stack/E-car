import React, { useState } from 'react'
import { toast } from 'react-toastify'
import axiosInstance from '../../utils/axiosInstance'
import StatusTimeline from '../bookings/StatusTimeline'
import { formatDateTimeLabel, getStatusTone, statusLabels } from '../../utils/bookingUtils'

const BookingDetailModal = ({ booking, onClose, onUpdated }) => {
    const [staff, setStaff] = useState({
        name: booking?.assignedStaff?.name || '',
        phone: booking?.assignedStaff?.phone || '',
    })
    const [reason, setReason] = useState(booking?.showroomResponse?.message || '')
    const [loadingAction, setLoadingAction] = useState('')

    if (!booking) return null

    const statusTone = getStatusTone(booking.status)

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
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-4 py-10" style={{ background: 'rgba(2,6,23,0.75)', backdropFilter: 'blur(10px)' }}>
            <div className="w-full max-w-5xl rounded-[28px] p-6" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: '#60a5fa' }}>Booking Detail</p>
                        <h3 className="mt-2 text-2xl font-bold text-white">{booking.bookingId}</h3>
                        <p className="mt-2 text-sm" style={{ color: 'rgba(255,255,255,0.55)', fontFamily: "'DM Sans', sans-serif" }}>
                            {booking.car?.name || 'Selected car'} • {formatDateTimeLabel(booking.scheduledDate, booking.scheduledTime)}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: statusTone.bg, border: `1px solid ${statusTone.border}`, color: statusTone.color }}>
                            {statusLabels[booking.status] || booking.status}
                        </span>
                        <button type="button" onClick={onClose} className="rounded-xl px-3 py-2 text-white" style={{ background: 'rgba(255,255,255,0.06)' }}>
                            Close
                        </button>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="space-y-6">
                        <StatusTimeline booking={booking} />

                        <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <h4 className="text-lg font-bold text-white">Customer details</h4>
                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.4)' }}>Name</p>
                                    <p className="mt-2 text-white">{booking.userDetails?.fullName}</p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.4)' }}>Phone</p>
                                    <p className="mt-2 text-white">{booking.userDetails?.phone}</p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.4)' }}>License Number</p>
                                    <p className="mt-2 text-white">{booking.userDetails?.drivingLicense?.number}</p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.4)' }}>Expiry</p>
                                    <p className="mt-2 text-white">{booking.userDetails?.drivingLicense?.expiryDate ? new Date(booking.userDetails.drivingLicense.expiryDate).toLocaleDateString('en-IN') : '--'}</p>
                                </div>
                            </div>
                            {booking.userDetails?.drivingLicense?.image && (
                                <a
                                    href={booking.userDetails.drivingLicense.image}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-4 inline-flex rounded-xl px-4 py-2 text-sm font-semibold text-white"
                                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                                >
                                    View uploaded license
                                </a>
                            )}
                            {booking.bookingType === 'home_delivery' && (
                                <div className="mt-4 rounded-2xl p-4" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.18)' }}>
                                    <p className="text-sm text-white">{booking.userDetails?.address || '--'}</p>
                                    <p className="mt-1 text-xs" style={{ color: '#bfdbfe', fontFamily: "'DM Sans', sans-serif" }}>Pincode: {booking.userDetails?.pincode || '--'}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <h4 className="text-lg font-bold text-white">Assign staff</h4>
                            <div className="mt-4 space-y-3">
                                <input
                                    value={staff.name}
                                    onChange={(event) => setStaff((prev) => ({ ...prev, name: event.target.value }))}
                                    placeholder="Attendant name"
                                    className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none"
                                />
                                <input
                                    value={staff.phone}
                                    onChange={(event) => setStaff((prev) => ({ ...prev, phone: event.target.value }))}
                                    placeholder="Attendant phone"
                                    className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none"
                                />
                            </div>
                        </div>

                        <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <h4 className="text-lg font-bold text-white">Message or reason</h4>
                            <textarea
                                rows="5"
                                value={reason}
                                onChange={(event) => setReason(event.target.value)}
                                placeholder="Optional note for the customer"
                                className="mt-4 w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none"
                            />

                            <div className="mt-5 flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    disabled={loadingAction === 'confirm' || !staff.name || !staff.phone}
                                    onClick={() => runAction('confirm')}
                                    className="rounded-xl px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                                    style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
                                >
                                    {loadingAction === 'confirm' ? 'Confirming...' : 'Confirm Booking'}
                                </button>
                                <button
                                    type="button"
                                    disabled={loadingAction === 'reject' || !reason.trim()}
                                    onClick={() => runAction('reject')}
                                    className="rounded-xl px-5 py-3 text-sm font-semibold"
                                    style={{ background: 'rgba(239,68,68,0.12)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.25)' }}
                                >
                                    {loadingAction === 'reject' ? 'Rejecting...' : 'Reject Booking'}
                                </button>
                                <button
                                    type="button"
                                    disabled={loadingAction === 'complete'}
                                    onClick={() => runAction('complete')}
                                    className="rounded-xl px-5 py-3 text-sm font-semibold text-white"
                                    style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}
                                >
                                    {loadingAction === 'complete' ? 'Updating...' : 'Mark Complete'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default BookingDetailModal
