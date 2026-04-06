import React, { useState, useEffect, useRef } from 'react'
import axiosInstance from '../../utils/axiosInstance'
import { getCarImage } from '../../utils/carImageUtils'
import { toast } from 'react-toastify'

// UPDATED: handleSubmit now uses FormData + multipart for image upload to Cloudinary
// Image preview shown before upload; existing car.image shown when editing

const EMPTY_FORM = {
    name: '', brand: '', type: '', price: '',
    mileage: '', engine: '', seating: '',
    fuel: '', transmission: '', rating: '', priceChangeDate: ''
}

const ManageCars = () => {
    const [cars, setCars] = useState([])
    const [loading, setLoading] = useState(false)
    const [showForm, setShowForm] = useState(false)
    const [editCar, setEditCar] = useState(null)
    const [deleteConfirm, setDeleteConfirm] = useState(null)
    const [form, setForm] = useState(EMPTY_FORM)
    const [imageFile, setImageFile] = useState(null)       // File object for upload
    const [imagePreview, setImagePreview] = useState(null) // Local preview URL
    const [submitting, setSubmitting] = useState(false)
    const fileInputRef = useRef(null)

    useEffect(() => { fetchCars() }, [])

    const fetchCars = async () => {
        setLoading(true)
        try {
            const res = await axiosInstance.get('/car/cars')
            setCars(res.data.data)
        } catch { toast.error('Error fetching cars') }
        setLoading(false)
    }

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

    // Handle image file selection â€” show preview immediately
    const handleImageChange = (e) => {
        const file = e.target.files[0]
        if (!file) return
        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file')
            return
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image must be under 5MB')
            return
        }
        setImageFile(file)
        setImagePreview(URL.createObjectURL(file))
    }

    const clearImage = () => {
        setImageFile(null)
        setImagePreview(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    // Submit as multipart/form-data so backend Cloudinary upload works
    const handleSubmit = async (e) => {
        e.preventDefault()
        setSubmitting(true)
        try {
            const formData = new FormData()

            // Append all text fields
            Object.entries(form).forEach(([key, value]) => {
                if (value !== '') formData.append(key, value)
            })

            // Append image file if selected
            if (imageFile) {
                formData.append('image', imageFile)
            }

            if (editCar) {
                await axiosInstance.put(`/car/car/${editCar._id}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                })
                toast.success('Car updated âœ“')
            } else {
                await axiosInstance.post('/car/car', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                })
                toast.success('Car added âœ“')
            }

            setShowForm(false)
            setEditCar(null)
            setForm(EMPTY_FORM)
            clearImage()
            fetchCars()
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error saving car')
        } finally {
            setSubmitting(false)
        }
    }

    const handleEdit = (car) => {
        const latestPriceEntry = [...(car.priceHistory || [])]
            .sort((a, b) => new Date(b.changedAt || 0) - new Date(a.changedAt || 0))[0]

        setEditCar(car)
        setForm({
            name: car.name || '', brand: car.brand || '', type: car.type || '',
            price: car.price || '', mileage: car.mileage || '', engine: car.engine || '',
            seating: car.seating || '', fuel: car.fuel || '',
            transmission: car.transmission || '', rating: car.rating || '',
            priceChangeDate: latestPriceEntry?.changedAt ? new Date(latestPriceEntry.changedAt).toISOString().slice(0, 10) : ''
        })
        // Show existing Cloudinary image if available
        setImagePreview(car.image || null)
        setImageFile(null)
        setShowForm(true)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const handleDelete = async (id) => {
        try {
            await axiosInstance.delete(`/car/car/${id}`)
            toast.success('Car deleted âœ“')
            setDeleteConfirm(null)
            fetchCars()
        } catch { toast.error('Error deleting car') }
    }

    const resetAndClose = () => {
        setShowForm(false)
        setEditCar(null)
        setForm(EMPTY_FORM)
        clearImage()
    }

    const fuelColor = { Petrol: '#f59e0b', Diesel: '#3b82f6', Electric: '#10b981' }

    const inputStyle = {
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        color: 'white',
        borderRadius: 12,
        padding: '10px 14px',
        fontSize: 13,
        width: '100%',
        outline: 'none',
        fontFamily: "'DM Sans', sans-serif",
        transition: 'all 0.2s'
    }

    return (
        <div style={{ fontFamily: "'Syne', sans-serif" }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500&display=swap');
                .mc-input:focus { border-color: rgba(99,102,241,0.6) !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }
                .mc-input option { background: #1a1a2e; color: white; }
                .car-row { transition: all 0.2s; }
                .car-row:hover { background: rgba(99,102,241,0.05) !important; }
                .del-modal { animation: fadeIn 0.2s ease; }
                .form-slide { animation: slideDown 0.3s ease; }
                @keyframes fadeIn { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
                @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
                .upload-zone { transition: all 0.2s; border: 2px dashed rgba(99,102,241,0.3); }
                .upload-zone:hover { border-color: rgba(99,102,241,0.6); background: rgba(99,102,241,0.05) !important; }
                .upload-zone.dragging { border-color: #6366f1; background: rgba(99,102,241,0.1) !important; }
            `}</style>

            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#6366f1' }}>Inventory</p>
                    <h2 className="text-white font-extrabold text-2xl" style={{ letterSpacing: '-0.03em' }}>Manage Cars</h2>
                    <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'DM Sans', sans-serif" }}>
                        {cars.length} cars in inventory
                    </p>
                </div>
                <button
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white text-sm transition-all hover:scale-105"
                    style={{
                        background: showForm ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        border: showForm ? '1px solid rgba(255,255,255,0.1)' : 'none'
                    }}
                    onClick={() => showForm ? resetAndClose() : setShowForm(true)}
                >
                    {showForm ? 'âœ• Cancel' : '+ Add Car'}
                </button>
            </div>

            {/* Form */}
            {showForm && (
                <div className="form-slide p-6 rounded-2xl mb-6"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(99,102,241,0.2)' }}>
                    <h3 className="text-white font-bold mb-6 flex items-center gap-2 text-lg">
                        {editCar ? `âœï¸ Edit â€” ${editCar.name}` : 'âž• Add New Car'}
                    </h3>

                    <form onSubmit={handleSubmit}>
                        {/* Image Upload */}
                        <div className="mb-6">
                            <label className="block text-xs font-semibold uppercase tracking-wider mb-2"
                                style={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'DM Sans', sans-serif" }}>
                                Car Image {editCar ? '(leave empty to keep existing)' : ''}
                            </label>

                            {imagePreview ? (
                                <div className="relative inline-block">
                                    <img src={imagePreview} alt="Preview"
                                        className="h-40 w-64 object-cover rounded-xl"
                                        style={{ border: '1px solid rgba(99,102,241,0.3)' }} />
                                    <button type="button" onClick={clearImage}
                                        className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                                        style={{ background: '#ef4444' }}>
                                        âœ•
                                    </button>
                                    {imageFile && (
                                        <p className="text-xs mt-1.5" style={{ color: '#34d399', fontFamily: "'DM Sans', sans-serif" }}>
                                            âœ“ {imageFile.name} ({(imageFile.size / 1024).toFixed(0)}KB)
                                        </p>
                                    )}
                                    {!imageFile && editCar?.image && (
                                        <p className="text-xs mt-1.5" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'DM Sans', sans-serif" }}>
                                            Current image from Cloudinary
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div
                                    className="upload-zone rounded-xl p-8 text-center cursor-pointer"
                                    style={{ background: 'rgba(255,255,255,0.02)' }}
                                    onClick={() => fileInputRef.current?.click()}
                                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('dragging') }}
                                    onDragLeave={(e) => e.currentTarget.classList.remove('dragging')}
                                    onDrop={(e) => {
                                        e.preventDefault()
                                        e.currentTarget.classList.remove('dragging')
                                        const file = e.dataTransfer.files[0]
                                        if (file) {
                                            const fakeEvent = { target: { files: [file] } }
                                            handleImageChange(fakeEvent)
                                        }
                                    }}
                                >
                                    <p className="text-3xl mb-2">ðŸ–¼ï¸</p>
                                    <p className="text-sm font-semibold text-white mb-1">Click or drag to upload</p>
                                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: "'DM Sans', sans-serif" }}>
                                        JPG, PNG, WEBP Â· Max 5MB Â· Uploads to Cloudinary
                                    </p>
                                </div>
                            )}

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleImageChange}
                            />
                        </div>

                        {/* Text Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                            {[
                                { name: 'name', label: 'Car Name', placeholder: 'e.g. Swift ZXI+' },
                                { name: 'brand', label: 'Brand', placeholder: 'e.g. Maruti' },
                                { name: 'price', label: 'Price (â‚¹)', type: 'number', placeholder: 'e.g. 850000' },
                                { name: 'mileage', label: 'Mileage (kmpl)', type: 'number', placeholder: 'e.g. 23' },
                                { name: 'engine', label: 'Engine (cc)', type: 'number', placeholder: 'e.g. 1197' },
                                { name: 'seating', label: 'Seating', type: 'number', placeholder: 'e.g. 5' },
                                { name: 'rating', label: 'Rating (0â€“5)', type: 'number', step: '0.1', max: '5', placeholder: 'e.g. 4.2' },
                            ].map(field => (
                                <div key={field.name}>
                                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                                        style={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'DM Sans', sans-serif" }}>
                                        {field.label}
                                    </label>
                                    <input
                                        name={field.name}
                                        type={field.type || 'text'}
                                        step={field.step}
                                        max={field.max}
                                        value={form[field.name]}
                                        onChange={handleChange}
                                        placeholder={field.placeholder}
                                        className="mc-input"
                                        style={inputStyle}
                                        required={['name', 'brand', 'price'].includes(field.name)}
                                    />
                                </div>
                            ))}

                            {[ 
                                { name: 'type', label: 'Type', options: ['Hatchback', 'Sedan', 'SUV', 'Luxury'] },
                                { name: 'fuel', label: 'Fuel', options: ['Petrol', 'Diesel', 'Electric'] },
                                { name: 'transmission', label: 'Transmission', options: ['Manual', 'Automatic'] },
                            ].map(field => (
                                <div key={field.name}>
                                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                                        style={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'DM Sans', sans-serif" }}>
                                        {field.label}
                                    </label>
                                    <select
                                        name={field.name}
                                        value={form[field.name]}
                                        onChange={handleChange}
                                        className="mc-input"
                                        style={inputStyle}
                                    >
                                        <option value="">Select {field.label}</option>
                                        {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </div>
                            ))}

                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                                    style={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'DM Sans', sans-serif" }}>
                                    Price Change Date
                                </label>
                                <input
                                    name="priceChangeDate"
                                    type="date"
                                    value={form.priceChangeDate}
                                    onChange={handleChange}
                                    className="mc-input"
                                    style={inputStyle}
                                />
                                <p className="mt-1.5 text-xs"
                                    style={{ color: 'rgba(255,255,255,0.35)', fontFamily: "'DM Sans', sans-serif" }}>
                                    Used when logging a new price for the car history chart.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button type="submit" disabled={submitting}
                                className="px-8 py-3 rounded-xl font-bold text-white text-sm transition-all hover:scale-105 disabled:opacity-50 flex items-center gap-2"
                                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                                {submitting ? (
                                    <>
                                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        {editCar ? 'Updating...' : 'Adding...'}
                                    </>
                                ) : (editCar ? 'âœ“ Update Car' : 'âœ“ Add Car')}
                            </button>
                            <button type="button" onClick={resetAndClose}
                                className="px-6 py-3 rounded-xl font-semibold text-sm"
                                style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)', fontFamily: "'DM Sans', sans-serif" }}>
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Cars Table */}
            {loading ? (
                <div className="text-center py-16">
                    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'DM Sans', sans-serif" }}>Loading cars...</p>
                </div>
            ) : cars.length === 0 ? (
                <div className="text-center py-20 rounded-2xl"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <p className="text-5xl mb-4">ðŸš—</p>
                    <p className="text-white font-bold mb-2">No cars yet</p>
                    <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'DM Sans', sans-serif" }}>Add your first car above</p>
                </div>
            ) : (
                <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                    <table className="w-full text-sm">
                        <thead>
                            <tr style={{ background: 'rgba(99,102,241,0.1)', borderBottom: '1px solid rgba(99,102,241,0.2)' }}>
                                {['Image', 'Name', 'Brand', 'Type', 'Price', 'Fuel', 'Rating', 'Actions'].map(h => (
                                    <th key={h} className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider"
                                        style={{ color: 'rgba(255,255,255,0.5)', fontFamily: "'DM Sans', sans-serif" }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {cars.map((car, i) => (
                                <tr key={car._id} className="car-row"
                                    style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
                                    {/* Thumbnail using getCarImage */}
                                    <td className="px-4 py-3">
                                        <img
                                            src={getCarImage(car)}
                                            alt={car.name}
                                            className="w-14 h-10 object-cover rounded-lg"
                                            style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                                            onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=200&q=80' }}
                                        />
                                    </td>
                                    <td className="px-4 py-3 font-semibold text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>{car.name}</td>
                                    <td className="px-4 py-3" style={{ color: 'rgba(255,255,255,0.6)', fontFamily: "'DM Sans', sans-serif" }}>{car.brand}</td>
                                    <td className="px-4 py-3">
                                        <span className="px-2.5 py-1 rounded-full text-xs font-bold"
                                            style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' }}>
                                            {car.type}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 font-bold" style={{ color: '#818cf8', fontFamily: "'DM Sans', sans-serif" }}>
                                        â‚¹{car.price?.toLocaleString('en-IN')}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold"
                                            style={{ background: `${fuelColor[car.fuel] || '#6366f1'}20`, color: fuelColor[car.fuel] || '#818cf8', fontFamily: "'DM Sans', sans-serif" }}>
                                            {car.fuel}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3" style={{ color: '#fbbf24', fontFamily: "'DM Sans', sans-serif" }}>
                                        {car.rating ? `â­ ${car.rating}` : 'â€”'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2">
                                            <button onClick={() => handleEdit(car)}
                                                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105"
                                                style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.25)' }}>
                                                Edit
                                            </button>
                                            <button onClick={() => setDeleteConfirm(car)}
                                                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105"
                                                style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}>
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Delete Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
                    style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
                    <div className="del-modal w-full max-w-sm p-6 rounded-2xl"
                        style={{ background: '#161625', border: '1px solid rgba(239,68,68,0.3)' }}>
                        <p className="text-3xl mb-4 text-center">ðŸ—‘ï¸</p>
                        <h3 className="text-white font-bold text-lg text-center mb-2">Delete Car</h3>
                        <p className="text-center text-sm mb-6"
                            style={{ color: 'rgba(255,255,255,0.5)', fontFamily: "'DM Sans', sans-serif" }}>
                            Delete <strong className="text-white">{deleteConfirm.name}</strong>? This cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteConfirm(null)}
                                className="flex-1 py-3 rounded-xl font-semibold text-sm"
                                style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)', fontFamily: "'DM Sans', sans-serif" }}>
                                Cancel
                            </button>
                            <button onClick={() => handleDelete(deleteConfirm._id)}
                                className="flex-1 py-3 rounded-xl font-bold text-white text-sm"
                                style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ManageCars
