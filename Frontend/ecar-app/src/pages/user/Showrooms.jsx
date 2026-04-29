import React, { Suspense, lazy, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axiosInstance from '../../utils/axiosInstance'
import Pagination from '../../components/shared/Pagination'
import { formatShowroomRating, getShowroomLocation, isValidCoordinate } from '../../utils/showroomUtils'

const LeafletMap = lazy(() => import('../../components/shared/LeafletMap'))

// Haversine formula to calculate distance in km
const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

const buildShowroomAddress = (showroom) => (
    [
        showroom?.name,
        showroom?.address?.street,
        showroom?.address?.area,
        showroom?.address?.city,
        showroom?.address?.state,
        showroom?.address?.pincode,
    ].filter(Boolean).join(', ')
)

const Showrooms = () => {
    const navigate = useNavigate()
    const [showrooms, setShowrooms] = useState([])
    const [page, setPage] = useState(1)
    const [meta, setMeta] = useState({ totalPages: 1 })
    const [area, setArea] = useState('')
    const [filterMessage, setFilterMessage] = useState('')
    const [loading, setLoading] = useState(true)

    // Map Specific State
    const [viewMode, setViewMode] = useState('grid') // 'grid' | 'map'
    const [userLocation, setUserLocation] = useState(null)
    const [mapCenter, setMapCenter] = useState(null)
    const [mapZoom, setMapZoom] = useState(5)
    const [filter5kmCenter, setFilter5kmCenter] = useState(null)
    const [mapShowrooms, setMapShowrooms] = useState([])

    const requestUserLocation = (trigger5km = false) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const loc = { lat: position.coords.latitude, lng: position.coords.longitude }
                    setUserLocation(loc)
                    setMapCenter(loc)
                    setMapZoom(12)
                    if (trigger5km) {
                        setFilter5kmCenter(loc)
                        if (viewMode !== 'map') setViewMode('map')
                        setFilterMessage('Showing showrooms within 5km of your location.')
                    }
                },
                (error) => {
                    console.error("Error getting user location:", error)
                    alert("Unable to access location. Please check your browser permissions.")
                }
            )
        } else {
            alert("Geolocation is not supported by this browser.")
        }
    }

    const loadShowrooms = async (searchArea = '', mode = viewMode) => {
        setLoading(true)
        try {
            const trimmedArea = searchArea.trim()
            const useNearby = /^\d{4,6}$/.test(trimmedArea)
            const limit = mode === 'map' ? 100 : 9; // load more on map
            
            const basePath = trimmedArea
                ? `${useNearby ? '/user/showrooms/nearby' : '/user/showrooms'}?area=${encodeURIComponent(trimmedArea)}&page=${page}&limit=${limit}`
                : `/user/showrooms?page=${page}&limit=${limit}`
                
            const res = await axiosInstance.get(basePath)
            const items = res.data.data || []
            setShowrooms(items)
            setMapShowrooms(items)
            setMeta(res.data.meta || { totalPages: 1 })
            if (trimmedArea) {
                setFilterMessage(items.length
                    ? `${items.length} showrooms matched for ${trimmedArea}`
                    : 'No matching showrooms found, showing the full network instead.')
                if (!items.length) {
                    const fallback = await axiosInstance.get(`/user/showrooms?page=${page}&limit=${limit}`)
                    setShowrooms(fallback.data.data || [])
                    setMapShowrooms(fallback.data.data || [])
                    setMeta(fallback.data.meta || { totalPages: 1 })
                }
                if (trimmedArea && mode === 'map') {
                    // If we found local matches, perfectly center map on the first valid matched showroom
                    const firstValid = items.find((sr) => getShowroomLocation(sr));
                    if (firstValid) {
                        setMapCenter(getShowroomLocation(firstValid));
                        setMapZoom(13);
                    } else {
                        geocodeAreaToCenterMap(trimmedArea);
                    }
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

    // Geocode the search area via Nominatim OpenStreetMap if in map mode
    const geocodeAreaToCenterMap = async (query) => {
        if (!query.trim() || viewMode !== 'map') return
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`)
            const data = await res.json()
            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat)
                const lon = parseFloat(data[0].lon)
                setMapCenter({ lat, lng: lon })
                setMapZoom(11)
            }
        } catch (err) {
            console.error("Nominatim geocoding failed", err)
        }
    }

    useEffect(() => {
        if (viewMode !== 'map' || !showrooms.length) {
            if (viewMode !== 'map') {
                setMapShowrooms(showrooms)
            }
            return
        }

        let ignore = false

        const resolveMissingLocations = async () => {
            const cacheKey = 'showroomGeocodeCache'
            const cache = (() => {
                try {
                    return JSON.parse(localStorage.getItem(cacheKey) || '{}')
                } catch {
                    return {}
                }
            })()

            const resolved = await Promise.all(showrooms.map(async (showroom) => {
                const existingLocation = getShowroomLocation(showroom)
                if (existingLocation) {
                    return {
                        ...showroom,
                        mapLocation: existingLocation,
                    }
                }

                const query = buildShowroomAddress(showroom)
                if (!query) return showroom

                const cached = cache[query]
                if (isValidCoordinate(cached)) {
                    return { ...showroom, mapLocation: cached }
                }

                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`)
                    const data = await res.json()
                    if (data?.length) {
                        const mapLocation = {
                            lat: Number(data[0].lat),
                            lng: Number(data[0].lon),
                        }
                        if (isValidCoordinate(mapLocation)) {
                            cache[query] = mapLocation
                            return { ...showroom, mapLocation }
                        }
                    }
                } catch (error) {
                    console.error('Unable to geocode showroom address', error)
                }

                return showroom
            }))

            if (ignore) return

            try {
                localStorage.setItem(cacheKey, JSON.stringify(cache))
            } catch {
                // Ignore cache write failures.
            }

            setMapShowrooms(resolved)

            if (!mapCenter) {
                const firstValid = resolved.find((showroom) => getShowroomLocation(showroom))
                if (firstValid) {
                    const nextCenter = getShowroomLocation(firstValid)
                    setMapCenter({ lat: Number(nextCenter.lat), lng: Number(nextCenter.lng) })
                    setMapZoom(11)
                }
            }
        }

        resolveMissingLocations()

        return () => {
            ignore = true
        }
    }, [mapCenter, showrooms, viewMode])

    useEffect(() => {
        loadShowrooms(area, viewMode)
    }, [page, viewMode])

    const handleSearch = () => {
        setPage(1)
        setFilter5kmCenter(null)
        loadShowrooms(area, viewMode)
    }

    const toggleNearbyFilter = () => {
        if (filter5kmCenter) {
            setFilter5kmCenter(null)
            setFilterMessage(area.trim() ? `Showing showroom results for ${area.trim()}` : '')
            return
        }

        requestUserLocation(true)
    }

    const toggleViewMode = () => {
        const nextMode = viewMode === 'grid' ? 'map' : 'grid';
        setViewMode(nextMode)
        setPage(1)
        if (nextMode === 'map' && !userLocation) {
            requestUserLocation()
        }
    }

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
                    <div className="flex w-full max-w-2xl flex-wrap items-center gap-3">
                        <button
                            onClick={toggleViewMode}
                            className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/5 flex items-center gap-2"
                            style={{ background: viewMode === 'map' ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)' }}
                        >
                            {viewMode === 'grid' ? (
                                <><span>🗺️</span> View Map</>
                            ) : (
                                <><span>🔢</span> View Grid</>
                            )}
                        </button>

                        <div className="flex flex-1 gap-2">
                            <input
                                value={area}
                                onChange={(event) => setArea(event.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                placeholder="Search city or specific area"
                                className="flex-1 rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none min-w-[200px]"
                            />
                            <button
                                type="button"
                                onClick={handleSearch}
                                className="rounded-2xl px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
                                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                            >
                                Search
                            </button>
                            <button
                                type="button"
                                onClick={toggleNearbyFilter}
                                className="rounded-2xl px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 whitespace-nowrap"
                                style={{ background: filter5kmCenter ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #10b981, #059669)' }}
                            >
                                📍 Nearby (5km)
                            </button>
                        </div>
                    </div>
                </div>

                {filterMessage && (
                    <p className="mb-5 text-sm" style={{ color: '#c7d2fe', fontFamily: "'DM Sans', sans-serif" }}>{filterMessage}</p>
                )}

                {viewMode === 'map' ? (() => {
                    const displayedMapShowrooms = mapShowrooms.filter(sr => {
                        const location = getShowroomLocation(sr)
                        if (!filter5kmCenter) return true;
                        if (!location) return false;
                        const dist = getDistance(filter5kmCenter.lat, filter5kmCenter.lng, Number(location.lat), Number(location.lng));
                        return dist <= 5;
                    });
                    
                    return (
                        <div className="mt-4 shadow-2xl shadow-indigo-500/10 rounded-3xl animate-in fade-in zoom-in-95 duration-300">
                            <Suspense
                                fallback={
                                    <div className="flex h-[600px] items-center justify-center rounded-3xl border border-white/10 bg-slate-950/40 text-sm text-slate-300">
                                        Loading map...
                                    </div>
                                }
                            >
                            <LeafletMap 
                                showrooms={displayedMapShowrooms} 
                                center={mapCenter} 
                                zoom={mapZoom} 
                                userLocation={userLocation} 
                                isLoading={loading}
                                hideUserLocation={!!filter5kmCenter}
                            />
                        </Suspense>
                            <p className="mt-4 text-center text-xs text-slate-400">
                                Showing {displayedMapShowrooms.length} of {mapShowrooms.length} showroom{mapShowrooms.length === 1 ? '' : 's'} on the map
                            </p>
                            {meta.totalPages > 1 && !filter5kmCenter && (
                                <p className="text-center mt-4 text-xs text-slate-400">Showing first 100 results on map. Refine area search to see more specific results.</p>
                            )}
                            {filter5kmCenter && displayedMapShowrooms.length === 0 && (
                                <p className="text-center mt-4 text-sm text-amber-400">No showrooms found within 5km of your location.</p>
                            )}
                        </div>
                    );
                })() : (
                    <>
                        {loading ? (
                            <div className="py-20 text-center">
                                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
                            </div>
                        ) : (
                            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                                {showrooms.map((showroom) => (
                                    <div key={showroom._id} className="overflow-hidden rounded-[28px] transition-transform hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/20" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                        <div className="h-52 w-full" style={{ background: showroom.logo ? `center / cover no-repeat url(${showroom.logo})` : 'linear-gradient(135deg, rgba(99,102,241,0.35), rgba(14,165,233,0.25))' }} />
                                        <div className="p-6">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1">
                                                    <h2 className="text-2xl font-bold text-white truncate" title={showroom.name}>{showroom.name}</h2>
                                                    <p className="mt-2 text-sm" style={{ color: 'rgba(255,255,255,0.55)', fontFamily: "'DM Sans', sans-serif" }}>
                                                        {showroom.address?.city || '--'}, {showroom.address?.state || '--'}
                                                    </p>
                                                </div>
                                                <span className="rounded-full px-3 py-1 text-xs font-semibold shrink-0" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)', color: '#6ee7b7' }}>
                                                    {formatShowroomRating(showroom)} ★
                                                </span>
                                            </div>
                                            <p className="mt-4 text-sm leading-7 line-clamp-2" style={{ color: 'rgba(255,255,255,0.58)', fontFamily: "'DM Sans', sans-serif" }}>
                                                {showroom.description || 'Explore this showroom’s inventory and available test drive slots.'}
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => navigate(`/user/showrooms/${showroom._id}`)}
                                                className="mt-5 rounded-2xl px-5 py-3 text-sm font-semibold text-white w-full transition hover:opacity-90"
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
                    </>
                )}
            </div>
        </div>
    )
}

export default Showrooms
