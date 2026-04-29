import React, { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import axiosInstance from '../../utils/axiosInstance'
import { getName, getUserId } from '../../utils/auth'
import { fetchSubscriptionStatus, isUnlimitedLimit } from '../../utils/subscription'
import { generateSlotTimes } from '../../utils/timeUtils'

const bookingOptions = [
    {
        value: 'home',
        title: 'Home Test Drive',
        icon: 'H',
        eyebrow: 'White-glove',
        description: 'A partner showroom brings the drive to your address and confirms the visit after review.',
    },
    {
        value: 'showroom',
        title: 'Showroom Visit',
        icon: 'S',
        eyebrow: 'In-person',
        description: 'Pick the best nearby showroom for this brand and lock a clean one-hour slot.',
    },
]

const activeBookingStatuses = ['pending', 'confirmed']
const activeBookingStatusParam = activeBookingStatuses.join(',')

const normalizeTakenSlots = (items = []) => items
    .map((item) => {
        if (typeof item === 'string') return item
        return item?.slot || item?.time || item?.scheduledTime || ''
    })
    .filter(Boolean)

const isValidIndianPincode = (value = '') => /^\d{6}$/.test(String(value).trim())
const isValidPhoneNumber = (value = '') => /^\d{10}$/.test(String(value).replace(/\D/g, ''))

const initialForm = {
    bookingType: 'showroom',
    locationHint: '',
    showroomId: '',
    address: '',
    pincode: '',
    scheduledDate: '',
    scheduledTime: '',
    fullName: getName(),
    phone: '',
    licenseNumber: '',
    licenseExpiry: '',
}

const buildShowroomSearchPath = ({ car, locationHint, bookingType, pincode }) => {
    const params = new URLSearchParams({
        brand: car?.brand || '',
        carId: car?._id || '',
        limit: '20',
    })

    const trimmedHint = String(locationHint || '').trim()
    const trimmedPincode = String(pincode || '').trim()
    const normalizedPincode = /^\d{4,6}$/.test(trimmedHint) ? trimmedHint : trimmedPincode

    if (normalizedPincode) {
        params.set('pincode', normalizedPincode)
    } else if (trimmedHint) {
        params.set('city', trimmedHint)
    }

    if (bookingType === 'home' && normalizedPincode) {
        return `/user/showrooms/nearby?${params.toString()}`
    }

    return `/user/showrooms?${params.toString()}`
}

const modalVariants = {
    hidden: { opacity: 0, y: 48, scale: 0.96 },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { type: 'spring', stiffness: 220, damping: 26 },
    },
    exit: {
        opacity: 0,
        y: 56,
        scale: 0.98,
        transition: { duration: 0.18 },
    },
}

const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.22 } },
    exit: { opacity: 0, transition: { duration: 0.18 } },
}

