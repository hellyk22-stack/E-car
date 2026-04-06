import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCarImage } from '../../utils/carImageUtils'
import { clearWishlist, getWishlistCars, removeCarFromWishlist } from '../../utils/wishlistApi'

const FALLBACK = 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&q=80'

const Wishlist = () => {
    const navigate = useNavigate()
    const [wishlist, setWishlist] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getWishlistCars()
            .then((cars) => setWishlist(cars))
            .catch((err) => console.error('Failed to load wishlist', err))
            .finally(() => setLoading(false))
    }, [])

    const handleRemoveFromWishlist = async (id) => {
        try {
            await removeCarFromWishlist(id)
            setWishlist((prev) => prev.filter((car) => car._id !== id))
        } catch (err) {
            console.error('Failed to remove from wishlist', err)
        }
    }

    const handleClearAll = async () => {
        try {
            await clearWishlist()
            setWishlist([])
        } catch (err) {
            console.error('Failed to clear wishlist', err)
        }
    }

    return (
        <div className="min-h-screen px-6 py-10" style={{ background: '#0a0a0f', fontFamily: "'Syne', sans-serif" }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500&display=swap');
                .wish-card { transition: all 0.3s cubic-bezier(0.4,0,0.2,1); border: 1px solid rgba(255,255,255,0.07); }
                .wish-card:hover { transform: translateY(-4px); border-color: rgba(99,102,241,0.3); box-shadow: 0 20px 60px rgba(0,0,0,0.4); }
                .rm-btn { transition: all 0.2s; }
                .rm-btn:hover { transform: scale(1.1); }
                @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
                .fu { animation: fadeUp 0.5s ease forwards; opacity: 0; }
            `}</style>

            <div className="max-w-5xl mx-auto">
                <div className="flex items-center justify-between mb-10 fu" style={{ animationDelay: '0.05s' }}>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.15em] mb-2" style={{ color: '#6366f1' }}>My Collection</p>
                        <h1 className="text-white font-extrabold" style={{ fontSize: '2.5rem', letterSpacing: '-0.03em' }}>Wishlist</h1>
                        <p className="mt-2 text-sm" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'DM Sans', sans-serif" }}>
                            {loading ? 'Loading your saved cars...' : `${wishlist.length} ${wishlist.length === 1 ? 'car' : 'cars'} saved`}
                        </p>
                    </div>
                    {wishlist.length > 0 && (
                        <button onClick={handleClearAll}
                            className="px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-105"
                            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontFamily: "'DM Sans', sans-serif" }}>
                            Clear All
                        </button>
                    )}
                </div>

                {!loading && wishlist.length === 0 && (
                    <div className="fu text-center py-24" style={{ animationDelay: '0.1s' }}>
                        <p className="text-6xl mb-6">Saved List</p>
                        <h3 className="text-white font-bold text-xl mb-2">No saved cars yet</h3>
                        <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'DM Sans', sans-serif" }}>
                            Browse cars and tap the wishlist button to save them here
                        </p>
                        <button onClick={() => navigate('/user/search')}
                            className="px-8 py-3 rounded-xl font-semibold text-white text-sm transition-all hover:scale-105"
                            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                            Browse Cars
                        </button>
                    </div>
                )}

                {wishlist.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {wishlist.map((car, i) => (
                            <div key={car._id}
                                className="wish-card rounded-2xl overflow-hidden fu"
                                style={{ background: 'rgba(255,255,255,0.03)', animationDelay: `${0.05 + i * 0.07}s` }}>
                                <div className="relative h-44 overflow-hidden cursor-pointer"
                                    onClick={() => navigate(`/user/car/${car._id}`)}>
                                    <img
                                        src={getCarImage(car)}
                                        alt={car.name}
                                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                                        onError={(e) => { e.target.src = FALLBACK }}
                                    />
                                    <div className="absolute inset-0"
                                        style={{ background: 'linear-gradient(to bottom, transparent 50%, rgba(10,10,15,0.9) 100%)' }} />

                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleRemoveFromWishlist(car._id) }}
                                        className="rm-btn absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-sm"
                                        style={{ background: 'rgba(239,68,68,0.3)', border: '1px solid rgba(239,68,68,0.5)', color: '#f87171' }}
                                        title="Remove from wishlist">
                                        x
                                    </button>

                                    <div className="absolute bottom-3 left-3">
                                        <span className="px-2.5 py-1 rounded-full text-xs font-bold text-white"
                                            style={{ background: 'rgba(99,102,241,0.8)' }}>{car.type}</span>
                                    </div>
                                </div>

                                <div className="p-4">
                                    <h3 className="text-white font-bold text-base mb-0.5">{car.name}</h3>
                                    <p className="text-xs mb-4"
                                        style={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'DM Sans', sans-serif" }}>
                                        {car.brand} · {car.fuel}{car.rating ? ` · ${car.rating}/5` : ''}
                                    </p>
                                    <div className="flex items-center justify-between">
                                        <p className="font-bold text-lg" style={{ color: '#818cf8' }}>
                                            Rs {car.price?.toLocaleString('en-IN')}
                                        </p>
                                        <button onClick={() => navigate(`/user/car/${car._id}`)}
                                            className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:scale-105"
                                            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', fontFamily: "'DM Sans', sans-serif" }}>
                                            View
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {wishlist.length >= 2 && (
                    <div className="mt-10 p-6 rounded-2xl flex items-center justify-between fu"
                        style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1))', border: '1px solid rgba(99,102,241,0.2)', animationDelay: '0.3s' }}>
                        <div>
                            <p className="text-white font-bold mb-1">Ready to compare?</p>
                            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)', fontFamily: "'DM Sans', sans-serif" }}>
                                You have {wishlist.length} saved cars
                            </p>
                        </div>
                        <button onClick={() => navigate('/user/compare')}
                            className="px-6 py-3 rounded-xl font-bold text-white text-sm transition-all hover:scale-105"
                            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                            Compare Now
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

export default Wishlist
