import React, { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import axiosInstance from '../../utils/axiosInstance'
import { getCarImage } from '../../utils/carImageUtils'
import { formatCurrency } from '../../utils/bookingUtils'

const ShowroomCars = () => {
    const [inventory, setInventory] = useState([])
    const [allCars, setAllCars] = useState([])
    const [showModal, setShowModal] = useState(false)
    const [selectedCarId, setSelectedCarId] = useState('')
    const [customPrice, setCustomPrice] = useState('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    const loadData = async () => {
        setLoading(true)
        try {
            const [inventoryRes, carsRes] = await Promise.all([
                axiosInstance.get('/showroom/cars'),
                axiosInstance.get('/car/cars'),
            ])
            setInventory(inventoryRes.data.data || [])
            setAllCars(carsRes.data.data || [])
        } catch (error) {
            toast.error('Unable to load showroom inventory')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    const availableCars = allCars.filter((car) => !inventory.some((item) => item.carId?._id === car._id || item.carId === car._id))

    const addCar = async () => {
        if (!selectedCarId) {
            toast.info('Choose a car to add')
            return
        }

        setSaving(true)
        try {
            await axiosInstance.post('/showroom/cars', {
                carId: selectedCarId,
                customPrice: customPrice || undefined,
            })
            toast.success('Car added to showroom inventory')
            setShowModal(false)
            setSelectedCarId('')
            setCustomPrice('')
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
                </div>
                <button
                    type="button"
                    onClick={() => setShowModal(true)}
                    className="rounded-2xl px-5 py-3 text-sm font-semibold text-white"
                    style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
                >
                    Add car
                </button>
            </div>

            {loading ? (
                <div className="py-16 text-center">
                    <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                </div>
            ) : (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {inventory.map((item) => {
                        const car = item.carId
                        return (
                            <div key={car?._id || item.carId} className="overflow-hidden rounded-[28px]" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <img src={getCarImage(car)} alt={car?.name} className="h-52 w-full object-cover" />
                                <div className="p-5">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <h3 className="text-xl font-bold text-white">{car?.name}</h3>
                                            <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.55)', fontFamily: "'DM Sans', sans-serif" }}>{car?.brand} • {car?.fuel}</p>
                                        </div>
                                        <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: 'rgba(37,99,235,0.12)', color: '#bfdbfe', border: '1px solid rgba(96,165,250,0.22)' }}>
                                            {formatCurrency(item.customPrice || car?.price)}
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
                        </div>
                    )}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(2,6,23,0.75)', backdropFilter: 'blur(10px)' }}>
                    <div className="w-full max-w-lg rounded-[28px] p-6" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <h3 className="text-2xl font-bold text-white">Add car to inventory</h3>
                        <div className="mt-5 space-y-4">
                            <select
                                value={selectedCarId}
                                onChange={(event) => setSelectedCarId(event.target.value)}
                                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
                            >
                                <option value="">Select a car</option>
                                {availableCars.map((car) => (
                                    <option key={car._id} value={car._id}>{car.name} • {car.brand}</option>
                                ))}
                            </select>
                            <input
                                type="number"
                                value={customPrice}
                                onChange={(event) => setCustomPrice(event.target.value)}
                                placeholder="Optional custom price"
                                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
                            />
                        </div>
                        <div className="mt-6 flex gap-3">
                            <button type="button" onClick={addCar} disabled={saving} className="rounded-2xl px-5 py-3 text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>
                                {saving ? 'Saving...' : 'Add car'}
                            </button>
                            <button type="button" onClick={() => setShowModal(false)} className="rounded-2xl px-5 py-3 text-sm font-semibold text-white" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ShowroomCars
