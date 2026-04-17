import React, { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import axiosInstance from '../../utils/axiosInstance'
import { generateSlotTimes, sortSlotTimes } from '../../utils/timeUtils'

const ShowroomAvailability = () => {
    const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
    const [selectedDate, setSelectedDate] = useState(today)
    const [profileHours, setProfileHours] = useState({ open: '10:00 AM', close: '07:00 PM' })
    const [savedSlots, setSavedSlots] = useState([])
    const [slots, setSlots] = useState([])
    const [slotInput, setSlotInput] = useState('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    const loadDay = async () => {
        setLoading(true)
        try {
            const [profileRes, availabilityRes] = await Promise.all([
                axiosInstance.get('/showroom/profile'),
                axiosInstance.get(`/showroom/availability?date=${selectedDate}`),
            ])
            const hours = profileRes.data.data?.openingHours || { open: '10:00 AM', close: '07:00 PM' }
            setProfileHours(hours)

            const record = (availabilityRes.data.data || [])[0] || null
            const nextSaved = record?.slots || []
            setSavedSlots(nextSaved)
            setSlots(nextSaved.length ? sortSlotTimes(nextSaved.map((slot) => slot.time)) : generateSlotTimes(hours.open, hours.close))
        } catch (error) {
            toast.error('Unable to load live availability.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadDay()
    }, [selectedDate])

    const addSlot = () => {
        const value = slotInput.trim()
        if (!value) return
        if (slots.includes(value)) return toast.info('Slot already exists for this day.')
        setSlots((prev) => sortSlotTimes([...prev, value]))
        setSlotInput('')
    }

    const saveSlots = async () => {
        setSaving(true)
        try {
            const res = await axiosInstance.post('/showroom/availability', {
                date: selectedDate,
                slots: slots.map((time) => {
                    const existing = savedSlots.find((slot) => slot.time === time)
                    return existing || { time, isBooked: false }
                }),
            })
            const nextSaved = res.data.data?.slots || []
            setSavedSlots(nextSaved)
            setSlots(sortSlotTimes(nextSaved.map((slot) => slot.time)))
            toast.success(`Availability updated for ${selectedDate}.`)
        } catch (error) {
            toast.error(error.response?.data?.message || 'Unable to save availability.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div>
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: '#93c5fd' }}>Planner</p>
                    <h1 className="mt-2 text-3xl font-bold text-white">Real-time availability</h1>
                    <p className="mt-2 text-sm text-white/55">Booked slots stay locked. Open slots can be added or removed per day.</p>
                </div>
                <input type="date" min={today} value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" />
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
                <div className="rounded-[28px] p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="flex flex-wrap items-end justify-between gap-3">
                        <div>
                            <p className="text-xs uppercase tracking-[0.22em] text-white/40">Working hours</p>
                            <p className="mt-2 text-white">{profileHours.open} - {profileHours.close}</p>
                        </div>
                        <div className="flex gap-3">
                            <input value={slotInput} onChange={(event) => setSlotInput(event.target.value)} placeholder="Add time like 05:30 PM" className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" />
                            <button type="button" onClick={addSlot} className="rounded-2xl px-4 py-3 text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>Add</button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="py-16 text-center"><div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" /></div>
                    ) : (
                        <div className="mt-6 flex flex-wrap gap-3">
                            {slots.map((time) => {
                                const existing = savedSlots.find((slot) => slot.time === time)
                                const booked = !!existing?.isBooked
                                return (
                                    <button
                                        key={time}
                                        type="button"
                                        onClick={() => !booked && setSlots((prev) => prev.filter((slot) => slot !== time))}
                                        className="rounded-full px-4 py-2 text-sm font-semibold"
                                        style={{ background: booked ? 'rgba(239,68,68,0.14)' : 'rgba(37,99,235,0.14)', color: booked ? '#fca5a5' : '#bfdbfe', border: `1px solid ${booked ? 'rgba(239,68,68,0.24)' : 'rgba(96,165,250,0.24)'}` }}
                                    >
                                        {time} {booked ? '• booked' : '• open'}
                                    </button>
                                )
                            })}
                        </div>
                    )}

                    <button type="button" onClick={saveSlots} disabled={saving || loading} className="mt-6 rounded-2xl px-5 py-3 text-sm font-semibold text-white disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}>
                        {saving ? 'Saving...' : 'Save day plan'}
                    </button>
                </div>

                <div className="rounded-[28px] p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: '#60a5fa' }}>Snapshot</p>
                    <h2 className="mt-2 text-2xl font-bold text-white">Locked vs open</h2>
                    <div className="mt-5 space-y-3">
                        {savedSlots.length === 0 && !loading && <p className="text-sm text-white/50">No slot plan has been saved for this date yet.</p>}
                        {savedSlots.map((slot) => (
                            <div key={slot.time} className="flex items-center justify-between rounded-2xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <span className="text-white">{slot.time}</span>
                                <span className="text-xs font-semibold" style={{ color: slot.isBooked ? '#fca5a5' : '#6ee7b7' }}>{slot.isBooked ? 'Booked by customer' : 'Open for booking'}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ShowroomAvailability
