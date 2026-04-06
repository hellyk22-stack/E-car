import React, { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { useNavigate, useParams } from 'react-router-dom'
import axiosInstance from '../../utils/axiosInstance'
import PriceHistoryChart from '../../components/user/PriceHistoryChart'
import { getCarImage } from '../../utils/carImageUtils'
import { logCarView } from '../../utils/analyticsEvents'
import { addRecentlyViewedCar } from '../../utils/recentlyViewed'
import { getToken, getUserId } from '../../utils/auth'
import { addCarToWishlist, isCarWishlisted, removeCarFromWishlist } from '../../utils/wishlistApi'

const fuelColor = { Petrol: '#f59e0b', Diesel: '#3b82f6', Electric: '#10b981' }
const typeColor = { Hatchback: '#8b5cf6', Sedan: '#6366f1', SUV: '#ec4899', Luxury: '#f59e0b' }
const defaultReviewForm = { rating: 5, title: '', comment: '' }
const defaultFuelPriceByFuel = { Petrol: 102, Diesel: 90, Electric: 9 }
const insuranceRateByType = { Hatchback: 0.026, Sedan: 0.029, SUV: 0.033, Luxury: 0.042 }

const formatCurrency = (value) => `Rs ${Math.round(value || 0).toLocaleString('en-IN')}`

const calculateEmi = (principal, annualRate, years) => {
    const months = years * 12

    if (!principal || !months) {
        return { emi: 0, totalInterest: 0, totalPayable: 0 }
    }

    const monthlyRate = annualRate / 12 / 100
    if (!monthlyRate) {
        const emi = principal / months
        return { emi, totalInterest: 0, totalPayable: principal }
    }

    const growthFactor = (1 + monthlyRate) ** months
    const emi = (principal * monthlyRate * growthFactor) / (growthFactor - 1)
    const totalPayable = emi * months
    const totalInterest = totalPayable - principal

    return { emi, totalInterest, totalPayable }
}

const formatReviewDate = (value) => {
    if (!value) return 'Recently'
    return new Date(value).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    })
}

const getMaintenanceRate = (car) => {
    if (car?.type === 'Luxury') return 0.028
    if (car?.fuel === 'Electric') return 0.014
    if (car?.fuel === 'Diesel') return 0.022
    return 0.018
}

const buildOwnershipProjection = (car, cityKmPerDay, fuelPrice) => {
    if (!car) {
        return {
            annualFuelCost: 0,
            annualInsuranceCost: 0,
            annualMaintenanceCost: 0,
            yearlyCosts: [],
            fiveYearRunningCost: 0,
            fiveYearTotalCost: 0,
            maxYearlyCost: 0,
        }
    }

    const effectiveMileage = Number(car.mileage) > 0 ? Number(car.mileage) : car.fuel === 'Electric' ? 6 : 14
    const annualDistance = Math.max(Number(cityKmPerDay || 0), 0) * 365
    const annualFuelCost = (annualDistance / effectiveMileage) * Number(fuelPrice || 0)
    const annualInsuranceCost = Math.max(Number(car.price || 0) * (insuranceRateByType[car.type] || 0.03), 18000)
    const annualMaintenanceCost = Math.max(Number(car.price || 0) * getMaintenanceRate(car), 12000)

    const yearlyCosts = Array.from({ length: 5 }, (_, index) => {
        const year = index + 1
        const fuel = annualFuelCost * Math.pow(1.06, index)
        const insurance = annualInsuranceCost * Math.pow(1.04, index)
        const maintenance = annualMaintenanceCost * Math.pow(1.08, index)
        const total = fuel + insurance + maintenance

        return { year, fuel, insurance, maintenance, total }
    })

    const fiveYearRunningCost = yearlyCosts.reduce((sum, item) => sum + item.total, 0)
    const fiveYearTotalCost = Number(car.price || 0) + fiveYearRunningCost
    const maxYearlyCost = Math.max(...yearlyCosts.map((item) => item.total), 1)

    return {
        annualFuelCost,
        annualInsuranceCost,
        annualMaintenanceCost,
        yearlyCosts,
        fiveYearRunningCost,
        fiveYearTotalCost,
        maxYearlyCost,
    }
}

