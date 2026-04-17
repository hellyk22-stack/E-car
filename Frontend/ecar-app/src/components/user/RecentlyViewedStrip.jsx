import React from 'react'
import { useNavigate } from 'react-router-dom'
import { getCarImage } from '../../utils/carImageUtils'

const FALLBACK = 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=300&q=80'

const RecentlyViewedStrip = ({ cars = [], title = 'Recently Viewed', eyebrow = 'History' }) => {
    const navigate = useNavigate()

    if (!cars.length) return null

    return (
        <div className="rounded-[28px] border border-white/10 bg-slate-900/60 p-5 shadow-[0_22px_60px_rgba(6,8,24,0.28)] backdrop-blur-xl">
            <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">{eyebrow}</p>
                    <h3 className="mt-1 text-2xl font-bold text-white" style={{ fontFamily: "'Syne', sans-serif", letterSpacing: '-0.03em' }}>
                        {title}
                    </h3>
                </div>
                <p className="text-sm text-slate-400" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Last {cars.length} viewed
                </p>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-2">
                {cars.map((car) => (
                    <button
                        key={car._id}
                        onClick={() => navigate(`/user/car/${car._id}`)}
                        className="min-w-[240px] overflow-hidden rounded-[24px] border border-white/8 bg-white/[0.03] text-left transition hover:-translate-y-1 hover:border-indigo-300/25"
                    >
                        <div className="relative h-36 overflow-hidden">
                            <img
                                src={getCarImage(car)}
                                alt={car.name}
                                className="h-full w-full object-cover"
                                onError={(event) => { event.target.src = FALLBACK }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-950/90" />
                            <span className="absolute left-3 top-3 rounded-full bg-indigo-500/80 px-2.5 py-1 text-[11px] font-semibold text-white">
                                {car.type || 'Car'}
                            </span>
                        </div>
                        <div className="p-4">
                            <p className="truncate text-base font-semibold text-white">{car.name}</p>
                            <p className="mt-1 truncate text-xs text-slate-400" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                {car.brand} · {car.fuel}
                            </p>
                            <div className="mt-4 flex items-center justify-between gap-3">
                                <p className="text-lg font-bold text-indigo-300" style={{ fontFamily: "'Syne', sans-serif" }}>
                                    Rs {Number(car.price || 0).toLocaleString('en-IN')}
                                </p>
                                <span className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-xs font-medium text-slate-300">
                                    Open
                                </span>
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    )
}

export default RecentlyViewedStrip