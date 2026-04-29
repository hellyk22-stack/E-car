import React, { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import axiosInstance from '../../utils/axiosInstance'
import {
    buildPlanFeatureRows,
    fetchSubscriptionStatus,
    formatBillingCycle,
    formatLimitValue,
    formatPlanName,
    isUnlimitedLimit,
} from '../../utils/subscription'

const formatRupees = (amount) => `Rs ${Number(amount || 0).toLocaleString('en-IN')}`

const getUsageProgress = (current, limit) => {
    if (isUnlimitedLimit(limit)) return 0
    const numericLimit = Number(limit || 0)
    if (!numericLimit) return 0
    return Math.min(100, Math.round((Number(current || 0) / numericLimit) * 100))
}

const Subscription = () => {
    const [status, setStatus] = useState(null)
    const [history, setHistory] = useState([])
    const [loading, setLoading] = useState(true)
    const [cancelling, setCancelling] = useState(false)

    const loadData = async () => {
        setLoading(true)
        try {
            const [statusData, historyRes] = await Promise.all([
                fetchSubscriptionStatus(),
                axiosInstance.get('/payment/history'),
            ])
            setStatus(statusData)
            setHistory(historyRes.data.data || [])
        } catch (error) {
            toast.error('Unable to load subscription details right now.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    const handleCancel = async () => {
        try {
            setCancelling(true)
            await axiosInstance.post('/payment/cancel')
            toast.success('Subscription cancelled.')
            await loadData()
        } catch (error) {
            toast.error(error.response?.data?.message || 'Unable to cancel the subscription.')
        } finally {
            setCancelling(false)
        }
    }

    const usage = status?.usage || {}
    const featureRows = useMemo(() => buildPlanFeatureRows(status?.limits || {}), [status?.limits])
    const usageCards = [
        {
            label: 'AI chats today',
            current: usage.aiChatsToday || 0,
            limit: usage.aiChatsLimit,
        },
        {
            label: 'Active bookings',
            current: usage.activeBookingsCount || 0,
            limit: usage.activeBookingsLimit,
        },
        {
            label: 'Wishlist',
            current: usage.wishlistCount || 0,
            limit: usage.wishlistLimit,
        },
    ]

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 px-4 py-10 text-slate-100">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
                .sub-title { font-family: 'Syne', sans-serif; letter-spacing: -0.03em; }
                .sub-copy { font-family: 'DM Sans', sans-serif; }
            `}</style>

            <div className="mx-auto max-w-6xl">
                <div className="mb-8">
                    <p className="sub-copy text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Subscription</p>
                    <h1 className="sub-title mt-3 text-4xl font-black text-white">Manage your plan and usage</h1>
                </div>

                {loading ? (
                    <div className="sub-copy rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-slate-300">Loading subscription details...</div>
                ) : (
                    <>
                        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6">
                                <p className="sub-copy text-xs uppercase tracking-[0.24em] text-slate-400">Current Plan</p>
                                <h2 className="sub-title mt-3 text-3xl text-white">{status?.planLabel || formatPlanName(status?.plan)}</h2>
                                <div className="sub-copy mt-5 grid gap-3 sm:grid-cols-3">
                                    <div className="rounded-2xl border border-white/8 bg-slate-950/30 p-4">
                                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Billing</p>
                                        <p className="mt-2 text-white">{formatBillingCycle(status?.billingCycle)}</p>
                                    </div>
                                    <div className="rounded-2xl border border-white/8 bg-slate-950/30 p-4">
                                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Expiry</p>
                                        <p className="mt-2 text-white">{status?.planExpiry ? new Date(status.planExpiry).toLocaleDateString('en-IN') : 'No expiry'}</p>
                                    </div>
                                    <div className="rounded-2xl border border-white/8 bg-slate-950/30 p-4">
                                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Smart Compare</p>
                                        <p className="mt-2 text-white">{isUnlimitedLimit(status?.limits?.smartCompareLimit) ? 'Unlimited' : `${formatLimitValue(status?.limits?.smartCompareLimit)} cars`}</p>
                                    </div>
                                </div>

                                {status?.plan !== 'explorer' && (
                                    <button
                                        type="button"
                                        disabled={cancelling}
                                        onClick={handleCancel}
                                        className="sub-copy mt-6 rounded-2xl border border-rose-300/20 bg-rose-500/10 px-5 py-3 text-sm font-semibold text-rose-200 disabled:opacity-60"
                                    >
                                        {cancelling ? 'Cancelling...' : 'Cancel Subscription'}
                                    </button>
                                )}
                            </div>

                            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6">
                                <p className="sub-copy text-xs uppercase tracking-[0.24em] text-slate-400">Usage Stats</p>
                                <div className="sub-copy mt-5 space-y-3">
                                    {usageCards.map((item) => {
                                        const progress = getUsageProgress(item.current, item.limit)
                                        const limitReached = !isUnlimitedLimit(item.limit) && Number(item.current || 0) >= Number(item.limit || 0)

                                        return (
                                            <div key={item.label} className="rounded-2xl border border-white/8 bg-slate-950/30 px-4 py-4">
                                                <div className="flex items-center justify-between gap-3">
                                                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
                                                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${limitReached ? 'bg-rose-500/15 text-rose-200' : 'bg-cyan-400/10 text-cyan-200'}`}>
                                                        {limitReached ? 'Limit full' : 'Live'}
                                                    </span>
                                                </div>
                                                <p className="mt-2 text-base font-semibold text-white">{item.current} / {formatLimitValue(item.limit)}</p>
                                                {!isUnlimitedLimit(item.limit) && (
                                                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                                                        <div className={`h-full rounded-full ${limitReached ? 'bg-rose-400' : 'bg-cyan-400'}`} style={{ width: `${progress}%` }} />
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.04] p-6">
                            <div className="mb-5">
                                <p className="sub-copy text-xs uppercase tracking-[0.24em] text-slate-400">Plan Perks</p>
                                <h2 className="sub-title mt-2 text-2xl text-white">Everything active on your current plan</h2>
                            </div>

                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                {featureRows.map(([label, value]) => (
                                    <div key={label} className="sub-copy rounded-2xl border border-white/8 bg-slate-950/30 px-4 py-4">
                                        <p className="text-sm text-slate-300">{label}</p>
                                        <p className="mt-2 text-base font-semibold text-white">{value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.04] p-6">
                            <div className="mb-5">
                                <p className="sub-copy text-xs uppercase tracking-[0.24em] text-slate-400">Payment History</p>
                                <h2 className="sub-title mt-2 text-2xl text-white">Recent payments</h2>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="sub-copy min-w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-white/10 text-slate-400">
                                            <th className="px-3 py-3 font-medium">Date</th>
                                            <th className="px-3 py-3 font-medium">Plan</th>
                                            <th className="px-3 py-3 font-medium">Amount</th>
                                            <th className="px-3 py-3 font-medium">Status</th>
                                            <th className="px-3 py-3 font-medium">Receipt</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {history.length === 0 && (
                                            <tr>
                                                <td colSpan="5" className="px-3 py-6 text-slate-400">No subscription payments yet.</td>
                                            </tr>
                                        )}
                                        {history.map((item) => (
                                            <tr key={item._id} className="border-b border-white/6">
                                                <td className="px-3 py-3 text-white">{new Date(item.createdAt).toLocaleDateString('en-IN')}</td>
                                                <td className="px-3 py-3">{formatPlanName(item.plan)}</td>
                                                <td className="px-3 py-3">{formatRupees(item.amount)}</td>
                                                <td className="px-3 py-3 capitalize">{item.status}</td>
                                                <td className="px-3 py-3 text-cyan-300">{item.paymentId || item.orderId || '--'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

export default Subscription
