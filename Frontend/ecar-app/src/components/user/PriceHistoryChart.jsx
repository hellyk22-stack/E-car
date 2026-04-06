import React, { useMemo } from 'react'

const formatShortDate = (value) => new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
})

const PriceHistoryChart = ({ data = [] }) => {
    const chartData = useMemo(() => {
        if (!data.length) return null

        const prices = data.map((item) => Number(item.price || 0))
        const min = Math.min(...prices)
        const max = Math.max(...prices)
        const width = 520
        const height = 220
        const padding = 28

        const points = data.map((item, index) => {
            const x = padding + ((width - padding * 2) * index) / Math.max(data.length - 1, 1)
            const normalized = max === min ? 0.5 : (Number(item.price || 0) - min) / (max - min)
            const y = height - padding - normalized * (height - padding * 2)
            return { ...item, x, y }
        })

        return {
            width,
            height,
            min,
            max,
            points,
            path: points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' '),
        }
    }, [data])

    if (!chartData) {
        return (
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 text-center">
                <p className="text-white font-semibold">No price history yet</p>
                <p className="mt-2 text-sm text-slate-400" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    The trend line will appear after the admin logs at least one price change.
                </p>
            </div>
        )
    }

    return (
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
            <svg viewBox={`0 0 ${chartData.width} ${chartData.height}`} className="h-[250px] w-full">
                {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                    const y = chartData.height - 28 - ratio * (chartData.height - 56)
                    return (
                        <line
                            key={ratio}
                            x1="28"
                            x2={chartData.width - 28}
                            y1={y}
                            y2={y}
                            stroke="rgba(255,255,255,0.08)"
                            strokeWidth="1"
                        />
                    )
                })}

                <path d={chartData.path} fill="none" stroke="#818cf8" strokeWidth="3" strokeLinecap="round" />

                {chartData.points.map((point) => (
                    <g key={`${point.changedAt}-${point.price}`}>
                        <circle cx={point.x} cy={point.y} r="5" fill="#a78bfa" stroke="#ffffff" strokeWidth="1.5" />
                        <text x={point.x} y={chartData.height - 8} textAnchor="middle" fill="rgba(226,232,240,0.9)" fontSize="11">
                            {formatShortDate(point.changedAt)}
                        </text>
                    </g>
                ))}
            </svg>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-white/[0.03] p-4">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Lowest recorded price</p>
                    <p className="mt-2 text-xl font-bold text-white">Rs {Math.round(chartData.min).toLocaleString('en-IN')}</p>
                </div>
                <div className="rounded-xl bg-white/[0.03] p-4">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Highest recorded price</p>
                    <p className="mt-2 text-xl font-bold text-white">Rs {Math.round(chartData.max).toLocaleString('en-IN')}</p>
                </div>
            </div>
        </div>
    )
}

export default PriceHistoryChart
