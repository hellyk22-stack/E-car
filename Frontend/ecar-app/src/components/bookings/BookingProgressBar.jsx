import React from 'react'
import { bookingProgressSteps, getBookingProgressIndex } from '../../utils/bookingUtils'

const BookingProgressBar = ({ status }) => {
    const currentIndex = getBookingProgressIndex(status)
    const isFailed = status === 'cancelled' || status === 'rejected'

    return (
        <div className="mt-4">
            <div className="flex items-center gap-2">
                {bookingProgressSteps.map((step, index) => {
                    const active = currentIndex >= index
                    const color = isFailed && index > currentIndex
                        ? { background: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.22)', text: '#fca5a5' }
                        : active
                            ? { background: 'rgba(99,102,241,0.18)', border: 'rgba(129,140,248,0.28)', text: '#c7d2fe' }
                            : { background: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.08)', text: 'rgba(255,255,255,0.5)' }

                    return (
                        <React.Fragment key={step.key}>
                            <div className="flex min-w-0 items-center gap-2">
                                <div
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                                    style={{ background: color.background, border: `1px solid ${color.border}`, color: color.text }}
                                >
                                    {index + 1}
                                </div>
                                <span className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: color.text }}>
                                    {step.label}
                                </span>
                            </div>
                            {index < bookingProgressSteps.length - 1 && (
                                <div
                                    className="h-px flex-1"
                                    style={{ background: currentIndex > index ? 'rgba(129,140,248,0.45)' : 'rgba(255,255,255,0.08)' }}
                                />
                            )}
                        </React.Fragment>
                    )
                })}
            </div>
        </div>
    )
}

export default BookingProgressBar
