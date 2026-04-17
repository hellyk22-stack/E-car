import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import axiosInstance from '../../utils/axiosInstance'
import CarCard from '../../components/user/CarCard'
import { EXPLORER_FALLBACK, fetchSubscriptionStatus, formatPlanName } from '../../utils/subscription'

const comparisonRows = [
    ['Brand', 'brand'],
    ['Type', 'type'],
    ['Price', 'price'],
    ['Mileage', 'mileage'],
    ['Engine', 'engine'],
    ['Fuel', 'fuel'],
    ['Transmission', 'transmission'],
    ['Seating', 'seating'],
    ['Safety Rating', 'safetyRating'],
    ['Review Rating', 'reviewRating'],
    ['Reviews', 'reviewCount'],
]

const numericMetrics = {
    price: 'lower',
    mileage: 'higher',
    engine: 'higher',
    seating: 'higher',
    safetyRating: 'higher',
    reviewRating: 'higher',
    reviewCount: 'higher',
}

const getCarId = (car) => car?._id || car?.id

const numericValue = (car, key) => {
    const parsed = Number(String(car?.[key] ?? 0).replace(/[^\d.]/g, ''))
    return Number.isFinite(parsed) ? parsed : 0
}

const formatCompareValue = (car, key) => {
    if (key === 'price') return `${'\u20B9'} ${Number(car[key] || 0).toLocaleString('en-IN')}`
    if (key === 'mileage') return `${car[key] || 0} kmpl`
    if (key === 'engine') return `${numericValue(car, key)} cc`
    if (key === 'safetyRating') return `${'\u{1F6E1}'} ${car[key] || 0}/5`
    if (key === 'reviewRating') return `${'\u2605'} ${car[key] || 0}/5`
    if (key === 'reviewCount') return `${car[key] || 0}`
    return car[key] || '--'
}

const getWinnerIds = (cars, key) => {
    const preference = numericMetrics[key]
    if (!preference) return []

    const values = cars.map((car) => ({ id: getCarId(car), value: numericValue(car, key) }))
    const bestValue = preference === 'lower'
        ? Math.min(...values.map((item) => item.value))
        : Math.max(...values.map((item) => item.value))

    return values.filter((item) => item.value === bestValue).map((item) => item.id)
}

const buildProsCons = (cars) => {
    const minPrice = Math.min(...cars.map((car) => numericValue(car, 'price')))
    const maxMileage = Math.max(...cars.map((car) => numericValue(car, 'mileage')))
    const maxSafety = Math.max(...cars.map((car) => numericValue(car, 'safetyRating')))
    const maxReview = Math.max(...cars.map((car) => numericValue(car, 'reviewRating')))

    return cars.map((car) => {
        const pros = []
        const cons = []

        if (numericValue(car, 'price') === minPrice) pros.push('Lowest price in this shortlist')
        if (numericValue(car, 'mileage') === maxMileage) pros.push('Best mileage for daily running')
        if (numericValue(car, 'safetyRating') === maxSafety) pros.push('Strongest safety score here')
        if (numericValue(car, 'reviewRating') === maxReview) pros.push('Best owner review rating here')
        if (!pros.length) pros.push('Balanced option across key ownership factors')

        if (numericValue(car, 'price') > minPrice) cons.push('Costs more than the cheapest option')
        if (numericValue(car, 'safetyRating') < maxSafety) cons.push('Not the top safety-rated choice')
        if (numericValue(car, 'reviewRating') < maxReview) cons.push('Owner review score trails the leader')
        if (!cons.length) cons.push('Few obvious trade-offs in this comparison')

        return {
            carId: getCarId(car),
            pros,
            cons,
        }
    })
}

const buildSmartCompareAnalysis = (cars) => {
    const minPrice = Math.min(...cars.map((car) => numericValue(car, 'price')))
    const maxSafety = Math.max(...cars.map((car) => numericValue(car, 'safetyRating')))
    const maxReview = Math.max(...cars.map((car) => numericValue(car, 'reviewRating')))

    const scoredCars = cars.map((car) => ({
        car,
        score:
            numericValue(car, 'reviewRating') * 10 +
            numericValue(car, 'safetyRating') * 9 +
            numericValue(car, 'mileage') +
            numericValue(car, 'engine') / 50 -
            numericValue(car, 'price') / 100000,
    }))
    const recommendation = scoredCars.sort((a, b) => b.score - a.score)[0]?.car

    return {
        summary: recommendation
            ? `${recommendation.name} comes out strongest overall with the best blend of value, safety, and owner feedback in this shortlist.`
            : 'These cars are closely matched across the selected specs.',
        highlights: cars.map((car) => ({
            carId: getCarId(car),
            label: numericValue(car, 'price') === minPrice
                ? 'Budget pick'
                : numericValue(car, 'safetyRating') === maxSafety
                    ? 'Safety leader'
                    : numericValue(car, 'reviewRating') === maxReview
                        ? 'Best reviewed'
                        : 'Balanced option',
            text: `${formatCompareValue(car, 'safetyRating')} safety and ${formatCompareValue(car, 'reviewRating')} review rating.`,
        })),
        prosCons: buildProsCons(cars),
        verdict: recommendation
            ? `Choose ${recommendation.name} if you want the most rounded package in this comparison.`
            : 'Pick the model that best matches your budget and usage needs.',
    }
}

