import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import axiosInstance from '../../utils/axiosInstance'

const ShowroomRegister = () => {
    const navigate = useNavigate()
    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        phone: '',
        street: '',
        city: '',
        state: '',
        pincode: '',
        brands: '',
        description: '',
        serviceRadius: '',
        servicePincodes: '',
        availableDays: 'Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday',
        openingOpen: '10:00 AM',
        openingClose: '07:00 PM',
    })
    const [logo, setLogo] = useState(null)
    const [submitting, setSubmitting] = useState(false)

    const submit = async (event) => {
        event.preventDefault()
        setSubmitting(true)
        try {
            const formData = new FormData()
            Object.entries(form).forEach(([key, value]) => formData.append(key, value))
            if (logo) formData.append('logo', logo)
            const res = await axiosInstance.post('/showroom/register', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            })
            toast.success('Registration submitted. Wait for admin approval.')
            navigate('/login', {
                state: {
                    approvalRequest: {
                        name: form.name,
                        city: form.city,
                        pincode: form.pincode,
                        submittedAt: res.data.data?.submittedAt,
                    },
                },
            })
        } catch (error) {
            toast.error(error.response?.data?.message || 'Unable to submit showroom registration')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 px-4 py-12">
            <div className="mx-auto max-w-4xl rounded-[32px] p-8" style={{ background: 'rgba(15,23,42,0.88)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: '#93c5fd' }}>Partner with E-CAR</p>
                <h1 className="mt-3 text-4xl font-black text-white">Register your showroom</h1>
                <p className="mt-3 text-sm" style={{ color: 'rgba(255,255,255,0.56)', fontFamily: "'DM Sans', sans-serif" }}>
                    Submit your details, service area, and showroom branding. Admin approval is required before login.
                </p>

                <form onSubmit={submit} className="mt-8 grid gap-4 md:grid-cols-2">
                    {[
                        ['name', 'Showroom name'],
                        ['email', 'Email'],
                        ['password', 'Password', 'password'],
                        ['phone', 'Phone'],
                        ['street', 'Street'],
                        ['city', 'City'],
                        ['state', 'State'],
                        ['pincode', 'Pincode'],
                        ['brands', 'Brands'],
                        ['serviceRadius', 'Service radius (km)', 'number'],
                        ['servicePincodes', 'Service pincodes'],
                        ['openingOpen', 'Open'],
                        ['openingClose', 'Close'],
                    ].map(([key, label, type]) => (
                        <div key={key}>
                            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.45)' }}>{label}</label>
                            <input
                                type={type || 'text'}
                                value={form[key]}
                                onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))}
                                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
                            />
                        </div>
                    ))}
                    <div className="md:col-span-2">
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.45)' }}>Available days</label>
                        <input value={form.availableDays} onChange={(event) => setForm((prev) => ({ ...prev, availableDays: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.45)' }}>Description</label>
                        <textarea value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} rows="4" className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.45)' }}>Logo</label>
                        <input type="file" accept="image/*" onChange={(event) => setLogo(event.target.files?.[0] || null)} className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" />
                    </div>
                    <div className="md:col-span-2 flex flex-wrap gap-3 pt-2">
                        <button type="submit" disabled={submitting} className="rounded-2xl px-6 py-3 text-sm font-semibold text-white disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>
                            {submitting ? 'Submitting...' : 'Submit registration'}
                        </button>
                        <button type="button" onClick={() => navigate('/login')} className="rounded-2xl px-6 py-3 text-sm font-semibold text-white" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            Back to login
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default ShowroomRegister
