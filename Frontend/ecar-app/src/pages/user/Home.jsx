import React, { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axiosInstance from '../../utils/axiosInstance'
import RecentlyViewedStrip from '../../components/user/RecentlyViewedStrip'
import { getCarImage } from '../../utils/carImageUtils'
import { getRecentlyViewedCars } from '../../utils/recentlyViewed'
import { getName, isAuthenticated, clearAuth } from '../../utils/auth'

const Home = () => {
    const navigate = useNavigate()
    const token = isAuthenticated()
    const name = getName()
    const initials = name.charAt(0).toUpperCase()
    const [featuredCars, setFeaturedCars] = useState([])
    const [recentlyViewed, setRecentlyViewed] = useState([])
    const [loading, setLoading] = useState(true)
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const dropdownRef = useRef(null)

    useEffect(() => {
        const fetchFeatured = async () => {
            try {
                const res = await axiosInstance.get('/car/cars')
                setFeaturedCars(res.data.data.slice(0, 3))
            } catch (err) {
                console.log(err)
            } finally {
                setLoading(false)
            }
        }
        fetchFeatured()
        setRecentlyViewed(getRecentlyViewedCars())
    }, [])

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleLogout = () => {
        clearAuth()
        navigate('/login')
    }

    return (
        <div className="min-h-screen" style={{ background: '#0a0a0f', fontFamily: "'Syne', sans-serif" }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
                .nav-link { transition: color 0.2s; font-family: 'DM Sans', sans-serif; }
                .nav-link:hover { color: white !important; }
                .feat-card { transition: all 0.3s cubic-bezier(0.4,0,0.2,1); border: 1px solid rgba(255,255,255,0.07); }
                .feat-card:hover { transform: translateY(-6px); border-color: rgba(99,102,241,0.35); box-shadow: 0 24px 60px rgba(0,0,0,0.5); }
                .feat-card:hover .feat-img { transform: scale(1.06); }
                .feat-img { transition: transform 0.4s ease; }
                .hero-btn { transition: all 0.3s ease; }
                .hero-btn:hover { transform: translateY(-2px); }
                .stat-card { transition: all 0.3s; }
                .stat-card:hover { transform: translateY(-4px); }
                .feature-card { transition: all 0.25s; border: 1px solid rgba(255,255,255,0.07); }
                .feature-card:hover { border-color: rgba(99,102,241,0.3); transform: translateY(-3px); }
                .drop-in { animation: dropIn 0.2s cubic-bezier(0.4,0,0.2,1); }
                @keyframes dropIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
                .noise { background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E"); }
            `}</style>

            {/* Navbar */}
            <nav className="sticky top-0 z-50 px-6 py-0"
                style={{ background: 'rgba(10,10,15,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="max-w-7xl mx-auto flex justify-between items-center h-16">
                    <div className="flex items-center gap-2.5 cursor-pointer group" onClick={() => navigate('/')}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base transition-transform group-hover:scale-110"
                            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>🚗</div>
                        <h1 className="text-white font-bold text-lg tracking-tight">E‑CAR</h1>
                    </div>

                    <ul className="hidden md:flex gap-8 items-center">
                        {[
                            { to: '/', label: 'Home' },
                            { to: '/user/search', label: 'Search Cars' },
                            { to: '/user/compare', label: 'Compare' },
                        ].map(({ to, label }) => (
                            <li key={to}>
                                <Link to={to} className="nav-link text-sm font-medium" style={{ color: 'rgba(255,255,255,0.55)' }}>{label}</Link>
                            </li>
                        ))}

                        {token ? (
                            <li className="relative" ref={dropdownRef}>
                                <button
                                    onClick={() => setDropdownOpen(!dropdownOpen)}
                                    className="w-9 h-9 rounded-full text-white font-bold text-sm flex items-center justify-center transition-all hover:scale-110"
                                    style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 0 0 2px rgba(99,102,241,0.4)' }}>
                                    {initials}
                                </button>
                                {dropdownOpen && (
                                    <div className="drop-in absolute right-0 mt-3 w-52 rounded-2xl py-2 shadow-2xl z-50"
                                        style={{ background: '#161625', border: '1px solid rgba(255,255,255,0.08)' }}>
                                        <div className="px-4 py-3 mb-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                            <p className="text-white text-sm font-semibold">{name}</p>
                                            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>User Account</p>
                                        </div>
                                        {[
                                            { label: '📊 Dashboard', path: '/user/dashboard' },
                                            { label: '❤️ Wishlist', path: '/user/wishlist' },
                                            { label: '👤 Profile', path: '/user/profile' },
                                        ].map(item => (
                                            <button key={item.path}
                                                onClick={() => { setDropdownOpen(false); navigate(item.path) }}
                                                className="w-full text-left px-4 py-2.5 text-sm transition-colors"
                                                style={{ color: 'rgba(255,255,255,0.65)', fontFamily: "'DM Sans', sans-serif" }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                {item.label}
                                            </button>
                                        ))}
                                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 4, paddingTop: 4 }}>
                                            <button onClick={handleLogout}
                                                className="w-full text-left px-4 py-2.5 text-sm"
                                                style={{ color: '#f87171', fontFamily: "'DM Sans', sans-serif" }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                🚪 Sign Out
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </li>
                        ) : (
                            <li>
                                <button onClick={() => navigate('/login')}
                                    className="px-5 py-2 rounded-xl text-sm font-bold text-white transition-all hover:scale-105"
                                    style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                                    Login →
                                </button>
                            </li>
                        )}
                    </ul>
                </div>
            </nav>

            {/* Hero */}
            <div className="relative h-[600px] overflow-hidden">
                <img src="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1600&q=90"
                    alt="hero" className="w-full h-full object-cover" />
                <div className="absolute inset-0"
                    style={{ background: 'linear-gradient(135deg, rgba(10,10,15,0.9) 0%, rgba(10,10,15,0.5) 50%, rgba(99,102,241,0.15) 100%)' }} />
                <div className="noise absolute inset-0" />
                <div className="absolute inset-0 opacity-10"
                    style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

                <div className="absolute inset-0 flex flex-col justify-center px-8 md:px-20">
                    {token && (
                        <p className="font-semibold mb-4 text-base" style={{ color: '#fbbf24' }}>👋 Hi, {name}!</p>
                    )}
                    <p className="text-xs font-bold uppercase tracking-[0.2em] mb-4" style={{ color: '#818cf8' }}>
                        Welcome to E-CAR
                    </p>
                    <h1 className="text-white font-extrabold mb-5 leading-none"
                        style={{ fontSize: 'clamp(3rem, 7vw, 5.5rem)', letterSpacing: '-0.04em' }}>
                        Find Your<br /><span style={{ color: '#818cf8' }}>Perfect Car.</span>
                    </h1>
                    <p className="mb-8 max-w-md" style={{ color: 'rgba(255,255,255,0.55)', fontFamily: "'DM Sans', sans-serif", fontSize: '1.1rem', fontWeight: 300 }}>
                        Search, compare and choose the best car based on your priorities and budget.
                    </p>
                    <div className="flex flex-wrap gap-4">
                        <button className="hero-btn px-8 py-3.5 rounded-xl font-bold text-white text-sm"
                            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 8px 30px rgba(99,102,241,0.4)' }}
                            onClick={() => token ? navigate('/user/search') : navigate('/login')}>
                            Search Cars →
                        </button>
                        <button className="hero-btn px-8 py-3.5 rounded-xl font-bold text-sm text-white"
                            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)' }}
                            onClick={() => token ? navigate('/user/compare') : navigate('/login')}>
                            Compare Cars
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="py-10 px-4" style={{ background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="max-w-4xl mx-auto grid grid-cols-3 gap-4 text-center">
                    {[
                        { value: '500+', label: 'Cars Listed' },
                        { value: '50+', label: 'Brands' },
                        { value: '10K+', label: 'Happy Users' },
                    ].map((stat, i) => (
                        <div key={i} className="stat-card py-6 px-4 rounded-2xl"
                            style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
                            <p className="font-extrabold text-white mb-1" style={{ fontSize: '2rem', letterSpacing: '-0.03em' }}>{stat.value}</p>
                            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'DM Sans', sans-serif" }}>{stat.label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Features */}
            <div className="max-w-6xl mx-auto py-20 px-4">
                <div className="text-center mb-12">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] mb-3" style={{ color: '#6366f1' }}>Why E-CAR</p>
                    <h2 className="text-white font-extrabold text-3xl" style={{ letterSpacing: '-0.03em' }}>Everything You Need to Choose Right</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        { icon: '🔍', title: 'Smart Search', desc: 'Filter by brand, type, fuel, transmission and budget.' },
                        { icon: '⚖️', title: 'Side-by-Side Compare', desc: 'Compare multiple cars — specs, price, mileage, engine in one view.' },
                        { icon: '🤖', title: 'AI Advisor', desc: 'Get personalized car recommendations powered by Claude AI.' },
                    ].map((f, i) => (
                        <div key={i} className="feature-card p-8 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                            <div className="text-4xl mb-5">{f.icon}</div>
                            <h3 className="text-white font-bold text-lg mb-2">{f.title}</h3>
                            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)', fontFamily: "'DM Sans', sans-serif" }}>{f.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Featured Cars — fully API driven, uses getCarImage */}
            <div className="py-20 px-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="max-w-6xl mx-auto">
                    <div className="flex justify-between items-end mb-10">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.2em] mb-2" style={{ color: '#6366f1' }}>Our Collection</p>
                            <h2 className="text-white font-extrabold text-3xl" style={{ letterSpacing: '-0.03em' }}>Featured Cars</h2>
                        </div>
                        <button onClick={() => token ? navigate('/user/search') : navigate('/login')}
                            className="text-sm font-semibold transition-all hover:scale-105"
                            style={{ color: '#818cf8', fontFamily: "'DM Sans', sans-serif" }}>
                            View all →
                        </button>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                    <div className="h-48 animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
                                    <div className="p-5 space-y-2">
                                        <div className="h-4 rounded-lg animate-pulse w-3/4" style={{ background: 'rgba(255,255,255,0.06)' }} />
                                        <div className="h-3 rounded-lg animate-pulse w-1/2" style={{ background: 'rgba(255,255,255,0.06)' }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : featuredCars.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {featuredCars.map(car => (
                                <div key={car._id}
                                    className="feat-card rounded-2xl overflow-hidden cursor-pointer"
                                    style={{ background: 'rgba(255,255,255,0.04)' }}
                                    onClick={() => token ? navigate(`/user/car/${car._id}`) : navigate('/login')}>
                                    <div className="relative h-48 overflow-hidden">
                                        <img
                                            src={getCarImage(car)}
                                            alt={car.name}
                                            className="feat-img w-full h-full object-cover"
                                            onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=600&q=80' }}
                                        />
                                        <div className="absolute inset-0"
                                            style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(10,10,15,0.9) 100%)' }} />
                                        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold text-white"
                                            style={{ background: 'rgba(99,102,241,0.85)', backdropFilter: 'blur(8px)' }}>
                                            {car.type}
                                        </div>
                                        <div className="absolute bottom-3 left-3">
                                            <p className="text-white font-bold">{car.name}</p>
                                            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)', fontFamily: "'DM Sans', sans-serif" }}>{car.brand} · {car.fuel}</p>
                                        </div>
                                    </div>
                                    <div className="p-4 flex justify-between items-center">
                                        <p className="font-bold text-lg" style={{ color: '#818cf8', fontFamily: "'Syne', sans-serif" }}>
                                            ₹{car.price?.toLocaleString('en-IN')}
                                        </p>
                                        <p style={{ color: '#fbbf24', fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}>
                                            {car.rating ? `⭐ ${car.rating}` : ''}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16 rounded-2xl"
                            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
                            <p className="text-4xl mb-3">🚗</p>
                            <p className="text-white font-bold mb-1">No cars added yet</p>
                            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: "'DM Sans', sans-serif" }}>
                                Add cars from the admin dashboard
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <div className="px-4 pb-4">
                <div className="max-w-6xl mx-auto">
                    <RecentlyViewedStrip cars={recentlyViewed} title="Recently Viewed Cars" eyebrow="Continue Exploring" />
                </div>
            </div>

            {/* CTA */}
            <div className="py-20 px-4 text-center" style={{ background: 'rgba(99,102,241,0.06)', borderTop: '1px solid rgba(99,102,241,0.15)' }}>
                <p className="text-xs font-bold uppercase tracking-[0.2em] mb-4" style={{ color: '#6366f1' }}>Get Started</p>
                <h2 className="text-white font-extrabold mb-4" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', letterSpacing: '-0.03em' }}>
                    Ready to Find Your Dream Car?
                </h2>
                <p className="mb-8 max-w-md mx-auto" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'DM Sans', sans-serif" }}>
                    Join thousands of users who found their perfect car on E-CAR
                </p>
                {token ? (
                    <button onClick={() => navigate('/user/search')}
                        className="px-10 py-3.5 rounded-xl font-bold text-white text-sm transition-all hover:scale-105"
                        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 8px 30px rgba(99,102,241,0.4)' }}>
                        Browse Cars →
                    </button>
                ) : (
                    <div className="flex gap-4 justify-center flex-wrap">
                        <button onClick={() => navigate('/signup')}
                            className="px-10 py-3.5 rounded-xl font-bold text-white text-sm transition-all hover:scale-105"
                            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 8px 30px rgba(99,102,241,0.4)' }}>
                            Get Started Free
                        </button>
                        <button onClick={() => navigate('/login')}
                            className="px-10 py-3.5 rounded-xl font-bold text-white text-sm transition-all hover:scale-105"
                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)' }}>
                            Login
                        </button>
                    </div>
                )}
            </div>

            {/* Footer */}
            <footer className="py-8 text-center text-sm" style={{ background: 'rgba(0,0,0,0.3)', borderTop: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)', fontFamily: "'DM Sans', sans-serif" }}>
                © 2026 E-CAR. All rights reserved.
            </footer>
        </div>
    )
}

export default Home
