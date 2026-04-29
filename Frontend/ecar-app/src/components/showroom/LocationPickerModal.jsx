import React, { useEffect, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { toast } from 'react-toastify'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const defaultCenter = { lat: 20.5937, lng: 78.9629 }

const isValidCoordinate = (location) => {
    const lat = Number(location?.lat)
    const lng = Number(location?.lng)
    return Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0)
}

const formatCoordinate = (value) => Number(value).toFixed(6)

const MapViewportController = ({ center, zoom }) => {
    const map = useMap()

    useEffect(() => {
        if (!isValidCoordinate(center)) return
        map.flyTo([Number(center.lat), Number(center.lng)], zoom, { duration: 1 })
    }, [center, map, zoom])

    return null
}

const ClickToPickMarker = ({ selectedLocation, onSelect }) => {
    useMapEvents({
        click(event) {
            onSelect({
                lat: event.latlng.lat,
                lng: event.latlng.lng,
            })
        },
    })

    if (!isValidCoordinate(selectedLocation)) return null

    return <Marker position={[Number(selectedLocation.lat), Number(selectedLocation.lng)]} />
}

const LocationPickerModal = ({
    open,
    onClose,
    onSelect,
    initialLocation = null,
    addressHint = '',
    title = 'Pick showroom location',
}) => {
    const [selectedLocation, setSelectedLocation] = useState(initialLocation)
    const [mapCenter, setMapCenter] = useState(initialLocation && isValidCoordinate(initialLocation) ? initialLocation : defaultCenter)
    const [mapZoom, setMapZoom] = useState(initialLocation && isValidCoordinate(initialLocation) ? 15 : 5)
    const [searchQuery, setSearchQuery] = useState(addressHint)
    const [resolvingAddress, setResolvingAddress] = useState(false)

    useEffect(() => {
        if (!open) return

        const nextInitial = initialLocation && isValidCoordinate(initialLocation) ? initialLocation : null
        setSelectedLocation(nextInitial)
        setMapCenter(nextInitial || defaultCenter)
        setMapZoom(nextInitial ? 15 : 5)
        setSearchQuery(addressHint)
    }, [addressHint, initialLocation, open])

    if (!open) return null

    const handleResolveAddress = async (query = searchQuery) => {
        const trimmedQuery = String(query || '').trim()
        if (!trimmedQuery) {
            toast.info('Add the showroom address or city first, then try the map picker.')
            return
        }

        setResolvingAddress(true)
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trimmedQuery)}&limit=1`)
            const data = await response.json()

            if (!Array.isArray(data) || !data.length) {
                toast.info('No map match found for that address yet. You can still click on the map manually.')
                return
            }

            const nextLocation = {
                lat: Number(data[0].lat),
                lng: Number(data[0].lon),
            }

            if (!isValidCoordinate(nextLocation)) {
                toast.info('That address did not return valid coordinates.')
                return
            }

            setSelectedLocation(nextLocation)
            setMapCenter(nextLocation)
            setMapZoom(15)
        } catch (error) {
            toast.error('Unable to search the map right now.')
        } finally {
            setResolvingAddress(false)
        }
    }

    const handleUseCurrentLocation = () => {
        if (!navigator.geolocation) {
            toast.info('Geolocation is not available in this browser.')
            return
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const nextLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                }
                setSelectedLocation(nextLocation)
                setMapCenter(nextLocation)
                setMapZoom(16)
            },
            () => {
                toast.error('Unable to access your current location.')
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
            },
        )
    }

    const handleConfirm = () => {
        if (!isValidCoordinate(selectedLocation)) {
            toast.info('Click on the map to drop a pin before saving.')
            return
        }

        onSelect({
            lat: formatCoordinate(selectedLocation.lat),
            lng: formatCoordinate(selectedLocation.lng),
        })
        onClose()
    }

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/80 px-4 py-6" onClick={onClose}>
            <div
                className="w-full max-w-5xl rounded-[32px] border border-white/10 bg-slate-950/95 p-5 shadow-2xl shadow-slate-950/50"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: '#93c5fd' }}>Map picker</p>
                        <h3 className="mt-2 text-2xl font-bold text-white">{title}</h3>
                        <p className="mt-2 text-sm text-white/55" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                            Search the showroom address, then click to fine-tune the exact map pin.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white"
                    >
                        Close
                    </button>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                    <input
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                event.preventDefault()
                                handleResolveAddress()
                            }
                        }}
                        placeholder="Search showroom address, city, or pincode"
                        className="min-w-[260px] flex-1 rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
                    />
                    <button
                        type="button"
                        onClick={() => handleResolveAddress()}
                        disabled={resolvingAddress}
                        className="rounded-2xl px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                        style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
                    >
                        {resolvingAddress ? 'Finding...' : 'Find on map'}
                    </button>
                    <button
                        type="button"
                        onClick={handleUseCurrentLocation}
                        className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-200"
                    >
                        Use current location
                    </button>
                </div>

                <div className="mt-5 overflow-hidden rounded-[28px] border border-white/10">
                    <MapContainer
                        center={[Number(mapCenter.lat), Number(mapCenter.lng)]}
                        zoom={mapZoom}
                        style={{ height: '420px', width: '100%' }}
                        scrollWheelZoom
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <MapViewportController center={mapCenter} zoom={mapZoom} />
                        <ClickToPickMarker selectedLocation={selectedLocation} onSelect={setSelectedLocation} />
                    </MapContainer>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm text-white/70" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        {isValidCoordinate(selectedLocation)
                            ? `Selected: ${formatCoordinate(selectedLocation.lat)}, ${formatCoordinate(selectedLocation.lng)}`
                            : 'No pin selected yet.'}
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={handleConfirm}
                            className="rounded-2xl px-5 py-3 text-sm font-semibold text-white"
                            style={{ background: 'linear-gradient(135deg, #0ea5e9, #2563eb)' }}
                        >
                            Save location
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default LocationPickerModal
