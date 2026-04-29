import React, { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useNavigate } from 'react-router-dom'
import { formatShowroomRating, getShowroomLocation } from '../../utils/showroomUtils'

// Fix generic react-leaflet icon issues
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
})

// Custom Icon for standard Showrooms
const showroomIcon = new L.DivIcon({
    className: 'custom-leaflet-icon',
    html: `<div style="background:linear-gradient(135deg, #6366f1, #8b5cf6); border-radius:50%; width:32px; height:32px; display:flex; align-items:center; justify-content:center; border: 3px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
        <svg fill="none" stroke="white" stroke-width="2" viewBox="0 0 24 24" style="width:16px;height:16px;"><path stroke-linecap="round" stroke-linejoin="round" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"></path><circle cx="12" cy="9" r="2.5"></circle></svg>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
})

// Custom Icon for User Location
const userIcon = new L.DivIcon({
    className: 'custom-user-icon',
    html: `<div style="background:#ef4444; border-radius:50%; width:24px; height:24px; border: 3px solid white; box-shadow: 0 0 10px rgba(239, 68, 68, 0.8);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
})

// Internal hook component to safely fly to locations dynamically
function MapEffectListener({ center, zoom }) {
    const map = useMap()
    useEffect(() => {
        if (center && Number.isFinite(Number(center.lat)) && Number.isFinite(Number(center.lng))) {
            map.flyTo([center.lat, center.lng], zoom, { duration: 1.5 })
        }
    }, [center, zoom, map])
    return null
}

const LeafletMap = ({ showrooms = [], center, zoom = 11, userLocation, isLoading, hideUserLocation = false }) => {
    const navigate = useNavigate()
    const locationUsage = new Map()

    return (
        <div className="relative h-[600px] w-full overflow-hidden rounded-3xl border border-white/10" style={{ background: 'rgba(255,255,255,0.03)' }}>
            {isLoading && (
                <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
                </div>
            )}
            
            <MapContainer 
                center={center ? [center.lat, center.lng] : [20.5937, 78.9629]} // Default to India approx
                zoom={zoom} 
                style={{ height: '100%', width: '100%', zIndex: 1 }}
                scrollWheelZoom={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapEffectListener center={center} zoom={zoom} />

                {userLocation && !hideUserLocation && (
                    <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
                        <Popup className="custom-popup">
                            <div className="font-semibold text-slate-800">Your Location</div>
                        </Popup>
                    </Marker>
                )}

                {showrooms.map((showroom) => {
                    const markerLocation = getShowroomLocation(showroom)
                    const lat = Number(markerLocation?.lat)
                    const lng = Number(markerLocation?.lng)
                    if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) return null

                    const coordinateKey = `${lat.toFixed(6)}:${lng.toFixed(6)}`
                    const duplicateIndex = locationUsage.get(coordinateKey) || 0
                    locationUsage.set(coordinateKey, duplicateIndex + 1)
                    const adjustedLat = lat + (duplicateIndex * 0.00018)
                    const adjustedLng = lng + (duplicateIndex * 0.00018)
                    
                    return (
                        <Marker 
                            key={showroom._id} 
                            position={[adjustedLat, adjustedLng]}
                            icon={showroomIcon}
                        >
                            <Popup className="custom-popup">
                                <div className="p-1 min-w-[200px]">
                                    <div 
                                        className="mb-2 h-20 w-full rounded-lg" 
                                        style={{ background: showroom.logo ? `center / cover no-repeat url(${showroom.logo})` : 'linear-gradient(135deg, rgba(99,102,241,0.35), rgba(14,165,233,0.25))' }}
                                    />
                                    <h3 className="text-lg font-bold text-slate-800 leading-tight mb-1">{showroom.name}</h3>
                                    <p className="text-sm text-slate-600 mb-2">
                                        {showroom.address?.city || '--'}, {showroom.address?.state || '--'}
                                    </p>
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                                            {formatShowroomRating(showroom)} ★
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => navigate(`/user/showrooms/${showroom._id}`)}
                                        className="w-full rounded bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500"
                                    >
                                        View Details
                                    </button>
                                </div>
                            </Popup>
                        </Marker>
                    )
                })}
            </MapContainer>
        </div>
    )
}

export default LeafletMap
