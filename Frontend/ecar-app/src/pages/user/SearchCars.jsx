import React, { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'react-toastify'
import axiosInstance from '../../utils/axiosInstance'
import CarCard from '../../components/user/CarCard'
import { logSearchEvent } from '../../utils/analyticsEvents'
import { addCarToWishlist, getWishlistIds, removeCarFromWishlist } from '../../utils/wishlistApi'

const defaultBudgetInputs = {
    monthlyBudget: '',
    downPaymentPercent: 20,
    interestRate: 9.5,
    tenureYears: 5,
}

const formatInr = (value) => `₹ ${Number(value || 0).toLocaleString('en-IN')}`

const calculateAffordablePrice = (monthlyBudget, annualRate, years, downPaymentPercent) => {
    const emi = Number(monthlyBudget || 0)
    const months = Number(years || 0) * 12
    const downPaymentRatio = Number(downPaymentPercent || 0) / 100

    if (!emi || !months || downPaymentRatio >= 1) return 0

    const monthlyRate = Number(annualRate || 0) / 12 / 100

    let principal = 0
    if (!monthlyRate) {
        principal = emi * months
    } else {
        const growthFactor = (1 + monthlyRate) ** months
        principal = emi * ((growthFactor - 1) / (monthlyRate * growthFactor))
    }

    return principal / (1 - downPaymentRatio)
}

const matchesFilters = (car, filters) => {
    const brand = (filters.brand || '').trim().toLowerCase()
    const maxPrice = Number(filters.maxPrice || 0)

    if (brand && !car.brand?.toLowerCase().includes(brand) && !car.name?.toLowerCase().includes(brand)) return false
    if (filters.type && car.type !== filters.type) return false
    if (filters.fuel && car.fuel !== filters.fuel) return false
    if (filters.transmission && car.transmission !== filters.transmission) return false
    if (maxPrice && Number(car.price || 0) > maxPrice) return false

    return true
}

const SearchCars = () => {
    const { register, handleSubmit, reset, getValues, setValue } = useForm({
        defaultValues: {
            brand: '',
            type: '',
            fuel: '',
            transmission: '',
            maxPrice: '',
        },
    })

    const [allCars, setAllCars] = useState([])
    const [results, setResults] = useState([])
    const [loading, setLoading] = useState(false)
    const [searched, setSearched] = useState(false)
    const [budgetInputs, setBudgetInputs] = useState(defaultBudgetInputs)
    const [budgetActive, setBudgetActive] = useState(false)
    const [wishlistIds, setWishlistIds] = useState([])

    useEffect(() => {
        fetchAllCars()
    }, [])

    const affordablePrice = useMemo(
        () => calculateAffordablePrice(
            budgetInputs.monthlyBudget,
            budgetInputs.interestRate,
            budgetInputs.tenureYears,
            budgetInputs.downPaymentPercent,
        ),
        [budgetInputs],
    )

    const budgetDownPayment = affordablePrice * (budgetInputs.downPaymentPercent / 100)
    const budgetLoanAmount = Math.max(affordablePrice - budgetDownPayment, 0)

    const fetchAllCars = async () => {
        setLoading(true)
        try {
            const [carsRes, wishlistRes] = await Promise.all([
                axiosInstance.get('/car/cars'),
                getWishlistIds(),
            ])
            const cars = carsRes.data.data || []
            setAllCars(cars)
            setResults(cars)
            setWishlistIds(wishlistRes)
        } catch (err) {
            console.log(err)
        } finally {
            setLoading(false)
        }
    }

    const applyFilters = (filters, options = {}) => {
        const filteredCars = allCars.filter((car) => matchesFilters(car, filters))
        setResults(filteredCars)
        setSearched(options.markSearched ?? true)
        setBudgetActive(!!options.budgetApplied)
    }

    const onSubmit = (data) => {
        applyFilters(data, { markSearched: true, budgetApplied: budgetActive && !!data.maxPrice })
        logSearchEvent({
            ...data,
            queryText: [data.brand, data.type, data.fuel, data.transmission, data.maxPrice ? `under ₹ ${data.maxPrice}` : '']
                .filter(Boolean)
                .join(', '),
        })
    }

    const handleBudgetInputChange = (event) => {
        const { name, value } = event.target
        setBudgetInputs((prev) => ({
            ...prev,
            [name]: name === 'monthlyBudget' ? value : Number(value),
        }))
    }

    const handleApplySmartBudget = () => {
        if (!Number(budgetInputs.monthlyBudget)) {
            toast.info('Enter a monthly budget to estimate what you can afford.')
            return
        }

        const maxAffordablePrice = Math.round(affordablePrice)
        if (!maxAffordablePrice) {
            toast.error('We could not calculate a budget range with these inputs.')
            return
        }

        setValue('maxPrice', String(maxAffordablePrice))
        const nextFilters = { ...getValues(), maxPrice: String(maxAffordablePrice) }
        applyFilters(nextFilters, { markSearched: true, budgetApplied: true })
        logSearchEvent({
            ...nextFilters,
            queryText: `Smart budget under ₹ ${maxAffordablePrice.toLocaleString('en-IN')}`,
        })
        toast.success('Smart budget filter applied.')
    }

    const handleToggleWishlist = async (car) => {
        const isSaved = wishlistIds.includes(car._id)

        try {
            if (isSaved) {
                await removeCarFromWishlist(car._id)
                setWishlistIds((prev) => prev.filter((id) => id !== car._id))
            } else {
                await addCarToWishlist(car._id)
                setWishlistIds((prev) => [...prev, car._id])
            }
        } catch (err) {
            console.error('Wishlist update failed', err)
            toast.error(err.response?.data?.message || 'Unable to update your wishlist right now.')
        }
    }

    const handleReset = () => {
        reset()
        setBudgetInputs(defaultBudgetInputs)
        setBudgetActive(false)
        setSearched(false)
        setResults(allCars)
    }

    const filterInputClassName =
        'w-full h-14 rounded-xl border border-slate-600/80 bg-slate-800/95 px-4 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition'
    const filterSelectClassName = `${filterInputClassName} appearance-none pr-10`

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 px-4 py-10 text-slate-100">
            <div className="mx-auto max-w-6xl">
                <div className="mb-8">
                    <h2 className="mb-2 text-3xl font-bold text-white md:text-4xl">Find Your Next Car</h2>
                    <p className="mt-2 max-w-2xl text-lg text-slate-300 md:text-xl">
                        Explore available cars with smart filters, quick comparisons, and an EMI-aware budget helper.
                    </p>
                </div>

                <div className="mb-6 rounded-2xl border border-indigo-400/25 bg-slate-900/80 p-5 shadow-2xl">
                    <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.28em] text-indigo-200">Smart Budget Filter</p>
                            <h3 className="text-2xl font-bold text-white">Turn your monthly EMI into a realistic price cap</h3>
                            <p className="mt-2 max-w-2xl text-sm text-slate-400">
                                Enter what feels comfortable each month and we will estimate a practical purchase budget for you.
                            </p>
                        </div>
                        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3">
                            <p className="text-[11px] uppercase tracking-[0.24em] text-emerald-200">Estimated Budget</p>
                            <p className="mt-1 text-2xl font-bold text-white">
                                {affordablePrice ? formatInr(Math.round(affordablePrice)) : 'Enter your monthly budget'}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-indigo-100">Monthly budget</label>
                            <input
                                name="monthlyBudget"
                                type="number"
                                value={budgetInputs.monthlyBudget}
                                onChange={handleBudgetInputChange}
                                className={filterInputClassName}
                                placeholder="Example: 18,000"
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-indigo-100">Down payment (%)</label>
                            <input
                                name="downPaymentPercent"
                                type="range"
                                min="10"
                                max="50"
                                step="5"
                                value={budgetInputs.downPaymentPercent}
                                onChange={handleBudgetInputChange}
                                className="mt-4 w-full accent-indigo-400"
                            />
                            <p className="mt-2 text-sm text-slate-300">{budgetInputs.downPaymentPercent}%</p>
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-indigo-100">Interest rate (%)</label>
                            <input
                                name="interestRate"
                                type="range"
                                min="7"
                                max="15"
                                step="0.1"
                                value={budgetInputs.interestRate}
                                onChange={handleBudgetInputChange}
                                className="mt-4 w-full accent-indigo-400"
                            />
                            <p className="mt-2 text-sm text-slate-300">{budgetInputs.interestRate.toFixed(1)}% p.a.</p>
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-indigo-100">Loan tenure</label>
                            <input
                                name="tenureYears"
                                type="range"
                                min="1"
                                max="7"
                                step="1"
                                value={budgetInputs.tenureYears}
                                onChange={handleBudgetInputChange}
                                className="mt-4 w-full accent-indigo-400"
                            />
                            <p className="mt-2 text-sm text-slate-300">{budgetInputs.tenureYears} years</p>
                        </div>
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto]">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            {[
                                { label: 'Estimated loan amount', value: budgetLoanAmount },
                                { label: 'Estimated down payment', value: budgetDownPayment },
                                { label: 'Estimated car budget', value: affordablePrice },
                            ].map((item) => (
                                <div key={item.label} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                                    <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">{item.label}</p>
                                    <p className="mt-2 text-lg font-bold text-white">
                                        {item.value ? formatInr(Math.round(item.value)) : '--'}
                                    </p>
                                </div>
                            ))}
                        </div>
                        <div className="flex flex-wrap items-end gap-3">
                            <button
                                type="button"
                                onClick={handleApplySmartBudget}
                                className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-indigo-400 hover:to-violet-500"
                            >
                                Apply Smart Budget
                            </button>
                            {budgetActive && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setValue('maxPrice', '')
                                        applyFilters({ ...getValues(), maxPrice: '' }, { markSearched: true, budgetApplied: false })
                                    }}
                                    className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/[0.08]"
                                >
                                    Remove Budget Cap
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mb-6 rounded-2xl border border-blue-500/30 bg-slate-800/80 p-5 text-white shadow-2xl">
                    <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-blue-200">Refine Your Search</h3>
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
                            <div>
                                <label className="mb-1.5 block text-xs font-medium text-blue-100">Brand or model</label>
                                <input className={filterInputClassName} placeholder="Try Honda, Tata, Nexon..." {...register('brand')} />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-xs font-medium text-blue-100">Body type</label>
                                <div className="relative">
                                    <select className={filterSelectClassName} {...register('type')}>
                                        <option value="" className="bg-slate-900 text-slate-100">All body types</option>
                                        <option value="Hatchback" className="bg-slate-900 text-slate-100">Hatchback</option>
                                        <option value="Sedan" className="bg-slate-900 text-slate-100">Sedan</option>
                                        <option value="SUV" className="bg-slate-900 text-slate-100">SUV</option>
                                        <option value="Luxury" className="bg-slate-900 text-slate-100">Luxury</option>
                                    </select>
                                    <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">⌄</span>
                                </div>
                            </div>
                            <div>
                                <label className="mb-1.5 block text-xs font-medium text-blue-100">Fuel type</label>
                                <div className="relative">
                                    <select className={filterSelectClassName} {...register('fuel')}>
                                        <option value="" className="bg-slate-900 text-slate-100">All fuel types</option>
                                        <option value="Petrol" className="bg-slate-900 text-slate-100">Petrol</option>
                                        <option value="Diesel" className="bg-slate-900 text-slate-100">Diesel</option>
                                        <option value="Electric" className="bg-slate-900 text-slate-100">Electric</option>
                                    </select>
                                    <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">⌄</span>
                                </div>
                            </div>
                            <div>
                                <label className="mb-1.5 block text-xs font-medium text-blue-100">Transmission</label>
                                <div className="relative">
                                    <select className={filterSelectClassName} {...register('transmission')}>
                                        <option value="" className="bg-slate-900 text-slate-100">All transmissions</option>
                                        <option value="Manual" className="bg-slate-900 text-slate-100">Manual</option>
                                        <option value="Automatic" className="bg-slate-900 text-slate-100">Automatic</option>
                                    </select>
                                    <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">⌄</span>
                                </div>
                            </div>
                            <div>
                                <label className="mb-1.5 block text-xs font-medium text-blue-100">Maximum price (₹)</label>
                                <input type="number" className={filterInputClassName} placeholder="Example: 10,00,000" {...register('maxPrice')} />
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <button
                                type="submit"
                                className="rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-8 py-2.5 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:from-blue-600 hover:to-indigo-700 hover:shadow-2xl"
                            >
                                Search Cars
                            </button>
                            <button
                                type="button"
                                onClick={handleReset}
                                className="rounded-xl border border-blue-300/50 bg-white/10 px-8 py-2.5 text-sm font-medium text-blue-100 transition hover:bg-white/20"
                            >
                                Clear Filters
                            </button>
                        </div>
                    </form>
                </div>

                {!loading && (
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-gray-400">
                            {searched
                                ? results.length > 0
                                    ? `Found ${results.length} car${results.length > 1 ? 's' : ''}`
                                    : 'No cars match your current filters'
                                : `Showing all ${results.length} cars`}
                        </p>
                        {budgetActive && affordablePrice > 0 && (
                            <p className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200">
                                Budget cap active up to {formatInr(Math.round(affordablePrice))}
                            </p>
                        )}
                    </div>
                )}

                {loading && (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-sm">
                                <div className="h-48 animate-pulse bg-white/10" />
                                <div className="space-y-2 p-4">
                                    <div className="h-4 w-3/4 animate-pulse rounded bg-white/10" />
                                    <div className="h-3 w-1/2 animate-pulse rounded bg-white/10" />
                                    <div className="mt-3 h-4 w-1/3 animate-pulse rounded bg-white/10" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {!loading && results.length > 0 && (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                        {results.map((car) => (
                            <CarCard
                                key={car._id}
                                car={car}
                                wishlisted={wishlistIds.includes(car._id)}
                                onToggleWishlist={handleToggleWishlist}
                            />
                        ))}
                    </div>
                )}

                {!loading && searched && results.length === 0 && (
                    <div className="py-20 text-center">
                        <p className="mb-4 text-4xl font-semibold text-blue-200">No matching cars</p>
                        <h3 className="mb-2 text-xl font-bold text-gray-200">We could not find a car for these filters</h3>
                        <p className="mb-6 text-gray-400">Try broadening the brand, fuel, or price range to see more options.</p>
                        <button
                            onClick={handleReset}
                            className="rounded-xl bg-blue-500 px-6 py-2.5 font-medium text-white transition hover:bg-blue-600"
                        >
                            Clear all filters
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

export default SearchCars
