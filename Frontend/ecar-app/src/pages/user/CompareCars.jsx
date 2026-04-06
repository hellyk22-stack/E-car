import React, { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import axiosInstance from '../../utils/axiosInstance'
import CarCard from '../../components/user/CarCard'

const compareMetrics = [
  { key: 'price', label: 'Price', preference: 'lower', formatter: (value) => `Rs ${Number(value || 0).toLocaleString('en-IN')}` },
  { key: 'mileage', label: 'Mileage', preference: 'higher', formatter: (value) => `${value || 0} kmpl` },
  { key: 'engine', label: 'Engine', preference: 'higher', formatter: (value) => `${value || 0} cc` },
  { key: 'seating', label: 'Seating', preference: 'higher', formatter: (value) => `${value || 0}` },
  { key: 'rating', label: 'Rating', preference: 'higher', formatter: (value) => `${value || 0}/5` },
  { key: 'reviewCount', label: 'Reviews', preference: 'higher', formatter: (value) => `${value || 0}` },
]

const comparisonRows = [
  ['Brand', 'brand'],
  ['Type', 'type'],
  ['Price', 'price'],
  ['Mileage', 'mileage'],
  ['Engine', 'engine'],
  ['Fuel', 'fuel'],
  ['Transmission', 'transmission'],
  ['Seating', 'seating'],
  ['Rating', 'rating'],
  ['Reviews', 'reviewCount'],
]

const radarMetrics = [
  { key: 'price', label: 'Value', preference: 'lower' },
  { key: 'mileage', label: 'Mileage', preference: 'higher' },
  { key: 'engine', label: 'Engine', preference: 'higher' },
  { key: 'rating', label: 'Rating', preference: 'higher' },
  { key: 'reviewCount', label: 'Reviews', preference: 'higher' },
]

const radarColors = [
  { stroke: '#60a5fa', fill: 'rgba(96,165,250,0.18)' },
  { stroke: '#a78bfa', fill: 'rgba(167,139,250,0.18)' },
  { stroke: '#34d399', fill: 'rgba(52,211,153,0.18)' },
]

const numericValue = (car, key) => {
  const raw = car?.[key]
  if (typeof raw === 'number') return raw
  const parsed = parseFloat(String(raw ?? '').replace(/[^\d.]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

const CompareCars = () => {
  const [allCars, setAllCars] = useState([])
  const [sortBy, setSortBy] = useState('price')
  const [selected, setSelected] = useState([])
  const [showTable, setShowTable] = useState(false)
  const [loading, setLoading] = useState(false)
  const comparisonRef = useRef(null)

  useEffect(() => {
    fetchAllCars()
  }, [])

  useEffect(() => {
    if (showTable && comparisonRef.current) {
      const top = comparisonRef.current.getBoundingClientRect().top + window.scrollY - 88
      window.scrollTo({ top: Math.max(top, 0), behavior: 'auto' })
    }
  }, [showTable, selected.length, sortBy])

  const compareSort = (a, b) => {
    if (sortBy === 'price') return numericValue(a, 'price') - numericValue(b, 'price')
    if (sortBy === 'mileage') return numericValue(b, 'mileage') - numericValue(a, 'mileage')
    if (sortBy === 'rating') return numericValue(b, 'rating') - numericValue(a, 'rating')
    if (sortBy === 'engine') return numericValue(b, 'engine') - numericValue(a, 'engine')
    return 0
  }

  const fetchAllCars = async () => {
    setLoading(true)
    try {
      const res = await axiosInstance.get('/car/cars')
      setAllCars(res.data.data || [])
    } catch (err) {
      console.log('error fetching cars', err)
    }
    setLoading(false)
  }

  const sortedCars = useMemo(() => [...allCars].sort(compareSort), [allCars, sortBy])
  const sortedSelected = useMemo(() => [...selected].sort(compareSort), [selected, sortBy])

  const handleSelect = (car) => {
    if (selected.find((item) => item._id === car._id)) {
      setSelected(selected.filter((item) => item._id !== car._id))
      return
    }

    if (selected.length >= 3) {
      toast.info('You can compare up to 3 cars at a time.')
      return
    }

    setSelected([...selected, car])
  }

  const showComparison = () => {
    if (selected.length < 2) {
      toast.info('Select at least 2 cars to compare.')
      return
    }

    setShowTable(true)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (comparisonRef.current) {
          const top = comparisonRef.current.getBoundingClientRect().top + window.scrollY - 88
          window.scrollTo({ top: Math.max(top, 0), behavior: 'auto' })
        }
      })
    })
  }

  const resetComparison = () => {
    setShowTable(false)
    setSelected([])
  }

  const formatCompareValue = (car, key) => {
    if (key === 'price') return `Rs ${Number(car[key] || 0).toLocaleString('en-IN')}`
    if (key === 'mileage') return `${car[key] || 0} kmpl`
    if (key === 'engine') return `${numericValue(car, key)} cc`
    if (key === 'rating') return `${car[key] || 0}/5`
    if (key === 'reviewCount') return `${car[key] || 0}`
    return car[key] || '--'
  }

  const getWinnerIds = (key) => {
    const metric = compareMetrics.find((item) => item.key === key)
    if (!metric || sortedSelected.length < 2) return []

    const values = sortedSelected.map((car) => ({ id: car._id, value: numericValue(car, key) }))
    const comparable = values.filter((item) => Number.isFinite(item.value))
    if (!comparable.length) return []

    const bestValue = metric.preference === 'lower'
      ? Math.min(...comparable.map((item) => item.value))
      : Math.max(...comparable.map((item) => item.value))

    return comparable.filter((item) => item.value === bestValue).map((item) => item.id)
  }

  const radarData = useMemo(() => {
    if (sortedSelected.length < 2) return []

    return sortedSelected.map((car, index) => {
      const points = radarMetrics.map((metric, metricIndex) => {
        const values = sortedSelected.map((item) => numericValue(item, metric.key))
        const min = Math.min(...values)
        const max = Math.max(...values)
        let normalized = 1

        if (max !== min) {
          if (metric.preference === 'lower') {
            normalized = (max - numericValue(car, metric.key)) / (max - min)
          } else {
            normalized = (numericValue(car, metric.key) - min) / (max - min)
          }
        }

        const radius = 42 + normalized * 84
        const angle = ((Math.PI * 2) / radarMetrics.length) * metricIndex - Math.PI / 2
        const x = 150 + radius * Math.cos(angle)
        const y = 150 + radius * Math.sin(angle)

        return { x, y }
      })

      return {
        car,
        colors: radarColors[index],
        polygon: points.map((point) => `${point.x},${point.y}`).join(' '),
      }
    })
  }, [sortedSelected])

  const axisPoints = radarMetrics.map((metric, metricIndex) => {
    const angle = ((Math.PI * 2) / radarMetrics.length) * metricIndex - Math.PI / 2
    return {
      label: metric.label,
      x: 150 + 118 * Math.cos(angle),
      y: 150 + 118 * Math.sin(angle),
      labelX: 150 + 136 * Math.cos(angle),
      labelY: 150 + 136 * Math.sin(angle),
    }
  })

  const gridPolygons = [0.25, 0.5, 0.75, 1].map((ratio) => radarMetrics.map((_, metricIndex) => {
    const angle = ((Math.PI * 2) / radarMetrics.length) * metricIndex - Math.PI / 2
    const radius = 42 + ratio * 84
    return `${150 + radius * Math.cos(angle)},${150 + radius * Math.sin(angle)}`
  }).join(' '))

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 px-4 py-10 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-2 text-3xl font-bold text-white md:text-4xl">Compare Cars</h2>
        <p className="mb-6 text-slate-300">Select up to 3 cars, compare them side by side, and spot the winners instantly.</p>

        <div className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border border-blue-500/30 bg-slate-800/80 p-5 text-white shadow-2xl">
          <label className="font-semibold text-blue-100">Sort by:</label>
          <select
            className="rounded-lg border border-blue-300/40 bg-slate-900 p-2 text-white transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="price">Price (Low to High)</option>
            <option value="mileage">Mileage (High to Low)</option>
            <option value="rating">Rating (High to Low)</option>
            <option value="engine">Engine Size (High to Low)</option>
          </select>

          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
            {selected.length}/3 selected
          </div>

          <p className="text-sm text-slate-400">Pick 2 or 3 cars for advanced compare.</p>

          {selected.length >= 2 && (
            <button
              className="ml-auto rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 px-6 py-2 font-semibold text-white shadow-lg transition-all duration-300 hover:from-blue-600 hover:to-indigo-700 hover:shadow-2xl"
              onClick={showComparison}
            >
              Compare {selected.length} Cars
            </button>
          )}
        </div>

        {loading && (
          <div className="py-10 text-center">
            <p className="text-gray-500">Loading cars...</p>
          </div>
        )}

        {!loading && (
          <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
            {sortedCars.map((car) => (
              <CarCard
                key={car._id}
                car={car}
                selectable={true}
                selected={!!selected.find((item) => item._id === car._id)}
                onSelect={handleSelect}
              />
            ))}
          </div>
        )}

        {showTable && sortedSelected.length >= 2 && (
          <div ref={comparisonRef} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-2xl border border-white/10 bg-slate-900/88 p-6 shadow-2xl backdrop-blur-xl">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="mb-2 text-xs uppercase tracking-[0.24em] text-indigo-200">Radar Overlay</p>
                    <h4 className="text-xl font-bold text-white md:text-2xl">How the selected cars stack up</h4>
                  </div>
                  <button
                    className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10"
                    onClick={resetComparison}
                  >
                    Reset
                  </button>
                </div>

                <div className="overflow-hidden rounded-2xl border border-white/8 bg-slate-950/70 p-4">
                  <svg viewBox="0 0 300 300" className="mx-auto h-[340px] w-full max-w-[360px]">
                    {gridPolygons.map((polygon, index) => (
                      <polygon key={index} points={polygon} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                    ))}
                    {axisPoints.map((point) => (
                      <g key={point.label}>
                        <line x1="150" y1="150" x2={point.x} y2={point.y} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                        <text x={point.labelX} y={point.labelY} fill="rgba(226,232,240,0.9)" fontSize="11" textAnchor="middle">
                          {point.label}
                        </text>
                      </g>
                    ))}
                    {radarData.map((item) => (
                      <g key={item.car._id}>
                        <polygon points={item.polygon} fill={item.colors.fill} stroke={item.colors.stroke} strokeWidth="2.5" />
                      </g>
                    ))}
                  </svg>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-900/88 p-6 shadow-2xl backdrop-blur-xl">
                <p className="mb-2 text-xs uppercase tracking-[0.24em] text-indigo-200">Legend</p>
                <h4 className="mb-5 text-xl font-bold text-white md:text-2xl">Selected cars</h4>
                <div className="space-y-4">
                  {sortedSelected.map((car, index) => (
                    <div key={car._id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                      <div className="mb-3 flex items-center gap-3">
                        <span className="h-3.5 w-3.5 rounded-full" style={{ background: radarColors[index]?.stroke || '#60a5fa' }} />
                        <div>
                          <p className="font-semibold text-white">{car.name}</p>
                          <p className="text-sm text-slate-400">{car.brand} · {car.type}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        <div className="rounded-xl bg-white/[0.04] p-3 text-slate-300">Price: <span className="font-semibold text-white">Rs {Number(car.price || 0).toLocaleString('en-IN')}</span></div>
                        <div className="rounded-xl bg-white/[0.04] p-3 text-slate-300">Mileage: <span className="font-semibold text-white">{car.mileage || 0} kmpl</span></div>
                        <div className="rounded-xl bg-white/[0.04] p-3 text-slate-300">Rating: <span className="font-semibold text-white">{car.rating || 0}/5</span></div>
                        <div className="rounded-xl bg-white/[0.04] p-3 text-slate-300">Reviews: <span className="font-semibold text-white">{car.reviewCount || 0}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/88 p-6 shadow-2xl backdrop-blur-xl">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h4 className="text-xl font-bold text-white md:text-2xl">Comparison Result</h4>
                <p className="text-sm text-slate-400">Best numeric values are highlighted in each row.</p>
              </div>

              <table className="w-full border-collapse text-center">
                <thead>
                  <tr className="border-b border-white/10 bg-slate-950/80 text-white">
                    <th className="p-4 text-left text-sm font-semibold uppercase tracking-wider text-slate-300">Feature</th>
                    {sortedSelected.map((car) => (
                      <th key={car._id} className="p-4 text-base font-semibold text-white">{car.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map(([label, key], rowIndex) => {
                    const winnerIds = getWinnerIds(key)

                    return (
                      <tr key={key} className={`border-b border-white/8 ${rowIndex % 2 === 0 ? 'bg-white/[0.02]' : 'bg-transparent'} hover:bg-white/[0.04]`}>
                        <td className="p-4 text-left text-sm font-semibold text-slate-300">{label}</td>
                        {sortedSelected.map((car) => {
                          const isWinner = winnerIds.includes(car._id)
                          const isPremiumMetric = key === 'price' || key === 'rating' || key === 'reviewCount'

                          return (
                            <td key={car._id} className="p-4">
                              <div
                                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${
                                  isWinner
                                    ? 'border-emerald-400/35 bg-emerald-500/15 text-emerald-100'
                                    : isPremiumMetric
                                      ? 'border-indigo-400/25 bg-indigo-500/15 text-indigo-100'
                                      : 'border-white/10 bg-white/[0.05] text-slate-100'
                                }`}
                              >
                                <span>{formatCompareValue(car, key)}</span>
                                {isWinner && <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-emerald-100">Best</span>}
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
        )}
      </div>
    </div>
  )
}

export default CompareCars