const CompareCars = () => {
    const navigate = useNavigate()
    const [allCars, setAllCars] = useState([])
    const [selected, setSelected] = useState([])
    const [sortBy, setSortBy] = useState('price')
    const [loading, setLoading] = useState(true)
    const [compareLoading, setCompareLoading] = useState(false)
    const [subscription, setSubscription] = useState(EXPLORER_FALLBACK)
    const [comparison, setComparison] = useState(null)
    const [compareNotice, setCompareNotice] = useState('')
    const comparisonRef = useRef(null)

    useEffect(() => {
        const bootstrap = async () => {
            setLoading(true)
            try {
                const carsRes = await axiosInstance.get('/car/cars')
                const status = await fetchSubscriptionStatus()
                setAllCars(carsRes.data.data || [])
                setSubscription(status)
            } catch (error) {
                toast.error('Unable to load compare tools right now.')
            } finally {
                setLoading(false)
            }
        }

        bootstrap()
    }, [])

    useEffect(() => {
        if (comparison && comparisonRef.current) {
            const top = comparisonRef.current.getBoundingClientRect().top + window.scrollY - 88
            window.scrollTo({ top: Math.max(top, 0), behavior: 'smooth' })
        }
    }, [comparison])

    const sortedCars = useMemo(() => {
        const items = [...allCars]
        if (sortBy === 'price') return items.sort((a, b) => numericValue(a, 'price') - numericValue(b, 'price'))
        if (sortBy === 'mileage') return items.sort((a, b) => numericValue(b, 'mileage') - numericValue(a, 'mileage'))
        if (sortBy === 'reviewRating') return items.sort((a, b) => numericValue(b, 'reviewRating') - numericValue(a, 'reviewRating'))
        if (sortBy === 'safetyRating') return items.sort((a, b) => numericValue(b, 'safetyRating') - numericValue(a, 'safetyRating'))
        if (sortBy === 'engine') return items.sort((a, b) => numericValue(b, 'engine') - numericValue(a, 'engine'))
        return items
    }, [allCars, sortBy])

    const smartCompareLimit = subscription?.limits?.smartCompareLimit || EXPLORER_FALLBACK.limits.smartCompareLimit
    const resultCars = comparison?.cars || []

    const handleSelect = (car) => {
        setComparison(null)
        setCompareNotice('')
        setSelected((prev) => prev.some((item) => item._id === car._id)
            ? prev.filter((item) => item._id !== car._id)
            : [...prev, car])
    }

    const runComparison = async () => {
        if (selected.length < 2) {
            toast.info('Select at least 2 cars to compare.')
            return
        }

        try {
            setCompareLoading(true)
            const latestStatus = await fetchSubscriptionStatus()
            setSubscription(latestStatus)

            const limit = latestStatus?.limits?.smartCompareLimit || EXPLORER_FALLBACK.limits.smartCompareLimit
            if (selected.length > limit) {
                toast.info(`Explorer supports comparing up to ${limit} cars. Upgrade to continue.`)
                navigate('/user/pricing')
                return
            }

            const selectedCars = [...selected]
            const response = await axiosInstance.post('/compare/compare', {
                carIds: selectedCars.map((car) => car._id),
                save: false,
            })

            const comparisonData = response.data?.data || {}
            const comparisonCars = (comparisonData.cars?.length ? comparisonData.cars : selectedCars)
                .map((car) => ({ ...car, _id: getCarId(car) }))
            const localAnalysis = buildSmartCompareAnalysis(comparisonCars)

            setComparison({
                mode: 'smart',
                plan: latestStatus?.plan || 'explorer',
                planLabel: latestStatus?.planLabel || formatPlanName(latestStatus?.plan),
                cars: comparisonCars,
                analysis: {
                    ...localAnalysis,
                    ...(comparisonData.aiAnalysisDetails || {}),
                    prosCons: localAnalysis.prosCons,
                },
                aiText: comparisonData.aiAnalysis || comparisonData.aiAnalysisDetails?.summary || '',
            })

            const remaining = response.data?.remainingComparisons
            setCompareNotice(typeof remaining === 'number' ? `${remaining} smart comparison${remaining === 1 ? '' : 's'} remaining on Explorer.` : '')
        } catch (error) {
            toast.error(error.response?.data?.message || 'Unable to compare the selected cars.')
        } finally {
            setCompareLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 px-4 py-10 text-slate-100">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
                .compare-title { font-family: 'Syne', sans-serif; letter-spacing: -0.03em; }
                .compare-copy { font-family: 'DM Sans', sans-serif; }
            `}</style>

            <div className="mx-auto max-w-6xl">
                <div className="mb-6">
                    <p className="compare-copy text-xs font-semibold uppercase tracking-[0.24em] text-indigo-200">Compare</p>
                    <h1 className="compare-title mt-2 text-4xl font-black text-white">Explorer users can compare for free</h1>
                    <p className="compare-copy mt-3 max-w-3xl text-slate-300">
                        Every user gets the Explorer plan by default. You can compare up to {smartCompareLimit} cars for free, and we will send you to pricing only when you go beyond that limit.
                    </p>
                </div>

                <div className="mb-6 flex flex-wrap items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                    <label className="compare-copy text-sm font-semibold text-slate-200">Sort by</label>
                    <select
                        value={sortBy}
                        onChange={(event) => setSortBy(event.target.value)}
                        className="compare-copy rounded-xl border border-white/10 bg-slate-950/60 px-4 py-2 text-sm text-white"
                    >
                        <option value="price">Price</option>
                        <option value="mileage">Mileage</option>
                        <option value="reviewRating">Review Rating</option>
                        <option value="safetyRating">Safety Rating</option>
                        <option value="engine">Engine</option>
                    </select>

                    <div className="compare-copy rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-200">
                        {selected.length} selected
                    </div>
                    <div className="compare-copy rounded-full border border-sky-300/20 bg-sky-400/10 px-4 py-2 text-sm text-sky-100">
                        {formatPlanName(subscription?.plan)} | compare up to {smartCompareLimit} cars
                    </div>

                    <button
                        type="button"
                        onClick={runComparison}
                        disabled={compareLoading || selected.length < 2}
                        className="compare-copy ml-auto rounded-2xl bg-[linear-gradient(135deg,#378ADD,#4f46e5)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                    >
                        {compareLoading ? 'Comparing...' : `Compare ${selected.length || ''} Cars`}
                    </button>
                </div>

                {selected.length > smartCompareLimit && (
                    <div className="compare-copy mb-6 rounded-3xl border border-amber-300/20 bg-amber-400/10 p-5 text-amber-100">
                        You selected {selected.length} cars. Explorer supports up to {smartCompareLimit}. Click compare to upgrade on the pricing page.
                    </div>
                )}

                {loading ? (
                    <div className="compare-copy rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-slate-300">Loading cars...</div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                        {sortedCars.map((car) => (
                            <CarCard
                                key={car._id}
                                car={car}
                                selectable={true}
                                selected={selected.some((item) => item._id === car._id)}
                                onSelect={handleSelect}
                            />
                        ))}
                    </div>
                )}

                {comparison && resultCars.length >= 2 && (
                    <div ref={comparisonRef} className="mt-10 space-y-6">
                        {compareNotice && (
                            <div className="compare-copy rounded-3xl border border-sky-300/20 bg-sky-400/10 p-5 text-sky-100">
                                {compareNotice}
                            </div>
                        )}

                        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="compare-copy text-xs uppercase tracking-[0.24em] text-slate-400">
                                        {comparison.mode === 'smart' ? 'Smart Compare - AI Analysis' : 'Basic Compare'}
                                    </p>
                                    <h2 className="compare-title mt-2 text-3xl text-white">Winner analysis and recommendation</h2>
                                </div>
                                <span className="compare-copy rounded-full border border-white/10 bg-slate-950/40 px-4 py-2 text-sm text-slate-200">
                                    {comparison.planLabel || 'Explorer'}
                                </span>
                            </div>

                            <div className="mt-6 overflow-x-auto">
                                <table className="compare-copy min-w-full border-collapse text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-white/10 text-slate-300">
                                            <th className="px-4 py-3 font-semibold">Feature</th>
                                            {resultCars.map((car) => (
                                                <th key={getCarId(car)} className="px-4 py-3 font-semibold text-white">{car.name}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {comparisonRows.map(([label, key]) => {
                                            const winnerIds = getWinnerIds(resultCars, key)
                                            return (
                                                <tr key={key} className="border-b border-white/6">
                                                    <td className="px-4 py-4 font-medium text-slate-300">{label}</td>
                                                    {resultCars.map((car) => {
                                                        const isWinner = winnerIds.includes(getCarId(car))
                                                        return (
                                                            <td key={`${getCarId(car)}-${key}`} className="px-4 py-4">
                                                                <div className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 ${isWinner ? 'border-emerald-300/25 bg-emerald-400/10 text-emerald-100' : 'border-white/10 bg-slate-950/40 text-white'}`}>
                                                                    <span>{formatCompareValue(car, key)}</span>
                                                                    {comparison.mode === 'smart' && isWinner && (
                                                                        <span className="rounded-full bg-emerald-300/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-100">
                                                                            Winner
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        )
                                                    })}
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6">
                            <p className="compare-copy text-xs uppercase tracking-[0.24em] text-indigo-200">Graphical Comparison</p>
                            <h3 className="compare-title mt-2 text-2xl text-white">See the selected cars side by side</h3>

                            <div className="mt-6 grid gap-4 md:grid-cols-2">
                                {[
                                    { key: 'price', label: 'Price', higherIsBetter: false },
                                    { key: 'mileage', label: 'Mileage', higherIsBetter: true },
                                    { key: 'safetyRating', label: 'Safety Rating', higherIsBetter: true },
                                    { key: 'reviewRating', label: 'Review Rating', higherIsBetter: true },
                                ].map((metric) => {
                                    const values = resultCars.map((car) => numericValue(car, metric.key))
                                    const maxValue = Math.max(...values, 1)
                                    const minValue = Math.min(...values)

                                    return (
                                        <div key={metric.key} className="rounded-3xl border border-white/10 bg-slate-950/40 p-5">
                                            <div className="mb-4 flex items-center justify-between gap-3">
                                                <p className="compare-copy text-sm font-semibold text-white">{metric.label}</p>
                                                <span className="compare-copy text-xs text-slate-400">
                                                    {metric.higherIsBetter ? 'Higher is better' : 'Lower is better'}
                                                </span>
                                            </div>

                                            <div className="space-y-4">
                                                {resultCars.map((car) => {
                                                    const value = numericValue(car, metric.key)
                                                    const width = metric.higherIsBetter
                                                        ? `${(value / maxValue) * 100}%`
                                                        : `${(minValue / Math.max(value, 1)) * 100}%`

                                                    return (
                                                        <div key={`${getCarId(car)}-${metric.key}`}>
                                                            <div className="mb-1 flex items-center justify-between gap-3">
                                                                <span className="compare-copy text-sm text-slate-200">{car.name}</span>
                                                                <span className="compare-copy text-sm text-white">{formatCompareValue(car, metric.key)}</span>
                                                            </div>
                                                            <div className="h-3 overflow-hidden rounded-full bg-white/10">
                                                                <div
                                                                    className="h-full rounded-full"
                                                                    style={{ width, background: 'linear-gradient(135deg, #38bdf8, #6366f1)' }}
                                                                />
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {comparison.mode === 'smart' && comparison.analysis && (
                            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                                <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6">
                                    <p className="compare-copy text-xs uppercase tracking-[0.24em] text-indigo-200">AI Summary</p>
                                    <h3 className="compare-title mt-2 text-2xl text-white">Overall recommendation</h3>
                                    <p className="compare-copy mt-4 text-base leading-7 text-slate-300">
                                        {comparison.aiText || comparison.analysis.summary}
                                    </p>

                                    <p className="compare-copy mt-5 rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-200">
                                        {comparison.analysis.verdict}
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    {comparison.analysis.highlights?.map((item) => {
                                        const car = resultCars.find((entry) => getCarId(entry) === item.carId)
                                        return (
                                            <div key={`${item.carId}-${item.label}`} className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
                                                <p className="compare-copy text-sm font-semibold text-white">
                                                    {car?.name || 'Car'}: {item.label}
                                                </p>
                                                <p className="compare-copy mt-3 text-sm leading-6 text-slate-300">{item.text}</p>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {comparison.mode === 'smart' && comparison.analysis?.prosCons?.length > 0 && (
                            <div className="grid gap-4 lg:grid-cols-2">
                                {comparison.analysis.prosCons.map((item) => {
                                    const car = resultCars.find((entry) => getCarId(entry) === item.carId)
                                    return (
                                        <details key={item.carId} className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
                                            <summary className="compare-copy cursor-pointer text-sm font-semibold text-white">
                                                {car?.name || 'Car'} pros and cons
                                            </summary>
                                            <div className="compare-copy mt-4 grid gap-4 md:grid-cols-2 text-sm text-slate-300">
                                                <div>
                                                    <p className="font-semibold text-emerald-200">Pros</p>
                                                    <ul className="mt-2 space-y-1">
                                                        {item.pros.map((entry) => <li key={entry}>- {entry}</li>)}
                                                    </ul>
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-rose-200">Cons</p>
                                                    <ul className="mt-2 space-y-1">
                                                        {item.cons.map((entry) => <li key={entry}>- {entry}</li>)}
                                                    </ul>
                                                </div>
                                            </div>
                                        </details>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

export default CompareCars
