import React from 'react'
import { formatDate, getTimelineState, timelineSteps } from '../../utils/bookingUtils'

const StatusTimeline = ({ booking, compact = false }) => {
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
                ? `Sent on ${formatDate(pendingEntry.timestamp, { month: 'short', day: 'numeric' })}`
                : 'Submitted'
        }

        if (key === 'awaiting_confirmation') {
            if (status === 'pending') return 'The showroom is reviewing your request'
            if (['confirmed', 'completed'].includes(status)) return 'Showroom confirmed the request'
            if (['cancelled', 'rejected'].includes(status)) return 'The request closed before confirmation'
        }

        if (key === 'confirmed') {
            const confirmedEntry = historyByStatus.confirmed
            if (confirmedEntry?.timestamp) return `Confirmed on ${formatDate(confirmedEntry.timestamp, { month: 'short', day: 'numeric' })}`
            return ['confirmed', 'completed'].includes(status) ? 'Final appointment details are ready' : 'Waiting for showroom confirmation'
        }

        if (key === 'completed') {
            const completedEntry = historyByStatus.completed
            if (completedEntry?.timestamp) return `Completed on ${formatDate(completedEntry.timestamp, { month: 'short', day: 'numeric' })}`
            return status === 'completed' ? 'Visit completed successfully' : 'Available after your appointment'
        }

        return 'Waiting'
    }

    return (
        <div className={compact ? 'rounded-2xl p-5' : 'rounded-[28px] p-6'} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: '#a5b4fc' }}>Booking Progress</p>
                    <h3 className={`mt-2 font-bold text-white ${compact ? 'text-xl' : 'text-2xl'}`}>Status timeline</h3>
                    {!compact && (
                        <p className="mt-2 max-w-2xl text-sm text-white/60" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                            Track each milestone from submission to completion. The timeline updates as the showroom moves your booking forward.
                        </p>
                    )}
                </div>
                {(status === 'cancelled' || status === 'rejected') && (
                    <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: 'rgba(239,68,68,0.14)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.25)' }}>
                        {status === 'cancelled' ? 'Cancelled' : 'Showroom declined'}
                    </span>
                )}
            </div>

            <div className={`grid gap-4 ${compact ? 'sm:grid-cols-2' : 'md:grid-cols-2 xl:grid-cols-4'}`}>
                {timelineSteps.map((step) => {
                    const complete = stepComplete(step.key)
                    const isCurrent = !complete && (
                        (step.key === 'awaiting_confirmation' && status === 'pending') ||
                        (step.key === 'confirmed' && status === 'confirmed') ||
                        (step.key === 'completed' && status === 'completed')
                    )
                    const isFailedTail = state === 'failed' && !complete
                    return (
                        <div
                            key={step.key}
                            className={`flex flex-col rounded-2xl ${compact ? 'p-4' : 'p-5'}`}
                            style={{
                                background: complete ? 'rgba(99,102,241,0.12)' : isFailedTail ? 'rgba(239,68,68,0.08)' : isCurrent ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.02)',
                                border: `1px solid ${complete ? 'rgba(99,102,241,0.24)' : isFailedTail ? 'rgba(239,68,68,0.22)' : isCurrent ? 'rgba(96,165,250,0.24)' : 'rgba(255,255,255,0.08)'}`,
                                minHeight: compact ? '148px' : '176px',
                            }}
                        >
                            <div className={`mb-4 flex shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${compact ? 'h-10 w-10' : 'h-11 w-11'}`} style={{ background: complete ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : isCurrent ? 'linear-gradient(135deg, #2563eb, #3b82f6)' : 'rgba(255,255,255,0.08)' }}>
                                {step.icon}
                            </div>
                            <div className="flex flex-1 flex-col justify-between">
                                <p className={`font-bold leading-tight text-white ${compact ? 'text-sm' : 'text-base'}`}>{step.label}</p>
                                <p className={`mt-3 leading-relaxed ${compact ? 'text-xs' : 'text-sm'}`} style={{ color: 'rgba(255,255,255,0.58)', fontFamily: "'DM Sans', sans-serif" }}>
                                    {stepLabel(step.key)}
                                </p>
                            </div>
                        </div>
                    )
                })}
            </div>

            {(status === 'cancelled' || status === 'rejected') && (
                <p className="mt-5 text-sm leading-relaxed" style={{ color: '#fca5a5', fontFamily: "'DM Sans', sans-serif" }}>
                    {booking?.showroomResponse?.message || booking?.statusHistory?.[booking.statusHistory.length - 1]?.note || 'This booking did not proceed.'}
                </p>
            )}
        </div>
    )
}

export default StatusTimeline
