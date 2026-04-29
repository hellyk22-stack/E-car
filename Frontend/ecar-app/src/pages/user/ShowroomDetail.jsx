import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axiosInstance from '../../utils/axiosInstance'
import { DEFAULT_CAR_IMAGE, getCarImage } from '../../utils/carImageUtils'
import { formatCurrency } from '../../utils/bookingUtils'
import { formatShowroomRating } from '../../utils/showroomUtils'
import { mergeShowroomInventoryWithCatalog } from '../../utils/showroomInventory'

const ShowroomDetail = () => {
    const navigate = useNavigate()
    const { id } = useParams()
    const [showroom, setShowroom] = useState(null)
    const [availableCars, setAvailableCars] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const load = async () => {
            setLoading(true)
            try {
                const [showroomRes, carsRes] = await Promise.all([
                    axiosInstance.get(`/user/showrooms/${id}`),
                    axiosInstance.get('/car/cars'),
                ])
                const nextShowroom = showroomRes.data.data
                setShowroom(nextShowroom)
                setAvailableCars(mergeShowroomInventoryWithCatalog(nextShowroom, carsRes.data.data || []))
            } catch (error) {
                console.error('Failed to load showroom detail', error)
            } finally {
                setLoading(false)
            }
        }

        load()
    }, [id])

    if (loading) {
        return (
            <div className="py-20 text-center">
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
            </div>
        )
    }

    if (!showroom) {
        return <div className="p-10 text-center text-white">Showroom not found.</div>
    }

    return (
        <div className="min-h-screen px-4 py-10">
            <div className="mx-auto max-w-7xl">
                <div className="overflow-hidden rounded-[32px]" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="relative h-80">
                        <div className="absolute inset-0" style={{ background: showroom.logo ? `center / cover no-repeat url(${showroom.logo})` : 'linear-gradient(135deg, rgba(59,130,246,0.4), rgba(99,102,241,0.3))' }} />
                        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(2,6,23,0.1), rgba(2,6,23,0.85))' }} />
                        <div className="absolute bottom-0 left-0 right-0 p-8">
                            <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: '#bfdbfe' }}>Approved showroom</p>
                            <h1 className="mt-3 text-4xl font-black text-white">{showroom.name}</h1>
                            <p className="mt-2 text-sm" style={{ color: 'rgba(255,255,255,0.65)', fontFamily: "'DM Sans', sans-serif" }}>
                                {showroom.address?.street}, {showroom.address?.city}, {showroom.address?.state} {showroom.address?.pincode}
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-6 p-8 lg:grid-cols-[0.75fr_1.25fr]">
                        <div className="space-y-5">
                            <div className="rounded-[28px] p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: '#93c5fd' }}>Info</p>
                                <p className="mt-4 text-sm leading-7" style={{ color: 'rgba(255,255,255,0.62)', fontFamily: "'DM Sans', sans-serif" }}>
                                    {showroom.description || 'Browse available inventory and book a test drive directly with this showroom.'}
                                </p>
                                <div className="mt-5 grid grid-cols-2 gap-3 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                    <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
                                        <p style={{ color: 'rgba(255,255,255,0.45)' }}>Rating</p>
                                        <p className="mt-2 text-white font-semibold">{formatShowroomRating(showroom)} ★</p>
                                    </div>
                                    <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
                                        <p style={{ color: 'rgba(255,255,255,0.45)' }}>Hours</p>
                                        <p className="mt-2 text-white font-semibold">{showroom.openingHours?.open || '--'} - {showroom.openingHours?.close || '--'}</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => navigate(`/user/book-test-drive/${showroom._id}`)}
                                    className="mt-5 rounded-2xl px-5 py-3 text-sm font-semibold text-white"
                                    style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                                >
                                    Book test drive
                                </button>
                            </div>
                        </div>

                        <div>
                            <div className="mb-5 flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: '#93c5fd' }}>Inventory</p>
                                    <h2 className="mt-2 text-2xl font-bold text-white">Available cars</h2>
                                </div>
                            </div>
                            <div className="grid gap-5 md:grid-cols-2">
                                {availableCars.map((car) => {
                                    return (
                                        <div key={car?._id} className="overflow-hidden rounded-[28px]" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                            <img
                                                src={getCarImage(car)}
                                                alt={car?.name}
                                                className="h-48 w-full object-cover"
                                                onError={(event) => {
                                                    event.currentTarget.onerror = null
                                                    event.currentTarget.src = DEFAULT_CAR_IMAGE
                                                }}
                                            />
                                            <div className="p-5">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <h3 className="text-xl font-bold text-white">{car?.name}</h3>
                                                        <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.55)', fontFamily: "'DM Sans', sans-serif" }}>{car?.brand} • {car?.fuel}</p>
                                                    </div>
                                                    <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: 'rgba(37,99,235,0.12)', color: '#bfdbfe' }}>
                                                        {formatCurrency(car?.price)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                                {availableCars.length === 0 && (
                                    <div className="md:col-span-2 rounded-[28px] border border-dashed border-white/10 px-6 py-16 text-center">
                                        <p className="text-lg font-semibold text-white">No brand-matched cars available right now</p>
                                        <p className="mt-3 text-sm text-white/55" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                            This showroom only accepts bookings for its registered brands.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ShowroomDetail