const TestDriveBookingModal = ({
    open,
    onClose,
    car,
    initialBookingType = 'showroom',
    initialShowroomId = '',
    initialLocationHint = '',
    profileDefaults = null,
}) => {
    const MotionDiv = motion.div
    const navigate = useNavigate()
    const [form, setForm] = useState(initialForm)
    const [showrooms, setShowrooms] = useState([])
    const [slots, setSlots] = useState([])
    const [loadingShowrooms, setLoadingShowrooms] = useState(false)
    const [loadingSlots, setLoadingSlots] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [takenSlots, setTakenSlots] = useState([])
    const [activeBooking, setActiveBooking] = useState(null)
    const [activeBookingsCount, setActiveBookingsCount] = useState(0)
    const [checkingActiveBooking, setCheckingActiveBooking] = useState(false)
    const [subLimit, setSubLimit] = useState(1)
    const deferredLocationHint = useDeferredValue(form.locationHint)

    useEffect(() => {
        if (!open) return undefined

        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'

        return () => {
            document.body.style.overflow = previousOverflow
        }
    }, [open])

    useEffect(() => {
        if (!open) {
            setActiveBooking(null)
            setCheckingActiveBooking(false)
            setActiveBookingsCount(0)
            return
        }

        let ignore = false

        const loadActiveState = async () => {
            setCheckingActiveBooking(true)

            try {
                const [status, bookingsRes] = await Promise.all([
                    fetchSubscriptionStatus(),
                    axiosInstance.get(`/user/bookings?status=${activeBookingStatusParam}&limit=50`),
                ])

                if (ignore) return

                const bookings = (bookingsRes.data.data || []).filter((booking) => (
                    activeBookingStatuses.includes(String(booking?.status || '').toLowerCase())
                ))
                const limit = isUnlimitedLimit(status?.limits?.activeBookingsLimit) ? Infinity : (status?.limits?.activeBookingsLimit || 1)

                setActiveBookingsCount(bookings.length)
                setSubLimit(limit)
                setActiveBooking(bookings[0] || null)
            } catch {
                if (!ignore) {
                    setActiveBooking(null)
                    setActiveBookingsCount(0)
                    setSubLimit(1)
                }
            } finally {
                if (!ignore) {
                    setCheckingActiveBooking(false)
                }
            }
        }

        loadActiveState()

        return () => {
            ignore = true
        }
    }, [open])

    useEffect(() => {
        if (!open) {
            setForm({
                ...initialForm,
                bookingType: initialBookingType,
                showroomId: initialShowroomId,
                locationHint: initialLocationHint,
                address: profileDefaults?.address || '',
                pincode: profileDefaults?.pincode || '',
                fullName: profileDefaults?.fullName || initialForm.fullName,
                phone: profileDefaults?.phone || '',
            })
            setShowrooms([])
            setSlots([])
        }
    }, [initialBookingType, initialLocationHint, initialShowroomId, open, profileDefaults])

    useEffect(() => {
        if (!open) return
        setForm((prev) => ({
            ...prev,
            bookingType: initialBookingType,
            showroomId: initialShowroomId,
            locationHint: initialLocationHint,
            address: profileDefaults?.address || prev.address,
            pincode: profileDefaults?.pincode || prev.pincode,
            fullName: profileDefaults?.fullName || prev.fullName,
            phone: profileDefaults?.phone || prev.phone,
        }))
    }, [initialBookingType, initialLocationHint, initialShowroomId, open, profileDefaults])

    useEffect(() => {
        if (!open || !car?._id || activeBookingsCount >= subLimit) return

        let ignore = false

        const loadShowrooms = async () => {
            setLoadingShowrooms(true)
            try {
                const path = buildShowroomSearchPath({
                    car,
                    locationHint: deferredLocationHint,
                    bookingType: form.bookingType,
                    pincode: form.pincode,
                })
                const res = await axiosInstance.get(path)
                if (ignore) return

                const items = res.data.data || []
                setShowrooms(items)

                const nextShowroomId = items[0]?._id || ''

                if (form.bookingType === 'showroom') {
                    if (!items.some((item) => item._id === form.showroomId)) {
                        setForm((prev) => (
                            prev.showroomId === nextShowroomId
                                ? prev
                                : { ...prev, showroomId: nextShowroomId }
                        ))
                    }
                } else {
                    setForm((prev) => (
                        prev.showroomId === nextShowroomId
                            ? prev
                            : { ...prev, showroomId: nextShowroomId }
                    ))
                }
            } catch {
                if (!ignore) {
                    toast.error('Unable to load matching showrooms right now.')
                }
            } finally {
                if (!ignore) {
                    setLoadingShowrooms(false)
                }
            }
        }

        loadShowrooms()

        return () => {
            ignore = true
        }
    }, [activeBookingsCount, subLimit, car, deferredLocationHint, form.bookingType, form.pincode, open])

    useEffect(() => {
        if (!open || !car?._id || !form.scheduledDate || activeBookingsCount >= subLimit) {
            setSlots([])
            setTakenSlots([])
            return
        }

        let ignore = false

        const loadSlots = async () => {
            setLoadingSlots(true)
            try {
                const [availabilityRes, takenRes] = await Promise.all([
                    form.showroomId
                        ? axiosInstance.get(`/user/showrooms/${form.showroomId}/availability?date=${form.scheduledDate}`)
                        : Promise.resolve({ data: { data: [] } }),
                    axiosInstance.get(`/user/bookings/taken-slots?carId=${car._id}&date=${form.scheduledDate}`),
                ])

                if (!ignore) {
                    setSlots(availabilityRes.data.data || [])
                    setTakenSlots(normalizeTakenSlots(takenRes.data.data || []))
                }
            } catch {
                if (!ignore) {
                    toast.error('Unable to load showroom slots right now.')
                    setSlots([])
                    setTakenSlots([])
                }
            } finally {
                if (!ignore) {
                    setLoadingSlots(false)
                }
            }
        }

        loadSlots()

        return () => {
            ignore = true
        }
    }, [activeBookingsCount, subLimit, car?._id, form.scheduledDate, form.showroomId, open])

    const selectedShowroom = useMemo(
        () => showrooms.find((item) => item._id === form.showroomId) || null,
        [form.showroomId, showrooms],
    )

    const availableTimeOptions = form.bookingType === 'showroom'
        ? slots.map((slot) => slot.time)
        : generateSlotTimes(selectedShowroom?.openingHours?.open, selectedShowroom?.openingHours?.close)

    useEffect(() => {
        if (!form.scheduledTime) return

        const slotStillAvailable = availableTimeOptions.includes(form.scheduledTime) && !takenSlots.includes(form.scheduledTime)
        if (!slotStillAvailable) {
            setForm((prev) => ({ ...prev, scheduledTime: '' }))
        }
    }, [availableTimeOptions, form.scheduledTime, takenSlots])

    const handleClose = () => {
        if (submitting) return
        onClose()
    }

    const updateField = (key, value) => {
        setForm((prev) => ({ ...prev, [key]: value }))
    }

    const validate = () => {
        if (activeBookingsCount >= subLimit) {
            toast.warning(`Limit reached: You can only have ${subLimit} active test drive booking${subLimit === 1 ? '' : 's'} at a time.`)
            return false
        }

        if (form.bookingType === 'showroom' && !form.showroomId) {
            toast.info('Pick a showroom to continue.')
            return false
        }

        if (form.bookingType === 'home') {
            if (!form.address.trim() || !form.pincode.trim()) {
                toast.info('Add the full address and pincode for the home visit.')
                return false
            }
            if (!isValidIndianPincode(form.pincode)) {
                toast.info('Enter a valid 6-digit pincode for the home visit.')
                return false
            }
            if (!form.showroomId) {
                toast.error('No approved showroom currently covers that location for this car.')
                return false
            }
        }

        if (!form.scheduledDate || !form.scheduledTime) {
            toast.info('Choose your preferred date and time.')
            return false
        }

        if (!form.fullName.trim() || !form.phone.trim() || !form.licenseNumber.trim() || !form.licenseExpiry) {
            toast.info('Complete the contact and driving license details.')
            return false
        }

        if (!isValidPhoneNumber(form.phone)) {
            toast.info('Enter a valid 10-digit phone number.')
            return false
        }

        if (new Date(form.licenseExpiry) <= new Date()) {
            toast.info('Enter a driving license expiry date in the future.')
            return false
        }

        return true
    }

    const handleSubmit = async (event) => {
        event.preventDefault()
        if (!validate()) return

        setSubmitting(true)
        try {
            const res = await axiosInstance.post('/user/test-drives', {
                carId: car._id,
                userId: getUserId(),
                showroomId: form.showroomId,
                type: form.bookingType,
                preferredDate: form.scheduledDate,
                preferredTime: form.scheduledTime,
                details: {
                    address: form.address,
                    pincode: form.pincode || form.locationHint,
                    fullName: form.fullName,
                    phone: form.phone,
                    licenseNumber: form.licenseNumber,
                    licenseExpiry: form.licenseExpiry,
                    slot: form.scheduledTime,
                },
            })

            toast.success('Test drive request sent for approval.')
            onClose()
            navigate(`/user/bookings/${res.data.data?._id}`)
        } catch (error) {
            toast.error(error.response?.data?.message || 'Unable to submit your booking request.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <AnimatePresence>
            {open && (
                <MotionDiv
                    className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/70 px-4 py-6 sm:items-center"
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={overlayVariants}
                    onClick={handleClose}
                >
                    <MotionDiv
                        className="relative max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-[32px]"
                        style={{
                            background: 'linear-gradient(180deg, rgba(12,18,32,0.96), rgba(12,18,32,0.86))',
                            border: '1px solid rgba(255,255,255,0.14)',
                            boxShadow: '0 24px 120px rgba(15,23,42,0.45)',
                            backdropFilter: 'blur(28px)',
                        }}
                        variants={modalVariants}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div
                            className="absolute inset-0 pointer-events-none"
                            style={{
                                background: 'radial-gradient(circle at top left, rgba(56,189,248,0.18), transparent 28%), radial-gradient(circle at top right, rgba(244,114,182,0.14), transparent 24%), linear-gradient(135deg, rgba(255,255,255,0.04), transparent)',
                            }}
                        />

                        <div className="relative grid max-h-[92vh] overflow-y-auto lg:grid-cols-[1.05fr_0.95fr]">
                            <div className="border-b border-white/10 p-6 lg:border-b-0 lg:border-r">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: '#93c5fd' }}>Book test drive</p>
                                        <h2 className="mt-2 text-3xl font-black text-white">{car?.name}</h2>
                                        <div className="mt-2 flex items-center gap-2">
                                            <span className="rounded-full bg-blue-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-300" style={{ border: '1px solid rgba(59,130,246,0.2)' }}>
                                                Usage: {activeBookingsCount} / {subLimit === Infinity ? 'Unlimited' : subLimit} slots
                                            </span>
                                            <p className="text-xs text-white/45" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                                {activeBookingsCount >= subLimit ? 'Limit reached' : activeBooking ? 'Existing booking found' : 'Available slots'}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleClose}
                                        className="rounded-full px-3 py-2 text-sm font-semibold text-white/75"
                                        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
                                    >
                                        Close
                                    </button>
                                </div>

                                <div className="mt-6 grid gap-4 md:grid-cols-2">
                                    {bookingOptions.map((option) => {
                                        const active = form.bookingType === option.value
                                        return (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => updateField('bookingType', option.value)}
                                                className="rounded-[28px] p-5 text-left transition-transform duration-200 hover:-translate-y-1"
                                                style={{
                                                    background: active ? 'linear-gradient(135deg, rgba(59,130,246,0.22), rgba(236,72,153,0.16))' : 'rgba(255,255,255,0.05)',
                                                    border: `1px solid ${active ? 'rgba(125,211,252,0.38)' : 'rgba(255,255,255,0.08)'}`,
                                                }}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="rounded-2xl px-3 py-2 text-lg font-black text-white" style={{ background: active ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.08)' }}>
                                                        {option.icon}
                                                    </span>
                                                    <span className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: active ? '#bfdbfe' : 'rgba(255,255,255,0.45)' }}>
                                                        {option.eyebrow}
                                                    </span>
                                                </div>
                                                <h3 className="mt-6 text-2xl font-bold text-white">{option.title}</h3>
                                                <p className="mt-3 text-sm leading-6 text-white/60" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                                    {option.description}
                                                </p>
                                            </button>
                                        )
                                    })}
                                </div>

                                <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
                                    {(checkingActiveBooking || activeBookingsCount >= subLimit) && (
                                        <div
                                            className="rounded-[24px] px-4 py-4 text-sm"
                                            style={{
                                                background: activeBookingsCount >= subLimit ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255,255,255,0.05)',
                                                border: `1px solid ${activeBookingsCount >= subLimit ? 'rgba(239, 68, 68, 0.24)' : 'rgba(255,255,255,0.08)'}`,
                                                color: activeBookingsCount >= subLimit ? '#fca5a5' : 'rgba(255,255,255,0.7)',
                                                fontFamily: "'DM Sans', sans-serif",
                                            }}
                                        >
                                            {checkingActiveBooking
                                                ? 'Checking your booking status...'
                                                : `Limit reached: You have ${activeBookingsCount} active booking${activeBookingsCount === 1 ? '' : 's'}. Please complete or cancel one before booking another.`}
                                        </div>
                                    )}

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-white/45">City or Pincode</label>
                                            <input
                                                value={form.locationHint}
                                                onChange={(event) => updateField('locationHint', event.target.value)}
                                                placeholder="Enter city or pincode"
                                                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Preferred Date</label>
                                            <input
                                                type="date"
                                                value={form.scheduledDate}
                                                min={new Date().toISOString().slice(0, 10)}
                                                onChange={(event) => updateField('scheduledDate', event.target.value)}
                                                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none"
                                            />
                                        </div>
                                    </div>

                                    {form.bookingType === 'home' ? (
                                        <div className="grid gap-4">
                                            <textarea
                                                value={form.address}
                                                onChange={(event) => updateField('address', event.target.value)}
                                                rows="4"
                                                placeholder="Full pickup address for the home test drive"
                                                className="w-full rounded-[24px] border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none"
                                            />
                                            <input
                                                value={form.pincode}
                                                onChange={(event) => updateField('pincode', event.target.value)}
                                                placeholder="6-digit service pincode"
                                                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none"
                                            />
                                        </div>
                                    ) : (
                                        <div>
                                            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Select showroom</label>
                                            <select
                                                value={form.showroomId}
                                                onChange={(event) => updateField('showroomId', event.target.value)}
                                                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none"
                                            >
                                                <option value="">Choose an approved showroom</option>
                                                {showrooms.map((showroom) => (
                                                    <option key={showroom._id} value={showroom._id}>
                                                        {showroom.name} - {showroom.address?.city || 'Location unavailable'}
                                                    </option>
                                                ))}
                                            </select>
                                            {!loadingShowrooms && showrooms.length === 0 && (
                                                <p className="mt-2 text-xs text-amber-100/80" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                                    No approved showroom matches this car and location yet. Update the location or try the home test drive option.
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    <div>
                                        <label className="mb-3 block text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                                            {form.bookingType === 'showroom' ? 'Choose a time slot' : 'Preferred time'}
                                        </label>
                                        {loadingSlots ? (
                                            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-white/55">
                                                Loading the latest available slots...
                                            </div>
                                        ) : availableTimeOptions.length === 0 ? (
                                            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-white/55">
                                                No slots available yet for the selected date. Try another day.
                                            </div>
                                        ) : (
                                            <div className="flex flex-wrap gap-3">
                                                {availableTimeOptions.map((slot) => {
                                                    const active = form.scheduledTime === slot
                                                    const isTaken = takenSlots.includes(slot)
                                                    return (
                                                        <button
                                                            key={slot}
                                                            type="button"
                                                            disabled={isTaken}
                                                            onClick={() => updateField('scheduledTime', slot)}
                                                            className="rounded-full px-4 py-2 text-sm font-semibold transition-all"
                                                            style={{
                                                                background: isTaken ? 'rgba(255,255,255,0.02)' : (active ? 'rgba(56,189,248,0.18)' : 'rgba(255,255,255,0.05)'),
                                                                color: isTaken ? 'rgba(255,255,255,0.2)' : (active ? '#e0f2fe' : 'white'),
                                                                border: `1px solid ${isTaken ? 'rgba(255,255,255,0.05)' : (active ? 'rgba(125,211,252,0.4)' : 'rgba(255,255,255,0.08)')}`,
                                                                cursor: isTaken ? 'not-allowed' : 'pointer',
                                                                textDecoration: isTaken ? 'line-through' : 'none',
                                                            }}
                                                        >
                                                            {slot}
                                                            {isTaken && <span className="ml-2 text-[10px] opacity-60">(Booked)</span>}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <input
                                            value={form.fullName}
                                            onChange={(event) => updateField('fullName', event.target.value)}
                                            placeholder="Full name"
                                            className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none"
                                        />
                                        <input
                                            value={form.phone}
                                            onChange={(event) => updateField('phone', event.target.value)}
                                            placeholder="Phone number"
                                            className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none"
                                        />
                                        <input
                                            value={form.licenseNumber}
                                            onChange={(event) => updateField('licenseNumber', event.target.value)}
                                            placeholder="Driving license number"
                                            className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none"
                                        />
                                        <input
                                            type="date"
                                            value={form.licenseExpiry}
                                            onChange={(event) => updateField('licenseExpiry', event.target.value)}
                                            className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none"
                                        />
                                    </div>

                                    <div className="flex flex-wrap gap-3 pt-2">
                                        {activeBookingsCount < subLimit && (
                                            <button
                                                type="submit"
                                                disabled={submitting || checkingActiveBooking}
                                                className="rounded-2xl px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
                                                style={{ background: 'linear-gradient(135deg, #38bdf8, #2563eb)' }}
                                            >
                                                {checkingActiveBooking ? 'Checking booking limit...' : submitting ? 'Sending request...' : 'Reserve test drive'}
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={handleClose}
                                            className="rounded-2xl px-6 py-3 text-sm font-semibold text-white"
                                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </div>

                            <div className="p-6">
                                <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                                    <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: '#f9a8d4' }}>Booking Preview</p>
                                    <h3 className="mt-2 text-2xl font-bold text-white">
                                        {form.bookingType === 'home' ? 'Your concierge drive' : 'Your showroom visit'}
                                    </h3>
                                    <div className="mt-5 space-y-4 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                        <div>
                                            <p className="text-white/45">Car</p>
                                            <p className="mt-1 text-white">{car?.brand} {car?.name}</p>
                                        </div>
                                        <div>
                                            <p className="text-white/45">Experience</p>
                                            <p className="mt-1 text-white">{form.bookingType === 'home' ? 'Home test drive' : 'Showroom visit'}</p>
                                        </div>
                                        <div>
                                            <p className="text-white/45">Matched showroom</p>
                                            <p className="mt-1 text-white">
                                                {loadingShowrooms ? 'Finding approved partners...' : (selectedShowroom?.name || showrooms[0]?.name || 'No approved showroom found yet')}
                                            </p>
                                            <p className="mt-1 text-xs text-white/45">
                                                {(selectedShowroom || showrooms[0])?.address?.city || 'Location will appear here'}{(selectedShowroom || showrooms[0])?.address?.pincode ? `, ${(selectedShowroom || showrooms[0])?.address?.pincode}` : ''}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-white/45">When</p>
                                            <p className="mt-1 text-white">
                                                {form.scheduledDate ? `${new Date(form.scheduledDate).toLocaleDateString('en-IN')} at ${form.scheduledTime || 'Choose a slot'}` : 'Select date and time'}
                                            </p>
                                        </div>
                                        {form.bookingType === 'home' && (
                                            <div>
                                                <p className="text-white/45">Home address</p>
                                                <p className="mt-1 text-white">{form.address || 'Add the visit address'}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-5 rounded-[28px] border border-sky-300/15 bg-sky-400/10 p-5">
                                    <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: '#bae6fd' }}>What happens next</p>
                                    <div className="mt-4 space-y-3 text-sm leading-6 text-white/70" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                        <p>1. We send the request to the right showroom for manual approval.</p>
                                        <p>2. The booking appears in your notifications and test drive dashboard instantly.</p>
                                        <p>3. Once approved, you'll get an in-app update and a confirmation email.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </MotionDiv>
                </MotionDiv>
            )}
        </AnimatePresence>
    )
}

export default TestDriveBookingModal
