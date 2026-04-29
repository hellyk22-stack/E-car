import React, { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import axiosInstance from '../../utils/axiosInstance'
import TestDriveBookingModal from '../../components/bookings/TestDriveBookingModal'
import CarCard from '../../components/user/CarCard'
import { mergeShowroomInventoryWithCatalog } from '../../utils/showroomInventory'

const normalizeCatalogCar = (car) => {
    if (!car || typeof car !== 'object') return null

    return {
        ...car,
        _id: car._id || car.id || '',
    }
}

const BookTestDrive = () => {
    const { showroomId } = useParams()
    const [profile, setProfile] = useState({ name: '', phone: '', address: {} })
    const [mode, setMode] = useState(showroomId ? 'showroom' : 'home')
    const [search, setSearch] = useState('')
    const [cars, setCars] = useState([])
    const [allCars, setAllCars] = useState([])
    const [showrooms, setShowrooms] = useState([])
    const [selectedShowroom, setSelectedShowroom] = useState(null)
    const [selectedCar, setSelectedCar] = useState(null)
    const [loading, setLoading] = useState(true)
    const [loadingShowrooms, setLoadingShowrooms] = useState(false)
    const [savingAddress, setSavingAddress] = useState(false)
    const [modalOpen, setModalOpen] = useState(false)
    const [showroomHasInventory, setShowroomHasInventory] = useState(true)

    useEffect(() => {
        const load = async () => {
            setLoading(true)
            try {
                const [profileRes, carsRes] = await Promise.all([
                    axiosInstance.get('/user/profile'),
                    axiosInstance.get('/car/cars'),
                ])

                const nextProfile = profileRes.data.data || { name: '', phone: '', address: {} }
                const catalogCars = (carsRes.data.data || []).map(normalizeCatalogCar).filter((car) => car?._id)
                setProfile(nextProfile)
                setAllCars(catalogCars)

                if (showroomId) {
                    const showroomRes = await axiosInstance.get(`/user/showrooms/${showroomId}`)
                    const showroom = showroomRes.data.data
                    const showroomCars = mergeShowroomInventoryWithCatalog(showroom, catalogCars)
                    setSelectedShowroom(showroom)
                    setShowrooms([showroom])
                    setShowroomHasInventory(showroomCars.length > 0)
                    if (showroomCars.length > 0) {
                        setMode('showroom')
                        setCars(showroomCars)
                    } else {
                        setMode('showroom')
                        setCars([])
                    }
                } else {
                    setShowroomHasInventory(true)
                    setCars(catalogCars)
                }
            } catch (error) {
                toast.error('Unable to load the booking experience right now.')
            } finally {
                setLoading(false)
            }
        }

        load()
    }, [showroomId])

    useEffect(() => {
        if (showroomId || mode !== 'showroom') return
        const pincode = String(profile.address?.pincode || '').trim()
        if (!pincode) return

        const loadNearbyShowrooms = async () => {
            setLoadingShowrooms(true)
            try {
                const res = await axiosInstance.get(`/user/showrooms/nearby?area=${encodeURIComponent(pincode)}&page=1&limit=12`)
                const items = res.data.data || []
                setShowrooms(items)
                setSelectedShowroom(items[0] || null)
            } catch (error) {
                toast.error('Unable to load nearby showrooms.')
            } finally {
                setLoadingShowrooms(false)
            }
        }

        loadNearbyShowrooms()
    }, [mode, profile.address?.pincode, showroomId])

    useEffect(() => {
        if (!selectedShowroom || mode !== 'showroom') return
        setCars(mergeShowroomInventoryWithCatalog(selectedShowroom, allCars))
        setSelectedCar(null)
    }, [allCars, mode, selectedShowroom])

    useEffect(() => {
        if (mode !== 'home') return
        setCars(allCars)
        setSelectedCar(null)
    }, [allCars, mode])

    const visibleCars = useMemo(() => {
        const query = search.trim().toLowerCase()
        if (!query) return cars
        return cars.filter((car) => [car.name, car.brand, car.type, car.fuel].filter(Boolean).some((value) => String(value).toLowerCase().includes(query)))
    }, [cars, search])

    const updateAddress = (key, value) => {
        setProfile((prev) => ({
            ...prev,
            address: {
                ...prev.address,
                [key]: value,
            },
        }))
    }

    const saveAddress = async () => {
        setSavingAddress(true)
        try {
            await axiosInstance.put('/user/profile', profile)
            toast.success('Address updated successfully.')
        } catch (error) {
            toast.error(error.response?.data?.message || 'Unable to save address right now.')
        } finally {
            setSavingAddress(false)
        }
    }

    if (loading) {
        return <div className="flex min-h-screen items-center justify-center"><div className="h-12 w-12 animate-spin rounded-full border-2 border-sky-300 border-t-transparent" /></div>
    }

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.16),_transparent_25%),linear-gradient(180deg,_#06101d,_#0b1220_45%,_#09111b)] px-4 py-10 text-white">
            <style>{`
                .booking-car-scroll {
                    scrollbar-width: thin;
                    scrollbar-color: rgba(56, 189, 248, 0.55) rgba(15, 23, 42, 0.35);
                }
                .booking-car-scroll::-webkit-scrollbar {
                    width: 10px;
                }
                .booking-car-scroll::-webkit-scrollbar-track {
                    background: rgba(15, 23, 42, 0.35);
                    border-radius: 999px;
                }
                .booking-car-scroll::-webkit-scrollbar-thumb {
                    background: linear-gradient(180deg, rgba(56, 189, 248, 0.7), rgba(37, 99, 235, 0.7));
                    border-radius: 999px;
                    border: 2px solid rgba(15, 23, 42, 0.35);
                }
            `}</style>
            <div className="mx-auto max-w-7xl">
                <div className="mb-8 rounded-[32px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
                    <p className="text-xs font-semibold uppercase tracking-[0.26em] text-sky-200">Book Your Test Drive</p>
                    <h1 className="mt-3 text-4xl font-black" style={{ fontFamily: "'Syne', sans-serif" }}>Choose your car and schedule a drive</h1>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-white/60" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        Pick a booking style, search the available cars, and continue to confirm your preferred date and time.
                    </p>
                </div>

                <div className="grid gap-8 lg:grid-cols-[380px_1fr] xl:grid-cols-[420px_1fr]">
                    <div className="space-y-6">
                        <div className="rounded-[28px] border border-white/10 bg-white/[0.035] p-6">
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200">Choose Style</p>
                            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-1">
                                {[
                                    ['home', 'At Home', 'Select any car, then we match a showroom that covers your address.'],
                                    ['showroom', 'Nearby Showroom', 'Start from your profile pincode and browse inventory showroom by showroom.'],
                                ].map(([value, title, subtitle]) => (
                                    <button key={value} type="button" onClick={() => { setMode(value); setSelectedCar(null) }} className="rounded-[24px] p-5 text-left" style={{ background: mode === value ? 'rgba(56,189,248,0.14)' : 'rgba(255,255,255,0.03)', border: `1px solid ${mode === value ? 'rgba(125,211,252,0.28)' : 'rgba(255,255,255,0.08)'}` }}>
                                        <p className="text-xl font-bold text-white">{title}</p>
                                        <p className="mt-2 text-sm text-white/60" style={{ fontFamily: "'DM Sans', sans-serif" }}>{subtitle}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-[28px] border border-white/10 bg-white/[0.035] p-6">
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200">Profile Address</p>
                            <p className="mt-3 text-sm text-white/60" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                Add your address here to improve nearby showroom results. Map auto-pick can be added next, but it needs a maps provider setup.
                            </p>
                            <div className="mt-5 grid gap-4">
                                <textarea
                                    value={profile.address?.street || ''}
                                    onChange={(event) => updateAddress('street', event.target.value)}
                                    rows="3"
                                    placeholder="Street address"
                                    className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none"
                                />
                                <input
                                    value={profile.address?.area || ''}
                                    onChange={(event) => updateAddress('area', event.target.value)}
                                    placeholder="Area / Landmark"
                                    className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none"
                                />
                                <div className="grid gap-4 md:grid-cols-3">
                                    <input
                                        value={profile.address?.city || ''}
                                        onChange={(event) => updateAddress('city', event.target.value)}
                                        placeholder="City"
                                        className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none"
                                    />
                                    <input
                                        value={profile.address?.state || ''}
                                        onChange={(event) => updateAddress('state', event.target.value)}
                                        placeholder="State"
                                        className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none"
                                    />
                                    <input
                                        value={profile.address?.pincode || ''}
                                        onChange={(event) => updateAddress('pincode', event.target.value)}
                                        placeholder="Pincode"
                                        className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={saveAddress}
                                    disabled={savingAddress}
                                    className="w-full rounded-2xl bg-[linear-gradient(135deg,#38bdf8,#2563eb)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                                >
                                    {savingAddress ? 'Saving address...' : 'Save Address'}
                                </button>
                            </div>
                        </div>

                        {mode === 'showroom' && (
                            <div className="rounded-[28px] border border-white/10 bg-white/[0.035] p-6">
                                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200">Nearby Showrooms</p>
                                {loadingShowrooms ? <p className="mt-3 text-white/60">Loading nearby approved showrooms...</p> : (
                                    <div className="mt-4 space-y-3">
                                        {showrooms.map((item) => (
                                            <button key={item._id} type="button" onClick={() => setSelectedShowroom(item)} className="w-full rounded-[22px] p-4 text-left" style={{ background: selectedShowroom?._id === item._id ? 'rgba(56,189,248,0.14)' : 'rgba(255,255,255,0.03)', border: `1px solid ${selectedShowroom?._id === item._id ? 'rgba(125,211,252,0.28)' : 'rgba(255,255,255,0.08)'}` }}>
                                                <p className="font-semibold text-white">{item.name}</p>
                                                <p className="mt-1 text-sm text-white/55">{[item.address?.street, item.address?.city, item.address?.state, item.address?.pincode].filter(Boolean).join(', ')}</p>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="rounded-[32px] border border-white/10 bg-white/[0.035] p-6 backdrop-blur-xl">
                        {showroomId && !showroomHasInventory && (
                            <div className="mb-5 rounded-[24px] border border-amber-300/20 bg-amber-400/10 p-4">
                                <p className="text-sm font-semibold text-amber-100">This showroom does not have any cars available for its registered brands yet.</p>
                                <p className="mt-1 text-sm text-amber-50/75" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                    Only the showroom&apos;s own brand cars can be booked from this page.
                                </p>
                            </div>
                        )}
                        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-200">Select Car</p>
                                <h2 className="mt-2 text-2xl font-bold text-white" style={{ fontFamily: "'Syne', sans-serif" }}>{mode === 'home' ? 'All cars available for home-drive matching' : (selectedShowroom ? `${selectedShowroom.name} inventory` : 'Pick a showroom first')}</h2>
                                <p className="mt-2 text-sm text-white/55" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                    {visibleCars.length} car{visibleCars.length === 1 ? '' : 's'} shown
                                </p>
                            </div>
                            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search car, brand, fuel, type" className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none" />
                        </div>

                        {!cars.length ? (
                            <div className="rounded-[28px] border border-dashed border-white/10 bg-slate-950/30 p-8 text-center">
                                <p className="text-lg font-semibold text-white">No cars available right now</p>
                                <p className="mt-2 text-sm text-white/55" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                    {mode === 'showroom'
                                        ? 'No cars from this showroom\'s registered brands are available right now.'
                                        : 'We could not load the car catalog right now. Please refresh and try again.'}
                                </p>
                                {mode === 'showroom' && !showroomId && allCars.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setMode('home')}
                                        className="mt-5 rounded-2xl bg-[linear-gradient(135deg,#38bdf8,#2563eb)] px-5 py-3 text-sm font-semibold text-white"
                                    >
                                        Browse All Cars Instead
                                    </button>
                                )}
                            </div>
                        ) : !visibleCars.length ? (
                            <div className="rounded-[28px] border border-dashed border-white/10 bg-slate-950/30 p-8 text-center">
                                <p className="text-lg font-semibold text-white">No cars match your search</p>
                                <p className="mt-2 text-sm text-white/55" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                    Try another keyword like brand, fuel type, or model name.
                                </p>
                            </div>
                        ) : (
                            <div className="rounded-[28px] border border-white/10 bg-slate-950/20 p-3">
                                <div className="booking-car-scroll max-h-[760px] overflow-y-auto pr-3">
                                    <div className="grid gap-6 md:grid-cols-2">
                                        {visibleCars.map((car) => (
                                            <CarCard key={car._id} car={car} selectable selected={selectedCar?._id === car._id} onSelect={setSelectedCar} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {selectedCar && (
                            <div className="mt-6 rounded-[28px] border border-sky-300/15 bg-sky-400/10 p-5">
                                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-100">Ready To Continue</p>
                                <p className="mt-2 text-lg font-semibold text-white">{selectedCar.brand} {selectedCar.name}</p>
                                <button type="button" onClick={() => setModalOpen(true)} className="mt-4 rounded-2xl bg-[linear-gradient(135deg,#38bdf8,#2563eb)] px-5 py-3 text-sm font-semibold text-white">
                                    Continue To Booking Details
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <TestDriveBookingModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                car={selectedCar}
                initialBookingType={mode}
                initialShowroomId={mode === 'showroom' ? (selectedShowroom?._id || '') : ''}
                initialLocationHint={profile.address?.pincode || profile.address?.city || ''}
                profileDefaults={{
                    address: [profile.address?.street, profile.address?.area, profile.address?.city, profile.address?.state].filter(Boolean).join(', '),
                    pincode: profile.address?.pincode || '',
                    fullName: profile.name || '',
                    phone: profile.phone || '',
                }}
            />
        </div>
    )
}

export default BookTestDrive
