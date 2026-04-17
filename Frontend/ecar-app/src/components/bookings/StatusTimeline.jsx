import React from 'react'
import { formatDate, getTimelineState, timelineSteps } from '../../utils/bookingUtils'

const StatusTimeline = ({ booking }) => {
    const status = booking?.status
    const state = getTimelineState(status)
    const historyByStatus = Object.fromEntries((booking?.statusHistory || []).map((entry) => [entry.status, entry]))

    const stepComplete = (key) => {
        if (state === 'failed') return key === 'pending' || key === 'awaiting_confirmation'
        if (key === 'pending') return true
        if (key === 'awaiting_confirmation') return true
        if (key === 'confirmed') return ['confirmed', 'completed'].includes(status)
        if (key === 'completed') return status === 'completed'
        return false
    }

    const stepLabel = (key) => {
        if (key === 'pending') {
            const pendingEntry = historyByStatus.pending
            return pendingEntry?.timestamp
                ? formatDate(pendingEntry.timestamp, { month: 'short', day: 'numeric' })
                : 'Submitted'
        }

        if (key === 'awaiting_confirmation') {
            if (status === 'pending') return 'Showroom review pending'
            if (['confirmed', 'completed'].includes(status)) return 'Accepted by showroom'
            if (['cancelled', 'rejected'].includes(status)) return 'Closed before confirmation'
        }

        if (key === 'confirmed') {
            const confirmedEntry = historyByStatus.confirmed
            if (confirmedEntry?.timestamp) return formatDate(confirmedEntry.timestamp, { month: 'short', day: 'numeric' })
            return ['confirmed', 'completed'].includes(status) ? 'Appointment ready' : 'Waiting'
        }

        if (key === 'completed') {
            const completedEntry = historyByStatus.completed
            if (completedEntry?.timestamp) return formatDate(completedEntry.timestamp, { month: 'short', day: 'numeric' })
            return status === 'completed' ? 'Done' : 'Waiting'
        }

        return 'Waiting'
    }

    return (
        <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: '#a5b4fc' }}>Booking Progress</p>
                    <h3 className="mt-2 text-xl font-bold text-white">Status timeline</h3>
                </div>
                {(status === 'cancelled' || status === 'rejected') && (
                    <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: 'rgba(239,68,68,0.14)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.25)' }}>
                        {status === 'cancelled' ? 'Cancelled' : 'Rejected'}
                    </span>
                )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {timelineSteps.map((step) => {
                    const complete = stepComplete(step.key)
                    const isFailedTail = state === 'failed' && !complete
                    return (
                        <div
                            key={step.key}
                            className="rounded-2xl p-4 md:p-5"
                            style={{
                                background: complete ? 'rgba(99,102,241,0.12)' : isFailedTail ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.02)',
                                border: `1px solid ${complete ? 'rgba(99,102,241,0.24)' : isFailedTail ? 'rgba(239,68,68,0.22)' : 'rgba(255,255,255,0.08)'}`,
                            }}
                        >
                            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: complete ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.08)' }}>
                                {step.icon}
                            </div>
                            <p className="text-base font-semibold leading-8 text-white md:text-lg">{step.label}</p>
                            <p className="mt-2 text-sm leading-6" style={{ color: 'rgba(255,255,255,0.5)', fontFamily: "'DM Sans', sans-serif" }}>
                                {stepLabel(step.key)}
                            </p>
                        </div>
                    )
                })}
            </div>

            {(status === 'cancelled' || status === 'rejected') && (
                <p className="mt-4 text-sm" style={{ color: '#fca5a5', fontFamily: "'DM Sans', sans-serif" }}>
                    {booking?.showroomResponse?.message || booking?.statusHistory?.[booking.statusHistory.length - 1]?.note || 'This booking did not proceed.'}
                </p>
            )}
        </div>
    )
}

export default StatusTimeline