const CarDetail = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const [car, setCar] = useState(null)
    const [loading, setLoading] = useState(true)
    const [inWishlist, setInWishlist] = useState(false)
    const [activeTab, setActiveTab] = useState('specs')
    const [imgError, setImgError] = useState(false)
    const [reviews, setReviews] = useState([])
    const [priceHistory, setPriceHistory] = useState([])
    const [reviewsLoading, setReviewsLoading] = useState(false)
    const [reviewSubmitting, setReviewSubmitting] = useState(false)
    const [reviewForm, setReviewForm] = useState(defaultReviewForm)
    const [emiInputs, setEmiInputs] = useState({
        downPaymentPercent: 20,
        interestRate: 9.5,
        tenureYears: 5,
    })
    const [ownershipInputs, setOwnershipInputs] = useState({
        cityKmPerDay: 24,
        fuelPrice: '',
    })

    const currentUserId = getUserId()
    const canReview = !!getToken()

    const myReview = useMemo(
        () => reviews.find((review) => review.userId?._id === currentUserId),
        [reviews, currentUserId],
    )

    useEffect(() => {
        refreshCarAndReviews()
        logCarView(id)
        isCarWishlisted(id)
            .then((value) => setInWishlist(value))
            .catch((err) => console.error('Wishlist status fetch failed', err))
    }, [id])

    useEffect(() => {
        if (myReview) {
            setReviewForm({
                rating: myReview.rating || 5,
                title: myReview.title || '',
                comment: myReview.comment || '',
            })
        } else {
            setReviewForm(defaultReviewForm)
        }
    }, [myReview])

    useEffect(() => {
        if (car?.fuel) {
            setOwnershipInputs((prev) => (
                prev.fuelPrice === ''
                    ? { ...prev, fuelPrice: defaultFuelPriceByFuel[car.fuel] || 100 }
                    : prev
            ))
        }
    }, [car?.fuel])

    useEffect(() => {
        if (car?._id) {
            addRecentlyViewedCar({
                _id: car._id,
                name: car.name,
                brand: car.brand,
                type: car.type,
                fuel: car.fuel,
                price: car.price,
                image: car.image,
                rating: car.rating,
            })
        }
    }, [car])

    const refreshCarAndReviews = async () => {
        setLoading(true)
        try {
            const [carRes, reviewsRes, priceHistoryRes] = await Promise.all([
                axiosInstance.get(`/car/car/${id}`),
                axiosInstance.get(`/review/car/${id}`),
                axiosInstance.get(`/car/car/${id}/price-history`),
            ])

            setCar(carRes.data.data)
            setReviews(reviewsRes.data.data || [])
            setPriceHistory(priceHistoryRes.data.data || [])
        } catch (err) {
            console.error('Error fetching car detail data', err)
        } finally {
            setLoading(false)
        }
    }

    const refreshReviews = async () => {
        setReviewsLoading(true)
        try {
            const [carRes, reviewsRes, priceHistoryRes] = await Promise.all([
                axiosInstance.get(`/car/car/${id}`),
                axiosInstance.get(`/review/car/${id}`),
                axiosInstance.get(`/car/car/${id}/price-history`),
            ])

            setCar(carRes.data.data)
            setReviews(reviewsRes.data.data || [])
            setPriceHistory(priceHistoryRes.data.data || [])
        } catch (err) {
            console.error('Error refreshing reviews', err)
            toast.error('Unable to refresh reviews right now.')
        } finally {
            setReviewsLoading(false)
        }
    }

    const toggleWishlist = async () => {
        try {
            if (inWishlist) {
                await removeCarFromWishlist(car._id)
                setInWishlist(false)
            } else {
                await addCarToWishlist(car._id)
                setInWishlist(true)
            }
        } catch (err) {
            console.error('Wishlist toggle failed', err)
            toast.error('Unable to update wishlist right now.')
        }
    }

    const handleReviewChange = (event) => {
        const { name, value } = event.target
        setReviewForm((prev) => ({
            ...prev,
            [name]: name === 'rating' ? Number(value) : value,
        }))
    }

    const handleReviewSubmit = async (event) => {
        event.preventDefault()

        if (!canReview) {
            toast.info('Please log in to add your review.')
            navigate('/login')
            return
        }

        if (!reviewForm.comment.trim()) {
            toast.error('Please add a short review comment.')
            return
        }

        setReviewSubmitting(true)
        try {
            if (myReview?._id) {
                await axiosInstance.put(`/review/${myReview._id}`, {
                    rating: reviewForm.rating,
                    title: reviewForm.title.trim(),
                    comment: reviewForm.comment.trim(),
                })
                toast.success('Your review was updated.')
            } else {
                await axiosInstance.post(`/review/car/${id}`, {
                    rating: reviewForm.rating,
                    title: reviewForm.title.trim(),
                    comment: reviewForm.comment.trim(),
                })
                toast.success('Your review was added.')
            }

            await refreshReviews()
        } catch (err) {
            console.error('Review submit failed', err)
            toast.error(err.response?.data?.message || 'Unable to save your review.')
        } finally {
            setReviewSubmitting(false)
        }
    }

    const handleDeleteReview = async () => {
        if (!myReview?._id) return

        setReviewSubmitting(true)
        try {
            await axiosInstance.delete(`/review/${myReview._id}`)
            toast.success('Your review was removed.')
            setReviewForm(defaultReviewForm)
            await refreshReviews()
        } catch (err) {
            console.error('Review delete failed', err)
            toast.error(err.response?.data?.message || 'Unable to delete your review.')
        } finally {
            setReviewSubmitting(false)
        }
    }

    const handleOwnershipInputChange = (event) => {
        const { name, value } = event.target
        setOwnershipInputs((prev) => ({
            ...prev,
            [name]: Number(value),
        }))
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
                <div className="text-center">
                    <div className="w-12 h-12 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p style={{ color: 'rgba(255,255,255,0.45)', fontFamily: "'DM Sans', sans-serif" }}>Loading car details...</p>
                </div>
            </div>
        )
    }

    if (!car) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
                <div className="text-center">
                    <h2 className="text-white text-xl font-bold mb-2" style={{ fontFamily: "'Syne', sans-serif" }}>Car not found</h2>
                    <button
                        onClick={() => navigate('/user/search')}
                        className="mt-4 px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
                        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                    >
                        Back to Search
                    </button>
                </div>
            </div>
        )
    }

    const heroImg = imgError
        ? 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&q=80'
        : getCarImage(car)

    const specs = [
        { label: 'Engine', value: car.engine ? `${car.engine} cc` : '--' },
        { label: 'Mileage', value: car.mileage ? `${car.mileage} kmpl` : '--' },
        { label: 'Seating', value: car.seating ? `${car.seating} seats` : '--' },
        { label: 'Fuel Type', value: car.fuel || '--' },
        { label: 'Transmission', value: car.transmission || '--' },
        { label: 'Rating', value: car.rating ? `${car.rating} / 5` : 'No ratings yet' },
        { label: 'Reviews', value: `${car.reviewCount || 0}` },
        { label: 'Brand', value: car.brand || '--' },
    ]

    const downPayment = (car.price || 0) * (emiInputs.downPaymentPercent / 100)
    const principal = Math.max((car.price || 0) - downPayment, 0)
    const emiSummary = calculateEmi(principal, emiInputs.interestRate, emiInputs.tenureYears)
    const totalCost = downPayment + emiSummary.totalPayable
    const paymentSplitTotal = downPayment + principal + emiSummary.totalInterest || 1
    const downPaymentWidth = `${(downPayment / paymentSplitTotal) * 100}%`
    const principalWidth = `${(principal / paymentSplitTotal) * 100}%`
    const interestWidth = `${(emiSummary.totalInterest / paymentSplitTotal) * 100}%`
    const effectiveFuelPrice = Number(ownershipInputs.fuelPrice || defaultFuelPriceByFuel[car.fuel] || 0)
    const ownershipProjection = buildOwnershipProjection(car, ownershipInputs.cityKmPerDay, effectiveFuelPrice)
    const ownershipPriceLabel = car.fuel === 'Electric' ? 'Electricity Price (Rs/unit)' : 'Fuel Price (Rs/litre)'

    return (
        <div className="min-h-screen" style={{ background: '#0a0a0f', fontFamily: "'Syne', sans-serif" }}>
            <style>{`
                .spec-card { transition: all 0.25s ease; border: 1px solid rgba(255,255,255,0.07); }
                .spec-card:hover { transform: translateY(-3px); border-color: rgba(99,102,241,0.4); background: rgba(99,102,241,0.08) !important; }
                .tab-btn { transition: all 0.2s ease; position: relative; }
                .tab-btn.active::after { content: ''; position: absolute; bottom: -1px; left: 0; right: 0; height: 2px; background: #6366f1; border-radius: 999px; }
                .wish-btn { transition: all 0.25s ease; }
                .wish-btn:hover { transform: scale(1.03); }
                .review-card { transition: border-color 0.2s ease, transform 0.2s ease; }
                .review-card:hover { transform: translateY(-2px); border-color: rgba(129,140,248,0.25); }
                @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
                .fade-up { animation: fadeUp 0.45s ease forwards; }
                .noise { background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E"); }
            `}</style>

            <div className="relative h-72 md:h-96 overflow-hidden">
                <img
                    src={heroImg}
                    alt={car.name}
                    className="w-full h-full object-cover"
                    onError={() => setImgError(true)}
                />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(10,10,15,0.22) 0%, rgba(10,10,15,0.95) 100%)' }} />
                <div className="noise absolute inset-0" />

                <button
                    onClick={() => navigate(-1)}
                    className="absolute top-6 left-6 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white"
                    style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.15)', fontFamily: "'DM Sans', sans-serif" }}
                >
                    Back
                </button>

                <button
                    onClick={toggleWishlist}
                    className="wish-btn absolute top-6 right-6 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
                    style={{ background: inWishlist ? 'rgba(239,68,68,0.24)' : 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', border: `1px solid ${inWishlist ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.15)'}`, fontFamily: "'DM Sans', sans-serif" }}
                >
                    {inWishlist ? 'Saved' : 'Save'}
                </button>

                <div className="absolute bottom-0 left-0 right-0 p-8">
                    <div className="max-w-5xl mx-auto">
                        <div className="flex flex-wrap gap-2 mb-3">
                            <span className="px-3 py-1 rounded-full text-xs font-bold text-white" style={{ background: typeColor[car.type] || '#6366f1' }}>
                                {car.type}
                            </span>
                            <span className="px-3 py-1 rounded-full text-xs font-bold text-white" style={{ background: fuelColor[car.fuel] || '#6366f1' }}>
                                {car.fuel}
                            </span>
                            {car.transmission && (
                                <span className="px-3 py-1 rounded-full text-xs font-bold text-white" style={{ background: 'rgba(255,255,255,0.15)' }}>
                                    {car.transmission}
                                </span>
                            )}
                        </div>
                        <h1 className="text-white font-extrabold mb-2" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', letterSpacing: '-0.03em', lineHeight: 1.05 }}>
                            {car.name}
                        </h1>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontFamily: "'DM Sans', sans-serif" }}>
                            {car.brand} · {car.rating || 0}/5 rating · {car.reviewCount || 0} review{car.reviewCount === 1 ? '' : 's'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-6 py-8 fade-up">
                <div
                    className="flex flex-wrap items-center justify-between gap-4 mb-10 p-6 rounded-2xl"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                    <div>
                        <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: "'DM Sans', sans-serif" }}>
                            Starting Price
                        </p>
                        <p className="font-extrabold" style={{ fontSize: '2.5rem', color: '#818cf8', letterSpacing: '-0.03em' }}>
                            Rs {car.price?.toLocaleString('en-IN')}
                        </p>
                        <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: "'DM Sans', sans-serif" }}>
                            Ex-showroom price
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:flex">
                        {[
                            { label: 'Rating', value: `${car.rating || 0}/5` },
                            { label: 'Reviews', value: `${car.reviewCount || 0}` },
                        ].map((item) => (
                            <div
                                key={item.label}
                                className="rounded-2xl px-4 py-3"
                                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                            >
                                <p className="text-[11px] uppercase tracking-[0.24em]" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: "'DM Sans', sans-serif" }}>
                                    {item.label}
                                </p>
                                <p className="text-lg font-bold text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>{item.value}</p>
                            </div>
                        ))}
                        <button
                            onClick={() => navigate('/user/compare')}
                            className="px-5 py-3 rounded-xl font-semibold text-sm"
                            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', fontFamily: "'DM Sans', sans-serif" }}
                        >
                            Compare
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap gap-6 mb-8" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    {[
                        { id: 'specs', label: 'Specifications' },
                        { id: 'overview', label: 'Overview' },
                        { id: 'emi', label: 'EMI Calculator' },
                        { id: 'price', label: 'Price History' },
                        { id: 'ownership', label: 'Cost of Ownership' },
                        { id: 'reviews', label: `Reviews (${car.reviewCount || 0})` },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`tab-btn pb-3 text-sm font-semibold transition-colors ${activeTab === tab.id ? 'active text-white' : 'text-gray-500 hover:text-gray-300'}`}
                            style={{ fontFamily: "'DM Sans', sans-serif" }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {activeTab === 'specs' && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {specs.map((spec) => (
                            <div key={spec.label} className="spec-card p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                                <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: "'DM Sans', sans-serif" }}>
                                    {spec.label}
                                </p>
                                <p className="text-white font-bold text-base" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                    {spec.value}
                                </p>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'overview' && (
                    <div className="space-y-4">
                        <div className="p-6 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                            <h3 className="text-white font-bold text-lg mb-3">About {car.name}</h3>
                            <p style={{ color: 'rgba(255,255,255,0.58)', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.8 }}>
                                The {car.name} by {car.brand} is a {car.type?.toLowerCase()} powered by
                                {car.engine ? ` a ${car.engine}cc` : ''} {car.fuel?.toLowerCase()} setup.
                                {car.mileage ? ` It delivers ${car.mileage} kmpl` : ''}
                                {car.seating ? ` with seating for ${car.seating}` : ''},
                                making it a strong option for buyers looking for value, comfort, and everyday usability.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-5 rounded-2xl" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                                <p className="text-xs uppercase tracking-wider mb-1" style={{ color: '#a5b4fc', fontFamily: "'DM Sans', sans-serif" }}>Mileage</p>
                                <p className="text-white font-bold text-2xl" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                    {car.mileage || '--'} <span className="text-sm font-normal" style={{ color: 'rgba(255,255,255,0.45)' }}>kmpl</span>
                                </p>
                            </div>
                            <div className="p-5 rounded-2xl" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                                <p className="text-xs uppercase tracking-wider mb-1" style={{ color: '#6ee7b7', fontFamily: "'DM Sans', sans-serif" }}>Average Rating</p>
                                <p className="font-bold text-2xl" style={{ color: '#6ee7b7', fontFamily: "'DM Sans', sans-serif" }}>
                                    {car.rating || 0}<span className="text-sm font-normal" style={{ color: 'rgba(255,255,255,0.45)' }}>/5</span>
                                </p>
                            </div>
                            <div className="p-5 rounded-2xl" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                                <p className="text-xs uppercase tracking-wider mb-1" style={{ color: '#fcd34d', fontFamily: "'DM Sans', sans-serif" }}>Community Reviews</p>
                                <p className="font-bold text-2xl text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>{car.reviewCount || 0}</p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'emi' && (
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                        <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                            <div className="mb-6">
                                <p className="text-xs uppercase tracking-widest mb-2" style={{ color: 'rgba(129,140,248,0.82)', fontFamily: "'DM Sans', sans-serif" }}>
                                    Monthly Planning
                                </p>
                                <h3 className="text-white text-2xl font-bold mb-2">EMI Calculator</h3>
                                <p style={{ color: 'rgba(255,255,255,0.52)', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.7 }}>
                                    Estimate your monthly outflow using real loan math. Adjust the down payment, interest rate, and tenure to see what this car feels like in monthly EMIs.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <div className="rounded-2xl p-4" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                                    <p className="text-xs uppercase tracking-wider mb-1" style={{ color: '#a5b4fc', fontFamily: "'DM Sans', sans-serif" }}>Estimated EMI</p>
                                    <p className="text-white font-bold text-2xl">{formatCurrency(emiSummary.emi)}</p>
                                    <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.42)', fontFamily: "'DM Sans', sans-serif" }}>per month</p>
                                </div>
                                <div className="rounded-2xl p-4" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                                    <p className="text-xs uppercase tracking-wider mb-1" style={{ color: '#6ee7b7', fontFamily: "'DM Sans', sans-serif" }}>Loan Amount</p>
                                    <p className="text-white font-bold text-2xl">{formatCurrency(principal)}</p>
                                    <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.42)', fontFamily: "'DM Sans', sans-serif" }}>after down payment</p>
                                </div>
                                <div className="rounded-2xl p-4" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                                    <p className="text-xs uppercase tracking-wider mb-1" style={{ color: '#fcd34d', fontFamily: "'DM Sans', sans-serif" }}>Total Interest</p>
                                    <p className="text-white font-bold text-2xl">{formatCurrency(emiSummary.totalInterest)}</p>
                                    <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.42)', fontFamily: "'DM Sans', sans-serif" }}>over full tenure</p>
                                </div>
                            </div>
                            <div className="space-y-5">
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-sm font-semibold text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>Down payment</p>
                                        <p className="text-sm" style={{ color: '#a5b4fc', fontFamily: "'DM Sans', sans-serif" }}>
                                            {emiInputs.downPaymentPercent}% ({formatCurrency(downPayment)})
                                        </p>
                                    </div>
                                    <input
                                        type="range"
                                        min="10"
                                        max="60"
                                        step="5"
                                        value={emiInputs.downPaymentPercent}
                                        onChange={(event) => setEmiInputs((prev) => ({ ...prev, downPaymentPercent: Number(event.target.value) }))}
                                        className="w-full accent-indigo-500"
                                    />
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-sm font-semibold text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>Interest rate</p>
                                        <p className="text-sm" style={{ color: '#a5b4fc', fontFamily: "'DM Sans', sans-serif" }}>
                                            {emiInputs.interestRate.toFixed(1)}% p.a.
                                        </p>
                                    </div>
                                    <input
                                        type="range"
                                        min="7"
                                        max="15"
                                        step="0.1"
                                        value={emiInputs.interestRate}
                                        onChange={(event) => setEmiInputs((prev) => ({ ...prev, interestRate: Number(event.target.value) }))}
                                        className="w-full accent-indigo-500"
                                    />
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-sm font-semibold text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>Loan tenure</p>
                                        <p className="text-sm" style={{ color: '#a5b4fc', fontFamily: "'DM Sans', sans-serif" }}>
                                            {emiInputs.tenureYears} years ({emiInputs.tenureYears * 12} months)
                                        </p>
                                    </div>
                                    <input
                                        type="range"
                                        min="1"
                                        max="7"
                                        step="1"
                                        value={emiInputs.tenureYears}
                                        onChange={(event) => setEmiInputs((prev) => ({ ...prev, tenureYears: Number(event.target.value) }))}
                                        className="w-full accent-indigo-500"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                <p className="text-xs uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: "'DM Sans', sans-serif" }}>
                                    Payment Summary
                                </p>
                                <p className="text-white font-bold text-3xl mb-1">{formatCurrency(totalCost)}</p>
                                <p className="text-sm mb-5" style={{ color: 'rgba(255,255,255,0.45)', fontFamily: "'DM Sans', sans-serif" }}>
                                    Approximate total outflow including down payment
                                </p>

                                <div className="h-3 w-full rounded-full overflow-hidden mb-5" style={{ background: 'rgba(255,255,255,0.07)' }}>
                                    <div className="h-full float-left" style={{ width: downPaymentWidth, background: '#8b5cf6' }} />
                                    <div className="h-full float-left" style={{ width: principalWidth, background: '#6366f1' }} />
                                    <div className="h-full float-left" style={{ width: interestWidth, background: '#f59e0b' }} />
                                </div>

                                <div className="space-y-3">
                                    {[
                                        { label: 'Down payment', value: formatCurrency(downPayment), color: '#8b5cf6' },
                                        { label: 'Principal financed', value: formatCurrency(principal), color: '#6366f1' },
                                        { label: 'Interest paid', value: formatCurrency(emiSummary.totalInterest), color: '#f59e0b' },
                                        { label: 'Total payable via EMIs', value: formatCurrency(emiSummary.totalPayable), color: '#34d399' },
                                    ].map((item) => (
                                        <div key={item.label} className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                                                <span style={{ color: 'rgba(255,255,255,0.62)', fontFamily: "'DM Sans', sans-serif" }}>{item.label}</span>
                                            </div>
                                            <span className="text-white font-semibold" style={{ fontFamily: "'DM Sans', sans-serif" }}>{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-2xl p-6" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.08))', border: '1px solid rgba(99,102,241,0.2)' }}>
                                <p className="text-white font-bold mb-2">Buyer Tip</p>
                                <p style={{ color: 'rgba(255,255,255,0.56)', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.8 }}>
                                    A slightly higher down payment can reduce both your monthly EMI and the total interest burden, which makes it easier to compare affordability across different cars.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'price' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                            <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                <p className="text-xs uppercase tracking-[0.24em] mb-2" style={{ color: '#a5b4fc', fontFamily: "'DM Sans', sans-serif" }}>
                                    Price Timeline
                                </p>
                                <h3 className="text-white text-2xl font-bold mb-2">Track how the asking price moved</h3>
                                <p style={{ color: 'rgba(255,255,255,0.54)', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.8 }}>
                                    Every admin price update is stored with a date, so you can review whether this car became more affordable over time or moved up in value.
                                </p>

                                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                                    <div className="rounded-2xl p-4" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                                        <p className="text-[11px] uppercase tracking-[0.24em]" style={{ color: '#a5b4fc', fontFamily: "'DM Sans', sans-serif" }}>Current price</p>
                                        <p className="mt-2 text-xl font-bold text-white">{formatCurrency(car.price)}</p>
                                    </div>
                                    <div className="rounded-2xl p-4" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                                        <p className="text-[11px] uppercase tracking-[0.24em]" style={{ color: '#6ee7b7', fontFamily: "'DM Sans', sans-serif" }}>Price points</p>
                                        <p className="mt-2 text-xl font-bold text-white">{priceHistory.length || 1}</p>
                                    </div>
                                    <div className="rounded-2xl p-4" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                                        <p className="text-[11px] uppercase tracking-[0.24em]" style={{ color: '#fcd34d', fontFamily: "'DM Sans', sans-serif" }}>Latest logged</p>
                                        <p className="mt-2 text-xl font-bold text-white">
                                            {priceHistory.length ? new Date(priceHistory[priceHistory.length - 1].changedAt).toLocaleDateString('en-IN') : 'Today'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <PriceHistoryChart data={priceHistory.length ? priceHistory : [{ price: car.price, changedAt: new Date().toISOString() }]} />
                        </div>
                    </div>
                )}

                {activeTab === 'ownership' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                            <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                <div className="mb-6">
                                    <p className="text-xs uppercase tracking-[0.24em] mb-2" style={{ color: '#a5b4fc', fontFamily: "'DM Sans', sans-serif" }}>
                                        Cost of Ownership
                                    </p>
                                    <h3 className="text-white text-2xl font-bold mb-2">Estimate the real yearly cost</h3>
                                    <p style={{ color: 'rgba(255,255,255,0.5)', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.7 }}>
                                        See beyond the sticker price with annual fuel spend, insurance, maintenance, and a five-year ownership projection.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="mb-1.5 block text-xs font-medium text-indigo-100">City km per day</label>
                                        <input
                                            name="cityKmPerDay"
                                            type="number"
                                            min="0"
                                            value={ownershipInputs.cityKmPerDay}
                                            onChange={handleOwnershipInputChange}
                                            className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white focus:border-indigo-400 focus:outline-none"
                                            style={{ fontFamily: "'DM Sans', sans-serif" }}
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-xs font-medium text-indigo-100">{ownershipPriceLabel}</label>
                                        <input
                                            name="fuelPrice"
                                            type="number"
                                            min="0"
                                            value={ownershipInputs.fuelPrice}
                                            onChange={handleOwnershipInputChange}
                                            className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white focus:border-indigo-400 focus:outline-none"
                                            style={{ fontFamily: "'DM Sans', sans-serif" }}
                                        />
                                    </div>
                                </div>

                                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                                    {[
                                        { label: 'Annual fuel cost', value: ownershipProjection.annualFuelCost, color: '#f59e0b' },
                                        { label: 'Insurance estimate', value: ownershipProjection.annualInsuranceCost, color: '#60a5fa' },
                                        { label: 'Maintenance estimate', value: ownershipProjection.annualMaintenanceCost, color: '#34d399' },
                                    ].map((item) => (
                                        <div key={item.label} className="rounded-2xl p-4" style={{ background: `${item.color}12`, border: `1px solid ${item.color}33` }}>
                                            <p className="text-[11px] uppercase tracking-[0.24em]" style={{ color: item.color, fontFamily: "'DM Sans', sans-serif" }}>
                                                {item.label}
                                            </p>
                                            <p className="mt-2 text-xl font-bold text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                                {formatCurrency(item.value)}
                                            </p>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-5 rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    <p className="text-xs uppercase tracking-[0.24em] mb-2" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'DM Sans', sans-serif" }}>
                                        Five-Year View
                                    </p>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div>
                                            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)', fontFamily: "'DM Sans', sans-serif" }}>Running cost over 5 years</p>
                                            <p className="text-2xl font-bold text-white">{formatCurrency(ownershipProjection.fiveYearRunningCost)}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)', fontFamily: "'DM Sans', sans-serif" }}>Purchase + running cost</p>
                                            <p className="text-2xl font-bold text-white">{formatCurrency(ownershipProjection.fiveYearTotalCost)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                <div className="mb-5">
                                    <p className="text-xs uppercase tracking-[0.24em] mb-2" style={{ color: '#a5b4fc', fontFamily: "'DM Sans', sans-serif" }}>
                                        5-Year Total Cost Chart
                                    </p>
                                    <h3 className="text-white text-2xl font-bold">Running cost by year</h3>
                                </div>

                                <div className="mb-4 flex flex-wrap gap-4 text-xs" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                    <span className="flex items-center gap-2 text-slate-300"><span className="h-2.5 w-2.5 rounded-full" style={{ background: '#f59e0b' }} />Fuel</span>
                                    <span className="flex items-center gap-2 text-slate-300"><span className="h-2.5 w-2.5 rounded-full" style={{ background: '#60a5fa' }} />Insurance</span>
                                    <span className="flex items-center gap-2 text-slate-300"><span className="h-2.5 w-2.5 rounded-full" style={{ background: '#34d399' }} />Maintenance</span>
                                </div>

                                <div className="grid grid-cols-5 gap-3 items-end h-72">
                                    {ownershipProjection.yearlyCosts.map((item) => {
                                        const totalHeight = (item.total / ownershipProjection.maxYearlyCost) * 100
                                        const fuelHeight = (item.fuel / ownershipProjection.maxYearlyCost) * 100
                                        const insuranceHeight = (item.insurance / ownershipProjection.maxYearlyCost) * 100
                                        const maintenanceHeight = (item.maintenance / ownershipProjection.maxYearlyCost) * 100

                                        return (
                                            <div key={item.year} className="flex h-full flex-col items-center justify-end gap-3">
                                                <p className="text-center text-xs text-slate-400" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                                    {formatCurrency(item.total)}
                                                </p>
                                                <div className="relative flex w-full max-w-[78px] items-end justify-center overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70" style={{ height: '220px' }}>
                                                    <div className="absolute bottom-0 w-full" style={{ height: `${totalHeight}%` }}>
                                                        <div style={{ height: `${fuelHeight}%`, background: '#f59e0b' }} />
                                                        <div style={{ height: `${insuranceHeight}%`, background: '#60a5fa' }} />
                                                        <div style={{ height: `${maintenanceHeight}%`, background: '#34d399' }} />
                                                    </div>
                                                </div>
                                                <p className="text-xs font-semibold text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>Year {item.year}</p>
                                            </div>
                                        )
                                    })}
                                </div>

                                <div className="mt-6 rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.08))', border: '1px solid rgba(99,102,241,0.2)' }}>
                                    <p className="text-white font-bold mb-2">Why this matters</p>
                                    <p style={{ color: 'rgba(255,255,255,0.56)', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.8 }}>
                                        Buyers usually compare EMIs first, but fuel, insurance, and service costs can materially change the real ownership picture over five years.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'reviews' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                                { label: 'Average Rating', value: `${car.rating || 0}/5`, tone: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)', color: '#6ee7b7' },
                                { label: 'Total Reviews', value: `${car.reviewCount || 0}`, tone: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.2)', color: '#a5b4fc' },
                                { label: 'Your Status', value: canReview ? (myReview ? 'Reviewed' : 'Ready to review') : 'Login required', tone: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', color: '#fcd34d' },
                            ].map((item) => (
                                <div key={item.label} className="rounded-2xl p-5" style={{ background: item.tone, border: `1px solid ${item.border}` }}>
                                    <p className="text-xs uppercase tracking-[0.24em] mb-2" style={{ color: item.color, fontFamily: "'DM Sans', sans-serif" }}>{item.label}</p>
                                    <p className="text-2xl font-bold text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>{item.value}</p>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr] gap-6">
                            <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                <div className="mb-5">
                                    <p className="text-xs uppercase tracking-[0.24em] mb-2" style={{ color: '#a5b4fc', fontFamily: "'DM Sans', sans-serif" }}>
                                        Share Your Experience
                                    </p>
                                    <h3 className="text-white text-2xl font-bold mb-2">{myReview ? 'Update your review' : 'Write a review'}</h3>
                                    <p style={{ color: 'rgba(255,255,255,0.5)', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.7 }}>
                                        Your rating feeds the live average across search, compare, and car detail pages.
                                    </p>
                                </div>

                                {!canReview ? (
                                    <div className="rounded-2xl p-5" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                                        <p className="text-white font-semibold mb-2">Login required</p>
                                        <p className="mb-4" style={{ color: 'rgba(255,255,255,0.55)', fontFamily: "'DM Sans', sans-serif" }}>
                                            Sign in to add your own review and help improve the community rating.
                                        </p>
                                        <button
                                            onClick={() => navigate('/login')}
                                            className="rounded-xl px-5 py-3 text-sm font-semibold text-white"
                                            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', fontFamily: "'DM Sans', sans-serif" }}
                                        >
                                            Go to Login
                                        </button>
                                    </div>
                                ) : (
                                    <form className="space-y-4" onSubmit={handleReviewSubmit}>
                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>Rating</label>
                                            <select
                                                name="rating"
                                                value={reviewForm.rating}
                                                onChange={handleReviewChange}
                                                className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white focus:border-indigo-400 focus:outline-none"
                                                style={{ fontFamily: "'DM Sans', sans-serif" }}
                                            >
                                                {[5, 4, 3, 2, 1].map((value) => (
                                                    <option key={value} value={value}>
                                                        {value} / 5
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>Title</label>
                                            <input
                                                name="title"
                                                value={reviewForm.title}
                                                onChange={handleReviewChange}
                                                maxLength={80}
                                                placeholder="Short headline for your review"
                                                className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
                                                style={{ fontFamily: "'DM Sans', sans-serif" }}
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>Review</label>
                                            <textarea
                                                name="comment"
                                                value={reviewForm.comment}
                                                onChange={handleReviewChange}
                                                rows="5"
                                                maxLength={500}
                                                placeholder="Tell other buyers what stood out in daily use, comfort, mileage, or value."
                                                className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
                                                style={{ fontFamily: "'DM Sans', sans-serif" }}
                                            />
                                        </div>

                                        <div className="flex flex-wrap gap-3">
                                            <button
                                                type="submit"
                                                disabled={reviewSubmitting}
                                                className="rounded-xl px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                                                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', fontFamily: "'DM Sans', sans-serif" }}
                                            >
                                                {reviewSubmitting ? 'Saving...' : myReview ? 'Update Review' : 'Submit Review'}
                                            </button>
                                            {myReview && (
                                                <button
                                                    type="button"
                                                    disabled={reviewSubmitting}
                                                    onClick={handleDeleteReview}
                                                    className="rounded-xl border border-red-400/30 bg-red-500/10 px-5 py-3 text-sm font-semibold text-red-200 disabled:opacity-60"
                                                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                                                >
                                                    Delete Review
                                                </button>
                                            )}
                                        </div>
                                    </form>
                                )}
                            </div>

                            <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                <div className="flex items-center justify-between gap-3 mb-5">
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.24em] mb-2" style={{ color: '#a5b4fc', fontFamily: "'DM Sans', sans-serif" }}>
                                            Community Reviews
                                        </p>
                                        <h3 className="text-white text-2xl font-bold">What buyers are saying</h3>
                                    </div>
                                    {reviewsLoading && (
                                        <span className="text-sm" style={{ color: 'rgba(255,255,255,0.45)', fontFamily: "'DM Sans', sans-serif" }}>Refreshing...</span>
                                    )}
                                </div>

                                {reviews.length === 0 ? (
                                    <div className="rounded-2xl p-6 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.12)' }}>
                                        <p className="text-white font-semibold mb-2">No reviews yet</p>
                                        <p style={{ color: 'rgba(255,255,255,0.5)', fontFamily: "'DM Sans', sans-serif" }}>
                                            Be the first one to rate this car and shape its live score across the app.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {reviews.map((review) => (
                                            <div key={review._id} className="review-card rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                                                    <div>
                                                        <p className="text-white font-semibold text-lg" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                                            {review.title || 'Owner review'}
                                                        </p>
                                                        <p style={{ color: 'rgba(255,255,255,0.45)', fontFamily: "'DM Sans', sans-serif" }}>
                                                            {review.userId?._id === currentUserId ? 'You' : review.userId?.name || 'Verified buyer'} · {formatReviewDate(review.createdAt)}
                                                        </p>
                                                    </div>
                                                    <div className="rounded-full px-3 py-1 text-sm font-semibold" style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)', color: '#c7d2fe', fontFamily: "'DM Sans', sans-serif" }}>
                                                        {review.rating}/5
                                                    </div>
                                                </div>
                                                <p style={{ color: 'rgba(255,255,255,0.62)', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.8 }}>
                                                    {review.comment}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <div className="mt-10 p-6 rounded-2xl text-center" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1))', border: '1px solid rgba(99,102,241,0.2)' }}>
                    <p className="text-white font-bold mb-2">Looking for alternatives?</p>
                    <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.48)', fontFamily: "'DM Sans', sans-serif" }}>
                        Compare this car with others to find the right balance of price, ratings, and ownership fit.
                    </p>
                    <button
                        onClick={() => navigate('/user/compare')}
                        className="px-8 py-3 rounded-xl font-semibold text-white text-sm"
                        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                    >
                        Compare Cars
                    </button>
                </div>
            </div>
        </div>
    )
}

export default CarDetail
