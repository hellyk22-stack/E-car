import React, { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import axiosInstance from '../../utils/axiosInstance'
import { getCarImage } from '../../utils/carImageUtils'
import { formatCurrency } from '../../utils/bookingUtils'

const emptyForm = {
    name: '',
    brand: '',
    type: '',
    price: '',
    mileage: '',
    engine: '',
    seating: '',
    fuel: '',
    transmission: '',
    rating: '',
    priceChangeDate: '',
}

const ShowroomCarsRevamp = () => {
    const [inventory, setInventory] = useState([])
    const [allowedBrands, setAllowedBrands] = useState([])
    const [showForm, setShowForm] = useState(false)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState(emptyForm)
    const [imageFile, setImageFile] = useState(null)
    const [imagePreview, setImagePreview] = useState('')
    const fileInputRef = useRef(null)

    const loadData = async () => {
        setLoading(true)
        try {
            const res = await axiosInstance.get('/showroom/cars')
            setInventory(res.data.data || [])
            setAllowedBrands(res.data.meta?.allowedBrands || [])
        } catch (error) {
            toast.error('Unable to load showroom inventory')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    const fuelTones = useMemo(() => ({
        Petrol: { bg: 'rgba(245,158,11,0.15)', color: '#fcd34d' },
        Diesel: { bg: 'rgba(59,130,246,0.15)', color: '#93c5fd' },
        Electric: { bg: 'rgba(16,185,129,0.15)', color: '#86efac' },
    }), [])

    const handleChange = (event) => {
        const { name, value } = event.target
        setForm((prev) => ({ ...prev, [name]: value }))
    }

    const handleImageChange = (event) => {
        const file = event.target.files?.[0]
        if (!file) return
        if (!file.type.startsWith('image/')) {
            toast.error('Please choose an image file')
            return
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image must stay under 5MB')
            return
        }

        setImageFile(file)
        setImagePreview(URL.createObjectURL(file))
    }

    const resetForm = () => {
        setForm(emptyForm)
        setImageFile(null)
        setImagePreview('')
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const submitCar = async (event) => {
        event.preventDefault()
        if (!allowedBrands.length) {
            toast.info('Add registered brands in the showroom profile first.')
            return
        }
        if (!form.name.trim() || !form.brand.trim() || !form.price) {
            toast.info('Name, brand, and price are required.')
            return
        }

        setSaving(true)
        try {
            const formData = new FormData()
            Object.entries(form).forEach(([key, value]) => {
                if (value !== '') formData.append(key, value)
            })
            if (imageFile) formData.append('image', imageFile)

            await axiosInstance.post('/showroom/cars', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            })

            toast.success('Car added to showroom inventory')
            resetForm()
            setShowForm(false)
            await loadData()
        } catch (error) {
            toast.error(error.response?.data?.message || 'Unable to add car')
        } finally {
            setSaving(false)
        }
    }

    const removeCar = async (carId) => {
        try {
            await axiosInstance.delete(`/showroom/cars/${carId}`)
            toast.success('Car removed from inventory')
            await loadData()
        } catch (error) {
            toast.error(error.response?.data?.message || 'Unable to remove car')
        }
    }

    return (
        <div>
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: '#93c5fd' }}>Inventory</p>
                    <h1 className="mt-2 text-3xl font-bold text-white">Showroom cars</h1>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        Add cars with the same key details the admin uses. Brand selection is limited to the brands registered for this showroom.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        if (!allowedBrands.length) {
                            toast.info('Add registered brands in the showroom profile first.')
                            return
                        }
                        setShowForm((prev) => !prev)
                    }}
                    className="rounded-2xl px-5 py-3 text-sm font-semibold text-white"
                    style={{ background: showForm ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #2563eb, #1d4ed8)', border: showForm ? '1px solid rgba(255,255,255,0.1)' : 'none' }}
                >
                    {showForm ? 'Close form' : 'Add car'}
                </button>
            </div>

            <div className="mb-6 rounded-[28px] p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: '#bfdbfe' }}>Registered Brands</p>
                <div className="mt-4 flex flex-wrap gap-2">
                    {allowedBrands.length ? allowedBrands.map((brand) => (
                        <span key={brand} className="rounded-full border border-blue-300/20 bg-blue-400/10 px-3 py-1 text-xs font-semibold text-blue-100">
                            {brand}
                        </span>
                    )) : (
                        <span className="text-sm text-white/55" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                            No brands registered yet.
                        </span>
                    )}
                </div>
            </div>

            {showForm && (
                <div className="mb-8 rounded-[28px] p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(96,165,250,0.2)' }}>
                    <h2 className="text-2xl font-bold text-white">Add a branded inventory car</h2>
                    <form className="mt-6" onSubmit={submitCar}>
                        <div className="mb-6">
                            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Car image</label>
                            {imagePreview ? (
                                <div className="relative inline-block">
                                    <img src={imagePreview} alt="Preview" className="h-40 w-64 rounded-2xl object-cover" style={{ border: '1px solid rgba(255,255,255,0.1)' }} />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setImageFile(null)
                                            setImagePreview('')
                                            if (fileInputRef.current) fileInputRef.current.value = ''
                                        }}
                                        className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white"
                                        style={{ background: '#ef4444' }}
                                    >
                                        ×
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex h-36 w-full flex-col items-center justify-center rounded-[24px] border border-dashed border-blue-300/25 bg-blue-400/5 text-white/70"
                                >
                                    <span className="text-3xl">+</span>
                                    <span className="mt-2 text-sm font-semibold">Upload showroom car image</span>
                                    <span className="mt-1 text-xs text-white/45">JPG, PNG, WEBP up to 5MB</span>
                                </button>
                            )}
                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                            {[
                                ['name', 'Car name', 'text'],
                                ['price', 'Price (Rs)', 'number'],
                                ['mileage', 'Mileage (kmpl)', 'number'],
                                ['engine', 'Engine (cc)', 'number'],
                                ['seating', 'Seating', 'number'],
                                ['rating', 'Rating (0-5)', 'number'],
                                ['priceChangeDate', 'Price change date', 'date'],
                            ].map(([key, label, type]) => (
                                <div key={key}>
                                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-white/45">{label}</label>
                                    <input
                                        name={key}
                                        type={type}
                                        value={form[key]}
                                        onChange={handleChange}
                                        className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none"
                                    />
                                </div>
                            ))}

                            <div>
                                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Brand</label>
                                <select
                                    name="brand"
                                    value={form.brand}
                                    onChange={handleChange}
                                    className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none"
                                >
                                    <option value="">Select showroom brand</option>
                                    {allowedBrands.map((brand) => (
                                        <option key={brand} value={brand}>{brand}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Type</label>
                                <select name="type" value={form.type} onChange={handleChange} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none">
                                    <option value="">Select type</option>
                                    {['Hatchback', 'Sedan', 'SUV', 'Luxury'].map((item) => <option key={item} value={item}>{item}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Fuel</label>
                                <select name="fuel" value={form.fuel} onChange={handleChange} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none">
                                    <option value="">Select fuel</option>
                                    {['Petrol', 'Diesel', 'Electric'].map((item) => <option key={item} value={item}>{item}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Transmission</label>
                                <select name="transmission" value={form.transmission} onChange={handleChange} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none">
                                    <option value="">Select transmission</option>
                                    {['Manual', 'Automatic'].map((item) => <option key={item} value={item}>{item}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="mt-6 flex gap-3">
                            <button type="submit" disabled={saving} className="rounded-2xl px-6 py-3 text-sm font-semibold text-white disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>
                                {saving ? 'Saving...' : 'Add car'}
                            </button>
                            <button type="button" onClick={() => { resetForm(); setShowForm(false) }} className="rounded-2xl px-6 py-3 text-sm font-semibold text-white" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {loading ? (
                <div className="py-16 text-center">
                    <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                </div>
            ) : (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {inventory.map((item) => {
                        const car = item.carId
                        const fuelTone = fuelTones[car?.fuel] || { bg: 'rgba(255,255,255,0.08)', color: '#e2e8f0' }
                        return (
                            <div key={car?._id || item.carId} className="overflow-hidden rounded-[28px]" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <img src={getCarImage(car)} alt={car?.name} className="h-52 w-full object-cover" />
                                <div className="p-5">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <h3 className="text-xl font-bold text-white">{car?.name}</h3>
                                            <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.55)', fontFamily: "'DM Sans', sans-serif" }}>{car?.brand} • {car?.type || 'Type pending'}</p>
                                        </div>
                                        <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: 'rgba(37,99,235,0.12)', color: '#bfdbfe', border: '1px solid rgba(96,165,250,0.22)' }}>
                                            {formatCurrency(item.customPrice || car?.price)}
                                        </span>
                                    </div>

                                    <div className="mt-4 flex flex-wrap gap-2">
                                        <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: fuelTone.bg, color: fuelTone.color }}>
                                            {car?.fuel || 'Fuel pending'}
                                        </span>
                                        <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-semibold text-white/70">
                                            {car?.transmission || 'Transmission pending'}
                                        </span>
                                        <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-semibold text-white/70">
                                            {car?.mileage ? `${car.mileage} kmpl` : 'Mileage pending'}
                                        </span>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => removeCar(car?._id || item.carId)}
                                        className="mt-5 rounded-xl px-4 py-2 text-sm font-semibold"
                                        style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.22)' }}
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                    {inventory.length === 0 && (
                        <div className="col-span-full rounded-[28px] border border-dashed border-white/10 px-6 py-20 text-center">
                            <p className="text-white text-lg font-semibold">No cars in inventory yet</p>
                            <p className="mt-3 text-sm text-white/55" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                Add a car from one of your registered brands to get started.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default ShowroomCarsRevamp
