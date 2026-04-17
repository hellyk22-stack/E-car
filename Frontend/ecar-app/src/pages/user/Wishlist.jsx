import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { getCarImage } from '../../utils/carImageUtils'
import { clearWishlist, getWishlistCars, removeCarFromWishlist } from '../../utils/wishlistApi'
import { fetchSubscriptionStatus, formatLimitValue, formatPlanName, isUnlimitedLimit } from '../../utils/subscription'

const FALLBACK = 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&q=80'

const Wishlist = () => {
    const navigate = useNavigate()
    const [wishlist, setWishlist] = useState([])
    const [loading, setLoading] = useState(true)
    const [subscription, setSubscription] = useState(null)

    useEffect(() => {
        const load = async () => {
            try {
                const [cars, status] = await Promise.all([
                    getWishlistCars(),
                    fetchSubscriptionStatus(),
                ])
                setWishlist(cars)
                setSubscription(status)
            } catch (error) {
                console.error('Failed to load wishlist', error)
            } finally {
                setLoading(false)
            }
        }

        load()
    }, [])

    const handleRemoveFromWishlist = async (id) => {
        try {
            await removeCarFromWishlist(id)
            setWishlist((prev) => prev.filter((car) => car._id !== id))
        } catch (error) {
            toast.error(error.response?.data?.message || 'Unable to remove this car right now.')
        }
    }

    const handleClearAll = async () => {
        try {
            await clearWishlist()
            setWishlist([])
        } catch (error) {
            toast.error(error.response?.data?.message || 'Unable to clear wishlist right now.')
        }
    }

    const wishlistLimit = subscription?.usage?.wishlistLimit || subscription?.limits?.wishlistLimit || 'unlimited'
    const showCounter = !isUnlimitedLimit(wishlistLimit)

    return (
        <div className="min-h-screen px-6 py-10" style={{ background: '#0a0a0f', fontFamily: "'Syne', sans-serif" }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500&display=swap');
                .wish-card { transition: all 0.3s cubic-bezier(0.4,0,0.2,1); border: 1px solid rgba(255,255,255,0.07); }
                .wish-card:hover { transform: translateY(-4px); border-color: rgba(99,102,241,0.3); box-shadow: 0 20px 60px rgba(0,0,0,0.4); }
            `}</style>

            <div className="mx-auto max-w-5xl">
                <div className="mb-10 flex items-center justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-indigo-400">My Collection</p>
                        <h1 className="mt-2 text-4xl font-extrabold text-white">Wishlist</h1>
                        <p className="mt-3 text-sm text-white/45" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                            {loading ? 'Loading your saved cars...' : `${wishlist.length} ${wishlist.length === 1 ? 'car' : 'cars'} saved`}
                        </p>
                        {subscription && (
                            <p className="mt-2 text-sm text-sky-200" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                {formatPlanName(subscription.plan)} plan{showCounter ? ` • ${wishlist.length}/${formatLimitValue(wishlistLimit)} saved` : ' • Unlimited wishlist'}
                            </p>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <Link
                            to="/user/subscription"
                            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white"
                            style={{ fontFamily: "'DM Sans', sans-serif" }}
                        >
                            Manage Plan
                        </Link>
                        {wishlist.length > 0 && (
                            <button
                                onClick={handleClearAll}
                                className="rounded-xl border border-rose-300/20 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-200"
                                style={{ fontFamily: "'DM Sans', sans-serif" }}
                            >
                                Clear All
                            </button>
                        )}
                    </div>
                </div>

                {!loading && wishlist.length === 0 && (
                    <div className="rounded-[28px] border border-white/10 bg-white/[0.03] py-24 text-center">
                        <h3 className="text-xl font-bold text-white">No saved cars yet</h3>
                        <p className="mt-3 text-sm text-white/45" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                            Browse cars and tap the wishlist button to save them here.
                        </p>
                        <button
                            onClick={() => navigate('/user/search')}
                            className="mt-8 rounded-xl bg-[linear-gradient(135deg,#6366f1,#8b5cf6)] px-8 py-3 text-sm font-semibold text-white"
                            style={{ fontFamily: "'DM Sans', sans-serif" }}
                        >
                            Browse Cars
                        </button>
                    </div>
                )}

                {wishlist.length > 0 && (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {wishlist.map((car) => (
                            <div key={car._id} className="wish-card overflow-hidden rounded-2xl bg-white/[0.03]">
                                <div className="relative h-44 cursor-pointer overflow-hidden" onClick={() => navigate(`/user/car/${car._id}`)}>
                                    <img
                                        src={getCarImage(car)}
                                        alt={car.name}
                                        className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                                        onError={(event) => { event.target.src = FALLBACK }}
                                    />
                                    <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(10,10,15,0.92)_100%)]" />
                                    <button
                                        onClick={(event) => { event.stopPropagation(); handleRemoveFromWishlist(car._id) }}
                                        className="absolute right-3 top-3 rounded-full border border-rose-300/30 bg-rose-500/20 px-3 py-1 text-xs font-semibold text-rose-100"
                                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                                    >
                                        Remove
                                    </button>
                                    <div className="absolute bottom-3 left-3 rounded-full bg-indigo-500/80 px-2.5 py-1 text-xs font-bold text-white">
                                        {car.type}
                                    </div>
                                </div>

                                <div className="p-4">
                                    <h3 className="text-base font-bold text-white">{car.name}</h3>
                                    <p className="mt-1 text-xs text-white/45" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                        {car.brand} • {car.fuel}{car.rating ? ` • ${car.rating}/5` : ''}
                                    </p>
                                    <div className="mt-5 flex items-center justify-between gap-3">
                                        <p className="text-lg font-bold text-indigo-300">Rs {car.price?.toLocaleString('en-IN')}</p>
                                        <button
                                            onClick={() => navigate(`/user/car/${car._id}`)}
                                            className="rounded-lg bg-[linear-gradient(135deg,#6366f1,#8b5cf6)] px-4 py-2 text-xs font-semibold text-white"
                                            style={{ fontFamily: "'DM Sans', sans-serif" }}
                                        >
                                            View
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {wishlist.length >= 2 && (
                    <div className="mt-10 flex items-center justify-between gap-4 rounded-[28px] border border-indigo-300/20 bg-indigo-400/10 p-6">
                        <div>
                            <p className="text-white font-bold">Ready to compare?</p>
                            <p className="mt-2 text-sm text-white/55" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                You have {wishlist.length} saved cars ready for a side-by-side review.
                            </p>
                        </div>
                        <button
                            onClick={() => navigate('/user/compare')}
                            className="rounded-xl bg-[linear-gradient(135deg,#6366f1,#8b5cf6)] px-6 py-3 text-sm font-bold text-white"
                            style={{ fontFamily: "'DM Sans', sans-serif" }}
                        >
                            Compare Now
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

export default Wishlist
