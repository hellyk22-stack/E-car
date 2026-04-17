import React, { useMemo } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const formatShortDate = (value) => new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
})

const PriceHistoryChart = ({ data = [] }) => {
    const chartData = useMemo(() => (
        [...data]
            .slice(-10)
            .map((item) => ({
                ...item,
                changedAt: item.changedAt || item.date,
                price: Number(item.price || 0),
            }))
    ), [data])

    if (!chartData.length) {
        return (
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 text-center">
                <p className="text-white font-semibold">No price history yet</p>
                <p className="mt-2 text-sm text-slate-400" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    The trend line will appear after the admin or showroom logs price changes.
                </p>
            </div>
        )
    }

    const prices = chartData.map((item) => item.price)

    return (
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
            <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 12, right: 16, bottom: 8, left: 8 }}>
                        <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
                        <XAxis dataKey="changedAt" tickFormatter={formatShortDate} stroke="rgba(226,232,240,0.7)" tick={{ fontSize: 11 }} />
                        <YAxis stroke="rgba(226,232,240,0.7)" tickFormatter={(value) => `Rs ${Math.round(value / 100000)}L`} tick={{ fontSize: 11 }} />
                        <Tooltip
                            formatter={(value) => `Rs ${Math.round(value).toLocaleString('en-IN')}`}
                            labelFormatter={(value) => formatShortDate(value)}
                            contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16 }}
                        />
                        <Line type="monotone" dataKey="price" stroke="#818cf8" strokeWidth={3} dot={{ r: 4, fill: '#a78bfa' }} activeDot={{ r: 6 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-white/[0.03] p-4">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Lowest recorded price</p>
                    <p className="mt-2 text-xl font-bold text-white">Rs {Math.round(Math.min(...prices)).toLocaleString('en-IN')}</p>
                </div>
                <div className="rounded-xl bg-white/[0.03] p-4">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Highest recorded price</p>
                    <p className="mt-2 text-xl font-bold text-white">Rs {Math.round(Math.max(...prices)).toLocaleString('en-IN')}</p>
                </div>
            </div>
        </div>
    )
}

export default PriceHistoryChart
