import React, { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import axiosInstance from '../../utils/axiosInstance'

const ShowroomProfile = () => {
    const [profile, setProfile] = useState({
        name: '',
        email: '',
        phone: '',
        description: '',
        brands: '',
        street: '',
        city: '',
        state: '',
        pincode: '',
        serviceRadius: '',
        servicePincodes: '',
        availableDays: '',
        open: '',
        close: '',
        staff: [{ name: '', phone: '', role: 'test_drive_attendant' }],
    })
    const [logo, setLogo] = useState(null)
    const [logoPreview, setLogoPreview] = useState('')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        const load = async () => {
            try {
                const res = await axiosInstance.get('/showroom/profile')
                const data = res.data.data
                setProfile({
                    name: data?.name || '',
                    email: data?.email || '',
                    phone: data?.phone || '',
                    description: data?.description || '',
                    brands: (data?.brands || []).join(', '),
                    street: data?.address?.street || '',
                    city: data?.address?.city || '',
                    state: data?.address?.state || '',
                    pincode: data?.address?.pincode || '',
                    serviceRadius: data?.serviceRadius || '',
                    servicePincodes: (data?.servicePincodes || []).join(', '),
                    availableDays: (data?.availableDays || []).join(', '),
                    open: data?.openingHours?.open || '',
                    close: data?.openingHours?.close || '',
                    staff: data?.staff?.length ? data.staff : [{ name: '', phone: '', role: 'test_drive_attendant' }],
                })
                setLogoPreview(data?.logo || '')
            } catch (error) {
                toast.error('Unable to load showroom profile')
            }
        }

        load()
    }, [])

    const submitProfile = async (event) => {
        event.preventDefault()
        setSaving(true)
        try {
            const formData = new FormData()
            Object.entries(profile).forEach(([key, value]) => {
                if (key === 'staff') {
                    formData.append('staff', JSON.stringify(value.filter((item) => item.name || item.phone)))
                    return
                }
                formData.append(key, value)
            })
            formData.append('openingHours', JSON.stringify({ open: profile.open, close: profile.close }))
            if (logo) formData.append('logo', logo)

            const res = await axiosInstance.put('/showroom/profile', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            })
            const data = res.data.data || {}
            setProfile((prev) => ({
                ...prev,
                name: data?.name || '',
                email: data?.email || '',
                phone: data?.phone || '',
                description: data?.description || '',
                brands: (data?.brands || []).join(', '),
                street: data?.address?.street || '',
                city: data?.address?.city || '',
                state: data?.address?.state || '',
                pincode: data?.address?.pincode || '',
                serviceRadius: data?.serviceRadius || '',
                servicePincodes: (data?.servicePincodes || []).join(', '),
                availableDays: (data?.availableDays || []).join(', '),
                open: data?.openingHours?.open || '',
                close: data?.openingHours?.close || '',
                staff: data?.staff?.length ? data.staff : [{ name: '', phone: '', role: 'test_drive_attendant' }],
            }))
            setLogoPreview(data?.logo || logoPreview)
            setLogo(null)
            toast.success('Profile updated')
        } catch (error) {
            toast.error(error.response?.data?.message || 'Unable to update profile')
        } finally {
            setSaving(false)
        }
    }

    return (
        <form onSubmit={submitProfile}>
            <div className="mb-8">
                <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: '#93c5fd' }}>Profile</p>
                <h1 className="mt-2 text-3xl font-bold text-white">Showroom settings</h1>
            </div>

            <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
                <div className="rounded-[28px] p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <h2 className="text-2xl font-bold text-white">Branding</h2>
                    {logoPreview && <img src={logoPreview} alt="Showroom logo" className="mt-5 h-48 w-full rounded-2xl object-cover" />}
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => {
                            const file = event.target.files?.[0]
                            setLogo(file || null)
                            if (file) setLogoPreview(URL.createObjectURL(file))
                        }}
                        className="mt-5 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
                    />
                </div>

                <div className="rounded-[28px] p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="grid gap-4 md:grid-cols-2">
                        {[
                            ['name', 'Showroom name'],
                            ['email', 'Email'],
                            ['phone', 'Phone'],
                            ['brands', 'Registered brands'],
                            ['serviceRadius', 'Service radius (km)'],
                            ['street', 'Street'],
                            ['city', 'City'],
                            ['state', 'State'],
                            ['pincode', 'Pincode'],
                            ['servicePincodes', 'Service pincodes'],
                            ['availableDays', 'Available days'],
                            ['open', 'Opening time'],
                            ['close', 'Closing time'],
                        ].map(([key, label]) => (
                            <div key={key}>
                                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.45)' }}>{label}</label>
                                <input value={profile[key]} onChange={(event) => setProfile((prev) => ({ ...prev, [key]: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" />
                            </div>
                        ))}
                    </div>

                    <div className="mt-4">
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.45)' }}>Description</label>
                        <textarea value={profile.description} onChange={(event) => setProfile((prev) => ({ ...prev, description: event.target.value }))} rows="4" className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" />
                    </div>

                    <div className="mt-6">
                        <h3 className="text-lg font-bold text-white">Test drive staff</h3>
                        <div className="mt-4 space-y-3">
                            {profile.staff.map((member, index) => (
                                <div key={`${member.name}-${index}`} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                                    <input value={member.name} onChange={(event) => setProfile((prev) => ({ ...prev, staff: prev.staff.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item) }))} placeholder="Name" className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" />
                                    <input value={member.phone} onChange={(event) => setProfile((prev) => ({ ...prev, staff: prev.staff.map((item, itemIndex) => itemIndex === index ? { ...item, phone: event.target.value } : item) }))} placeholder="Phone" className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" />
                                    <button type="button" onClick={() => setProfile((prev) => ({ ...prev, staff: prev.staff.filter((_, itemIndex) => itemIndex !== index) }))} className="rounded-2xl px-4 py-3 text-sm font-semibold" style={{ background: 'rgba(239,68,68,0.08)', color: '#fca5a5' }}>
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={() => setProfile((prev) => ({ ...prev, staff: [...prev.staff, { name: '', phone: '', role: 'test_drive_attendant' }] }))} className="mt-4 rounded-2xl px-4 py-3 text-sm font-semibold text-white" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            Add staff member
                        </button>
                    </div>

                    <button type="submit" disabled={saving} className="mt-6 rounded-2xl px-5 py-3 text-sm font-semibold text-white disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>
                        {saving ? 'Saving...' : 'Save profile'}
                    </button>
                </div>
            </div>
        </form>
    )
}

export default ShowroomProfile
