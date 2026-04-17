import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axiosInstance from '../../utils/axiosInstance'
import Pagination from '../../components/shared/Pagination'

const Showrooms = () => {
    const navigate = useNavigate()
    const [showrooms, setShowrooms] = useState([])
    const [page, setPage] = useState(1)
    const [meta, setMeta] = useState({ totalPages: 1 })
    const [area, setArea] = useState('')
    const [filterMessage, setFilterMessage] = useState('')
    const [loading, setLoading] = useState(true)

    const loadShowrooms = async (searchArea = '') => {
        setLoading(true)
        try {
            const trimmedArea = searchArea.trim()
            const useNearby = /^\d{4,6}$/.test(trimmedArea)
            const basePath = trimmedArea
                ? `${useNearby ? '/user/showrooms/nearby' : '/user/showrooms'}?area=${encodeURIComponent(trimmedArea)}&page=${page}&limit=9`
                : `/user/showrooms?page=${page}&limit=9`
            const res = await axiosInstance.get(basePath)
            const items = res.data.data || []
            setShowrooms(items)
            setMeta(res.data.meta || { totalPages: 1 })
            if (trimmedArea) {
                setFilterMessage(items.length
                    ? `${items.length} showrooms matched for ${trimmedArea}`
                    : 'No matching showrooms found, showing the full network instead.')
                if (!items.length) {
                    const fallback = await axiosInstance.get(`/user/showrooms?page=${page}&limit=9`)
                    setShowrooms(fallback.data.data || [])
                    setMeta(fallback.data.meta || { totalPages: 1 })
                }
            } else {
                setFilterMessage('')
            }
        } catch (error) {
            console.error('Failed to load showrooms', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadShowrooms(area)
    }, [page])

    return (
        <div className="min-h-screen px-4 py-10">
            <div className="mx-auto max-w-7xl">
                <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: '#818cf8' }}>Showrooms</p>
                        <h1 className="mt-2 text-4xl font-black text-white">Find a nearby test drive partner</h1>
                        <p className="mt-3 max-w-2xl text-sm" style={{ color: 'rgba(255,255,255,0.55)', fontFamily: "'DM Sans', sans-serif" }}>
                            Browse approved showrooms, explore their cars, and book a slot that fits your location and schedule.
                        </p>
                    </div>
                    <div className="flex w-full max-w-xl flex-wrap gap-3">
                        <input
                            value={area}
                            onChange={(event) => setArea(event.target.value)}
                            placeholder="Search by area, city, or pincode"
                            className="flex-1 rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none"
                        />
                        <button
                            type="button"
                            onClick={() => {
                                setPage(1)
                                loadShowrooms(area)
                            }}
                            className="rounded-2xl px-5 py-3 text-sm font-semibold text-white"
                            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                        >
                            Search area
                        </button>
                    </div>
                </div>

                {filterMessage && (
                    <p className="mb-5 text-sm" style={{ color: '#c7d2fe', fontFamily: "'DM Sans', sans-serif" }}>{filterMessage}</p>
                )}

                {loading ? (
                    <div className="py-20 text-center">
                        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {showrooms.map((showroom) => (
                            <div key={showroom._id} className="overflow-hidden rounded-[28px]" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <div className="h-52 w-full" style={{ background: showroom.logo ? `center / cover no-repeat url(${showroom.logo})` : 'linear-gradient(135deg, rgba(99,102,241,0.35), rgba(14,165,233,0.25))' }} />
                                <div className="p-6">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <h2 className="text-2xl font-bold text-white">{showroom.name}</h2>
                                            <p className="mt-2 text-sm" style={{ color: 'rgba(255,255,255,0.55)', fontFamily: "'DM Sans', sans-serif" }}>
                                                {showroom.address?.city || '--'}, {showroom.address?.state || '--'}
                                            </p>
                                        </div>
                                        <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)', color: '#6ee7b7' }}>
                                            {Number(showroom.rating?.average || 0).toFixed(1)} ★
                                        </span>
                                    </div>
                                    <p className="mt-4 text-sm leading-7" style={{ color: 'rgba(255,255,255,0.58)', fontFamily: "'DM Sans', sans-serif" }}>
                                        {showroom.description || 'Explore this showroom’s inventory and available test drive slots.'}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => navigate(`/user/showrooms/${showroom._id}`)}
                                        className="mt-5 rounded-2xl px-5 py-3 text-sm font-semibold text-white"
                                        style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
                                    >
                                        View details
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <Pagination page={page} totalPages={meta.totalPages || 1} onChange={setPage} />
            </div>
        </div>
    )
}

export default Showrooms
