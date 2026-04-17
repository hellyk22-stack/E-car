import React, { useEffect, useMemo, useState } from 'react'
import axiosInstance from '../../utils/axiosInstance'
import { formatDateTimeLabel, getStatusTone, statusLabels } from '../../utils/bookingUtils'

const statCards = [
    { key: 'total', label: 'Total Bookings', color: '#a5b4fc' },
    { key: 'pending', label: 'Pending', color: '#fbbf24' },
    { key: 'confirmed', label: 'Confirmed', color: '#93c5fd' },
    { key: 'completed', label: 'Completed', color: '#6ee7b7' },
]

const ShowroomDashboard = () => {
    const [bookings, setBookings] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const load = async () => {
            setLoading(true)
            try {
                const res = await axiosInstance.get('/showroom/bookings?limit=12')
                setBookings(res.data.data || [])
            } catch (error) {
                console.error('Failed to fetch showroom dashboard', error)
            } finally {
                setLoading(false)
            }
        }

        load()
    }, [])

    const stats = useMemo(() => ({
        total: bookings.length,
        pending: bookings.filter((item) => item.status === 'pending').length,
        confirmed: bookings.filter((item) => item.status === 'confirmed').length,
        completed: bookings.filter((item) => item.status === 'completed').length,
    }), [bookings])

    return (
        <div>
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: '#93c5fd' }}>Overview</p>
                    <h1 className="mt-2 text-3xl font-bold text-white">Showroom dashboard</h1>
                    <p className="mt-2 text-sm" style={{ color: 'rgba(255,255,255,0.55)', fontFamily: "'DM Sans', sans-serif" }}>
                        Keep an eye on booking flow, pending actions, and your latest appointments.
                    </p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {statCards.map((card) => (
                    <div key={card.key} className="rounded-[28px] p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: card.color }}>{card.label}</p>
                        <p className="mt-4 text-4xl font-black text-white">{stats[card.key]}</p>
                    </div>
                ))}
            </div>

            <div className="mt-8 rounded-[28px] p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="mb-5 flex items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: '#60a5fa' }}>Recent</p>
                        <h2 className="mt-2 text-2xl font-bold text-white">Latest bookings</h2>
                    </div>
                </div>

                {loading ? (
                    <div className="py-16 text-center">
                        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                    </div>
                ) : bookings.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 px-6 py-14 text-center">
                        <p className="text-white text-lg font-semibold">No bookings yet</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                    {['Booking', 'Customer', 'Car', 'Date', 'Status'].map((head) => (
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
                                            <td className="px-3 py-4 text-white">{booking.userDetails?.fullName}</td>
                                            <td className="px-3 py-4 text-white">{booking.car?.name || '--'}</td>
                                            <td className="px-3 py-4" style={{ color: 'rgba(255,255,255,0.65)', fontFamily: "'DM Sans', sans-serif" }}>
                                                {formatDateTimeLabel(booking.scheduledDate, booking.scheduledTime)}
                                            </td>
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
            </div>
        </div>
    )
}

export default ShowroomDashboard
