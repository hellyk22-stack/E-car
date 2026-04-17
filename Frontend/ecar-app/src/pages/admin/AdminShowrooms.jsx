import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import axiosInstance from '../../utils/axiosInstance'
import Pagination from '../../components/shared/Pagination'

const emptyForm = {
    name: '',
    email: '',
    address: '',
    city: '',
    pincode: '',
    contactNumber: '',
    brands: '',
}

const AdminShowrooms = () => {
    const [showrooms, setShowrooms] = useState([])
    const [pendingShowrooms, setPendingShowrooms] = useState([])
    const [page, setPage] = useState(1)
    const [meta, setMeta] = useState({ totalPages: 1, total: 0, pendingCount: 0, activeCount: 0, cityCount: 0 })
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [form, setForm] = useState(emptyForm)

    const loadShowrooms = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({
                page: String(page),
                limit: '12',
                search,
            })
            const res = await axiosInstance.get(`/admin/showrooms?${params.toString()}`)
            setShowrooms(res.data.data || [])
            setMeta(res.data.meta || { totalPages: 1, total: 0, pendingCount: 0, activeCount: 0, cityCount: 0 })
        } catch {
            toast.error('Unable to load showrooms.')
        } finally {
            setLoading(false)
        }
    }, [page, search])

    const loadPendingShowrooms = useCallback(async () => {
        try {
            const params = new URLSearchParams({
                page: '1',
                limit: '8',
                status: 'pending',
                search,
            })
            const res = await axiosInstance.get(`/admin/showrooms?${params.toString()}`)
            setPendingShowrooms(res.data.data || [])
        } catch (error) {
            console.error('Failed to load pending showrooms', error)
        }
    }, [search])

    useEffect(() => {
        loadShowrooms()
        loadPendingShowrooms()
    }, [loadPendingShowrooms, loadShowrooms])

    const stats = useMemo(() => ({
        total: meta.total ?? showrooms.length,
        pending: meta.pendingCount ?? pendingShowrooms.length,
        active: meta.activeCount ?? showrooms.filter((item) => item.isActive).length,
        cities: meta.cityCount ?? new Set(showrooms.map((item) => item.address?.city).filter(Boolean)).size,
    }), [meta, pendingShowrooms.length, showrooms])

    const handleSubmit = async (event) => {
        event.preventDefault()
        if (!form.name.trim() || !form.city.trim() || !form.pincode.trim() || !form.contactNumber.trim()) {
            toast.info('Add the showroom name, city, pincode, and contact number first.')
            return
        }

        setSubmitting(true)
        try {
            const res = await axiosInstance.post('/admin/add-showroom', form)
            toast.success(
                res.data.meta?.reusedPendingRequest
                    ? 'Pending showroom approved and updated.'
                    : 'Showroom added and ready for bookings.',
            )
            setForm(emptyForm)
            await Promise.all([loadShowrooms(), loadPendingShowrooms()])
        } catch (error) {
            toast.error(error.response?.data?.message || 'Unable to add showroom.')
        } finally {
            setSubmitting(false)
        }
    }

    const runAction = async (id, action) => {
        try {
            if (action === 'approve') await axiosInstance.put(`/admin/showrooms/${id}/approve`)
            if (action === 'deactivate') await axiosInstance.put(`/admin/showrooms/${id}/deactivate`)
            if (action === 'delete') await axiosInstance.delete(`/admin/showrooms/${id}`)
            toast.success(`Showroom ${action}d successfully.`)
            await Promise.all([loadShowrooms(), loadPendingShowrooms()])
        } catch (error) {
            toast.error(error.response?.data?.message || `Unable to ${action} showroom.`)
        }
    }

    return (
        <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: '#fbbf24' }}>Partners</p>
                    <h1 className="mt-2 text-3xl font-bold text-white" style={{ fontFamily: "'Syne', sans-serif" }}>Manage Showrooms</h1>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">
                        Register new showroom partners, approve pending requests, and keep the booking network clean.
                    </p>
                </div>
                <input
                    value={search}
                    onChange={(event) => {
                        setPage(1)
                        setSearch(event.target.value)
                    }}
                    placeholder="Search by showroom, city, or email"
                    className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
                />
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[
                    ['Registered', stats.total],
                    ['Pending Approval', stats.pending],
                    ['Active', stats.active],
                    ['Cities Covered', stats.cities],
                ].map(([label, value]) => (
                    <div key={label} className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">{label}</p>
                        <p className="mt-3 text-3xl font-black text-white" style={{ fontFamily: "'Syne', sans-serif" }}>{value}</p>
                    </div>
                ))}
            </div>

            <div className="mt-8 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: '#93c5fd' }}>Admin Intake</p>
                    <h2 className="mt-2 text-2xl font-bold text-white" style={{ fontFamily: "'Syne', sans-serif" }}>Add Showroom</h2>
                    <p className="mt-3 text-sm leading-6 text-white/55">
                        Use approvals for existing showroom signups. Add Showroom creates a fresh partner account, and including the login email keeps the account easy to share.
                    </p>
                    <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
                        {[
                            ['name', 'Showroom name'],
                            ['email', 'Login email (optional)'],
                            ['address', 'Address'],
                            ['city', 'City'],
                            ['pincode', 'Pincode'],
                            ['contactNumber', 'Contact number'],
                            ['brands', 'Brands'],
                        ].map(([key, label]) => (
                            <div key={key} className={key === 'address' || key === 'brands' ? 'md:col-span-2' : ''}>
                                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-white/45">{label}</label>
                                <input
                                    type={key === 'email' ? 'email' : 'text'}
                                    value={form[key]}
                                    onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))}
                                    placeholder={label}
                                    className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none"
                                />
                            </div>
                        ))}
                        <div className="md:col-span-2 flex flex-wrap gap-3 pt-2">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="rounded-2xl px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                                style={{ background: 'linear-gradient(135deg, #38bdf8, #2563eb)' }}
                            >
                                {submitting ? 'Saving...' : 'Add Showroom'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setForm(emptyForm)}
                                className="rounded-2xl px-5 py-3 text-sm font-semibold text-white"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                            >
                                Clear
                            </button>
                        </div>
                    </form>
                </div>

                <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-6">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: '#fde68a' }}>Incoming Requests</p>
                            <h2 className="mt-2 text-2xl font-bold text-white" style={{ fontFamily: "'Syne', sans-serif" }}>Pending Showrooms</h2>
                        </div>
                        <span className="rounded-full border border-amber-300/25 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-200">
                            {stats.pending} awaiting review
                        </span>
                    </div>

                    <div className="mt-5 space-y-4">
                        {pendingShowrooms.length === 0 && (
                            <div className="rounded-2xl border border-dashed border-white/10 px-5 py-10 text-center text-sm text-white/55">
                                No pending showroom requests right now.
                            </div>
                        )}
                        {pendingShowrooms.map((showroom) => (
                            <div key={showroom._id} className="rounded-[24px] border border-amber-300/12 bg-amber-400/5 p-5">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <h3 className="text-xl font-bold text-white" style={{ fontFamily: "'Syne', sans-serif" }}>{showroom.name}</h3>
                                        <p className="mt-2 text-sm text-white/60">{showroom.address?.city || '--'}, {showroom.address?.pincode || '--'}</p>
                                        <p className="mt-2 text-sm text-white/55">{showroom.phone || showroom.contactNumber || showroom.email}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => runAction(showroom._id, 'approve')}
                                        className="rounded-2xl px-4 py-2 text-sm font-semibold text-white"
                                        style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}
                                    >
                                        Approve
                                    </button>
                                </div>
                                {!!showroom.brands?.length && (
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {showroom.brands.map((brand) => (
                                            <span key={brand} className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-semibold text-white/75">
                                                {brand}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mt-8 rounded-[28px] border border-white/8 bg-white/[0.03] p-6">
                <div className="mb-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: '#bfdbfe' }}>Registered Network</p>
                    <h2 className="mt-2 text-2xl font-bold text-white" style={{ fontFamily: "'Syne', sans-serif" }}>Showroom Cards</h2>
                </div>

                {loading ? (
                    <div className="py-16 text-center">
                        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
                    </div>
                ) : showrooms.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center">
                        <p className="text-white text-lg font-semibold">No showrooms found</p>
                    </div>
                ) : (
                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                        {showrooms.map((showroom) => (
                            <div key={showroom._id} className="rounded-[28px] border border-white/8 bg-slate-950/40 p-5">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <h3 className="text-2xl font-bold text-white" style={{ fontFamily: "'Syne', sans-serif" }}>{showroom.name}</h3>
                                        <p className="mt-2 text-sm leading-6 text-white/55">
                                            {showroom.address?.street || 'Address pending'}, {showroom.address?.city || '--'} {showroom.address?.pincode || '--'}
                                        </p>
                                    </div>
                                    <span
                                        className="rounded-full px-3 py-1 text-xs font-semibold"
                                        style={{
                                            background: showroom.isApproved ? 'rgba(16,185,129,0.14)' : 'rgba(245,158,11,0.14)',
                                            color: showroom.isApproved ? '#6ee7b7' : '#fbbf24',
                                            border: '1px solid rgba(255,255,255,0.12)',
                                        }}
                                    >
                                        {showroom.isApproved ? 'Approved' : 'Pending'}
                                    </span>
                                </div>

                                <div className="mt-5 flex flex-wrap gap-2">
                                    {(showroom.brands || []).length > 0 ? (
                                        showroom.brands.map((brand) => (
                                            <span key={brand} className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-semibold text-white/75">
                                                {brand}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-semibold text-white/55">
                                            Brands not added
                                        </span>
                                    )}
                                </div>

                                <div className="mt-5 flex flex-wrap gap-2">
                                    {!showroom.isApproved && (
                                        <button
                                            type="button"
                                            onClick={() => runAction(showroom._id, 'approve')}
                                            className="rounded-xl px-3 py-2 text-xs font-semibold text-white"
                                            style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}
                                        >
                                            Approve
                                        </button>
                                    )}
                                    {showroom.isActive && (
                                        <button
                                            type="button"
                                            onClick={() => runAction(showroom._id, 'deactivate')}
                                            className="rounded-xl px-3 py-2 text-xs font-semibold"
                                            style={{ background: 'rgba(245,158,11,0.14)', border: '1px solid rgba(245,158,11,0.24)', color: '#fcd34d' }}
                                        >
                                            Deactivate
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => runAction(showroom._id, 'delete')}
                                        className="rounded-xl px-3 py-2 text-xs font-semibold"
                                        style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.24)', color: '#fca5a5' }}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <Pagination page={page} totalPages={meta.totalPages || 1} onChange={setPage} />
            </div>
        </div>
    )
}

export default AdminShowrooms
