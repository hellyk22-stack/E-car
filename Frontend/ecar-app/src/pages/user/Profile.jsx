import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import axiosInstance from '../../utils/axiosInstance'
import { clearAuth, getRole } from '../../utils/auth'

const emptyProfile = {
    name: '',
    phone: '',
    address: { street: '', area: '', city: '', state: '', pincode: '' },
}

const Profile = () => {
    const navigate = useNavigate()
    const [profile, setProfile] = useState(emptyProfile)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const role = getRole() || 'user'

    useEffect(() => {
        const load = async () => {
            setLoading(true)
            try {
                const res = await axiosInstance.get('/user/profile')
                setProfile({ ...emptyProfile, ...(res.data.data || {}), address: { ...emptyProfile.address, ...(res.data.data?.address || {}) } })
            } catch (error) {
                toast.error('Unable to load profile details.')
            } finally {
                setLoading(false)
            }
        }

        load()
    }, [])

    const updateAddress = (key, value) => setProfile((prev) => ({ ...prev, address: { ...prev.address, [key]: value } }))

    const handleSave = async () => {
        setSaving(true)
        try {
            await axiosInstance.put('/user/profile', profile)
            toast.success('Profile updated successfully.')
        } catch (error) {
            toast.error(error.response?.data?.message || 'Unable to save profile.')
        } finally {
            setSaving(false)
        }
    }

    const handleLogout = () => {
        clearAuth()
        navigate('/login')
    }

    if (loading) {
        return <div className="flex min-h-screen items-center justify-center"><div className="h-12 w-12 animate-spin rounded-full border-2 border-sky-300 border-t-transparent" /></div>
    }

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.14),_transparent_24%),linear-gradient(180deg,_#07111f,_#0b1220_48%,_#09111b)] px-4 py-10 text-white">
            <div className="mx-auto max-w-5xl">
                <div className="mb-8 rounded-[32px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
                    <p className="text-xs font-semibold uppercase tracking-[0.26em] text-sky-200">My Profile</p>
                    <h1 className="mt-3 text-4xl font-black" style={{ fontFamily: "'Syne', sans-serif" }}>{profile.name || 'Your Account'}</h1>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-white/60" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        Keep this address up to date so showroom booking suggestions and home-drive matching stay accurate.
                    </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                    <div className="rounded-[32px] border border-white/10 bg-white/[0.035] p-6 backdrop-blur-xl">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200">Account Details</p>
                        <div className="mt-5 grid gap-4 md:grid-cols-2">
                            <input value={profile.name} onChange={(event) => setProfile((prev) => ({ ...prev, name: event.target.value }))} placeholder="Full name" className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none" />
                            <input value={profile.phone || ''} onChange={(event) => setProfile((prev) => ({ ...prev, phone: event.target.value }))} placeholder="Phone number" className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none" />
                        </div>

                        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.22em] text-sky-200">Address For Nearby Showrooms</p>
                        <div className="mt-5 grid gap-4 md:grid-cols-2">
                            <textarea value={profile.address.street} onChange={(event) => updateAddress('street', event.target.value)} rows="4" placeholder="Street address" className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none md:col-span-2" />
                            <input value={profile.address.area} onChange={(event) => updateAddress('area', event.target.value)} placeholder="Area / Landmark" className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none" />
                            <input value={profile.address.pincode} onChange={(event) => updateAddress('pincode', event.target.value)} placeholder="Pincode" className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none" />
                            <input value={profile.address.city} onChange={(event) => updateAddress('city', event.target.value)} placeholder="City" className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none" />
                            <input value={profile.address.state} onChange={(event) => updateAddress('state', event.target.value)} placeholder="State" className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none" />
                        </div>

                        <div className="mt-6 flex flex-wrap gap-3">
                            <button type="button" onClick={handleSave} disabled={saving} className="rounded-2xl bg-[linear-gradient(135deg,#38bdf8,#2563eb)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
                                {saving ? 'Saving...' : 'Save Profile'}
                            </button>
                            <button type="button" onClick={handleLogout} className="rounded-2xl border border-rose-300/20 bg-rose-500/10 px-5 py-3 text-sm font-semibold text-rose-200">
                                Sign Out
                            </button>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="rounded-[32px] border border-white/10 bg-white/[0.035] p-6">
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200">Booking Readiness</p>
                            <div className="mt-5 space-y-4 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                <div><p className="text-white/40">Account Type</p><p className="mt-1 text-white">{role === 'admin' ? 'Admin' : 'User'}</p></div>
                                <div><p className="text-white/40">Phone</p><p className="mt-1 text-white">{profile.phone || 'Add phone number'}</p></div>
                                <div><p className="text-white/40">Nearby Search Anchor</p><p className="mt-1 text-white">{profile.address.pincode || 'Add pincode for nearby showroom recommendations'}</p></div>
                            </div>
                        </div>

                        <div className="rounded-[32px] border border-sky-300/15 bg-sky-400/10 p-6">
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-100">Why This Matters</p>
                            <div className="mt-4 space-y-3 text-sm leading-6 text-white/75" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                <p>1. Showroom bookings will prioritize approved partners near this pincode.</p>
                                <p>2. Home test drives will match against serviceable pincodes automatically.</p>
                                <p>3. Confirmed notifications can include the right pickup or showroom details.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Profile
