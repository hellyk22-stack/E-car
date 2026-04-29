import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { getCarImage } from '../../utils/carImageUtils'
import { addCarToWishlist, removeCarFromWishlist } from '../../utils/wishlistApi'
import { fetchSubscriptionStatus, checkUsageWarnings } from '../../utils/subscription'

const fuelColor = { Petrol: '#f59e0b', Diesel: '#3b82f6', Electric: '#10b981' }

const CarCard = ({ car, selectable, selected, onSelect, wishlisted, onToggleWishlist }) => {
    const navigate = useNavigate()
    const [inWishlist, setInWishlist] = useState(false)
    const [imgError, setImgError] = useState(false)

    useEffect(() => {
        if (typeof wishlisted === 'boolean') {
            setInWishlist(wishlisted)
        }
    }, [wishlisted])

    const toggleWishlist = async (e) => {
        e.stopPropagation()

        if (onToggleWishlist) {
            onToggleWishlist(car)
            return
        }

        try {
            if (inWishlist) {
                await removeCarFromWishlist(car._id)
                setInWishlist(false)
            } else {
                await addCarToWishlist(car._id)
                setInWishlist(true)
                
                // Show proximity warnings after adding
                const status = await fetchSubscriptionStatus()
                const warnings = checkUsageWarnings(status.usage)
                warnings.forEach(w => {
                    if (w.type === 'wishlist') toast.info(w.message)
                })
            }
        } catch (err) {
            console.error('Failed to update wishlist', err)
            if (err.response?.data?.limitReached) {
                toast.warning(err.response?.data?.message || 'Your wishlist limit is full for this plan.')
            } else {
                toast.error(err.response?.data?.message || 'Unable to update wishlist right now.')
            }
        }
    }

    const imgSrc = imgError
        ? 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=600&q=80'
        : getCarImage(car)

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700&family=DM+Sans:wght@400;500;600&display=swap');
                .car-card { transition: all 0.3s cubic-bezier(0.4,0,0.2,1); }
                .car-card:hover { transform: translateY(-5px); }
                .car-card:hover .car-card-img { transform: scale(1.05); }
                .car-card-img { transition: transform 0.4s ease; }
                .heart-btn { transition: all 0.2s cubic-bezier(0.4,0,0.2,1); }
                .heart-btn:hover { transform: scale(1.12); }
                .view-btn { transition: all 0.2s; }
                .view-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(99,102,241,0.35); }
            `}</style>

            <div
                className="car-card overflow-hidden rounded-2xl"
                style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: selectable && selected
                        ? '2px solid #6366f1'
                        : '1px solid rgba(255,255,255,0.08)',
                    boxShadow: selectable && selected ? '0 0 0 4px rgba(99,102,241,0.15)' : 'none',
                }}
            >
                <div className="relative h-48 overflow-hidden">
                    <img
                        src={imgSrc}
                        alt={car.name}
                        className="car-card-img h-full w-full object-cover"
                        onError={() => setImgError(true)}
                    />
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 35%, rgba(10,10,15,0.92) 100%)' }} />

                    <div
                        className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-bold text-white"
                        style={{ background: 'rgba(99,102,241,0.85)', backdropFilter: 'blur(8px)' }}
                    >
                        {car.type}
                    </div>

                    <div
                        className="absolute right-12 top-3 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold text-white"
                        style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}
                    >
                        {'\u{1F6E1}'} {car.safetyRating ?? car.rating ?? 0}/5
                    </div>

                    {!selectable ? (
                        <button
                            onClick={toggleWishlist}
                            className="heart-btn absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-sm"
                            style={{
                                background: inWishlist ? 'rgba(239,68,68,0.4)' : 'rgba(0,0,0,0.4)',
                                backdropFilter: 'blur(8px)',
                                border: `1px solid ${inWishlist ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.2)'}`,
                            }}
                        >
                            {inWishlist ? 'S' : '+'}
                        </button>
                    ) : (
                        <button
                            onClick={() => onSelect(car)}
                            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-sm transition-all hover:scale-110"
                            style={{
                                background: selected ? '#6366f1' : 'rgba(0,0,0,0.5)',
                                backdropFilter: 'blur(8px)',
                                border: `2px solid ${selected ? '#6366f1' : 'rgba(255,255,255,0.3)'}`,
                            }}
                        >
                            {selected && <span style={{ color: 'white', fontSize: 10, fontWeight: 700 }}>OK</span>}
                        </button>
                    )}

                    <div className="absolute bottom-3 left-3 right-3">
                        <h5 className="truncate text-base font-bold leading-tight text-white" style={{ fontFamily: "'Syne', sans-serif" }}>{car.name}</h5>
                        <p className="truncate text-xs" style={{ color: 'rgba(255,255,255,0.55)', fontFamily: "'DM Sans', sans-serif" }}>{car.brand}</p>
                    </div>
                </div>

                <div className="p-4">
                    <div className="mb-4 flex flex-wrap gap-2">
                        <span
                            className="rounded-full px-2.5 py-1 text-xs font-semibold"
                            style={{
                                background: `${fuelColor[car.fuel] || '#6366f1'}20`,
                                color: fuelColor[car.fuel] || '#818cf8',
                                border: `1px solid ${fuelColor[car.fuel] || '#6366f1'}40`,
                                fontFamily: "'DM Sans', sans-serif",
                            }}
                        >
                            {car.fuel}
                        </span>
                        <span
                            className="rounded-full px-2.5 py-1 text-xs font-semibold"
                            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)', fontFamily: "'DM Sans', sans-serif" }}
                        >
                            {car.transmission}
                        </span>
                    </div>

                    <div className="mb-4 grid grid-cols-3 gap-2">
                        {[
                            { label: 'Mileage', value: car.mileage ? `${car.mileage} km` : '--' },
                            { label: 'Engine', value: car.engine ? `${car.engine}cc` : '--' },
                            { label: 'Seats', value: car.seating ? `${car.seating}` : '--' },
                        ].map((spec, i) => (
                            <div key={i} className="rounded-xl py-2 px-1 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <p className="mb-0.5 text-[10px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: "'DM Sans', sans-serif" }}>{spec.label}</p>
                                <p className="text-[11px] font-bold text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>{spec.value}</p>
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                            <p className="mb-0.5 text-[10px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: "'DM Sans', sans-serif" }}>Price</p>
                            <p className="truncate text-xl font-black" style={{ color: '#818cf8', fontFamily: "'Syne', sans-serif", letterSpacing: '-0.02em' }}>
                                ₹ {car.price?.toLocaleString('en-IN')}
                            </p>
                        </div>
                        <button
                            className="view-btn flex-shrink-0 rounded-xl bg-[linear-gradient(135deg,#6366f1,#8b5cf6)] px-5 py-2.5 text-[11px] font-bold text-white"
                            style={{ fontFamily: "'DM Sans', sans-serif" }}
                            onClick={() => navigate(`/user/car/${car._id}`)}
                        >
                            View
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}

export default CarCard
