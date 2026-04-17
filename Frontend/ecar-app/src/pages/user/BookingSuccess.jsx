import React, { useEffect, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import axiosInstance from '../../utils/axiosInstance'
import {
    bookingTypeLabels,
    formatDateTimeLabel,
    getBookingLocationLabel,
    getBookingLocationTitle,
    getBookingTypeTone,
} from '../../utils/bookingUtils'

const summarySkeletons = Array.from({ length: 4 }, (_, index) => index)

const BookingSuccess = () => {
    const location = useLocation()
    const [searchParams] = useSearchParams()
    const bookingId = searchParams.get('bookingId') || location.state?.booking?._id || ''
    const [booking, setBooking] = useState(location.state?.booking || null)
    const [loading, setLoading] = useState(Boolean(bookingId && !location.state?.booking))

    useEffect(() => {
        if (!bookingId || location.state?.booking) return

        const loadBooking = async () => {
            setLoading(true)
            try {
                const res = await axiosInstance.get(`/user/bookings/${bookingId}`)
                setBooking(res.data.data || null)
            } catch (error) {
                console.error('Unable to load booking success summary', error)
            } finally {
                setLoading(false)
            }
        }

        loadBooking()
    }, [bookingId, location.state])

    const typeTone = getBookingTypeTone(booking?.bookingType)

    return (
        <div className="min-h-screen px-4 py-10">
            <div className="mx-auto max-w-4xl">
                <div className="rounded-[32px] p-8" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: '#6ee7b7' }}>Booking Submitted</p>
                    <h1 className="mt-3 text-4xl font-black text-white">Your test drive is in the queue</h1>
                    <p className="mt-3 max-w-2xl text-sm leading-6" style={{ color: 'rgba(255,255,255,0.58)', fontFamily: "'DM Sans', sans-serif" }}>
                        We&apos;ve recorded your request and the showroom will update the booking status here and in your navbar notifications.
                    </p>

                    <div className="mt-8 rounded-[28px] p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        {loading ? (
                            <div className="grid gap-4 md:grid-cols-2">
                                {summarySkeletons.map((item) => (
                                    <div key={item} className="animate-pulse rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                        <div className="h-4 w-24 rounded-full bg-white/10" />
                                        <div className="mt-4 h-6 w-40 rounded-full bg-white/10" />
                                    </div>
                                ))}
                            </div>
                        ) : booking ? (
                            <>
                                <div className="flex flex-wrap items-center gap-3">
                                    <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: typeTone.bg, border: `1px solid ${typeTone.border}`, color: typeTone.color }}>
                                        {bookingTypeLabels[booking.bookingType] || booking.bookingType}
                                    </span>
                                    <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-200">
                                        Pending
                                    </span>
                                    <span className="text-sm text-white/45">{booking.bookingId || booking._id}</span>
                                </div>

                                <div className="mt-6 grid gap-4 md:grid-cols-2">
                                    <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                        <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.45)' }}>Car</p>
                                        <p className="mt-3 text-xl font-semibold text-white">{booking.car?.name || '--'}</p>
                                    </div>
                                    <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                        <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.45)' }}>Schedule</p>
                                        <p className="mt-3 text-xl font-semibold text-white">{formatDateTimeLabel(booking.scheduledDate, booking.scheduledTime)}</p>
                                    </div>
                                    <div className="rounded-2xl p-5 md:col-span-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                        <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.45)' }}>{getBookingLocationTitle(booking)}</p>
                                        <p className="mt-3 text-lg font-semibold text-white">{getBookingLocationLabel(booking)}</p>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center">
                                <p className="text-white text-lg font-semibold">We couldn&apos;t load that booking summary.</p>
                                <p className="mt-2 text-sm text-white/55">You can still open the full detail page from your bookings list.</p>
                            </div>
                        )}
                    </div>

                    <div className="mt-8 flex flex-wrap gap-3">
                        {booking?._id && (
                            <Link
                                to={`/user/bookings/${booking._id}`}
                                className="rounded-2xl px-5 py-3 text-sm font-semibold text-white"
                                style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
                            >
                                View booking
                            </Link>
                        )}
                        <Link
                            to="/user/bookings"
                            className="rounded-2xl px-5 py-3 text-sm font-semibold text-white"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                        >
                            My bookings
                        </Link>
                        <Link
                            to="/user/showrooms"
                            className="rounded-2xl px-5 py-3 text-sm font-semibold text-white"
                            style={{ background: 'rgba(99,102,241,0.14)', border: '1px solid rgba(129,140,248,0.22)' }}
                        >
                            Book another
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default BookingSuccess
