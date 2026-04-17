import React, { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import axiosInstance from '../../utils/axiosInstance'
import {
    fetchSubscriptionStatus,
    formatBillingCycle,
    formatCurrencyFromPaise,
    formatLimitValue,
    formatPlanName,
} from '../../utils/subscription'

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
                        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
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
                                        <p className="mt-2 text-white">{formatLimitValue(status?.limits?.smartCompareLimit)} cars</p>
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
                                    {[
                                        ['AI chats today', `${usage.aiChatsToday || 0} / ${formatLimitValue(usage.aiChatsLimit)}`],
                                        ['Active bookings', `${usage.activeBookingsCount || 0} / ${formatLimitValue(usage.activeBookingsLimit)}`],
                                        ['Wishlist', `${usage.wishlistCount || 0} / ${formatLimitValue(usage.wishlistLimit)}`],
                                    ].map(([label, value]) => (
                                        <div key={label} className="rounded-2xl border border-white/8 bg-slate-950/30 px-4 py-3">
                                            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</p>
                                            <p className="mt-2 text-base font-semibold text-white">{value}</p>
                                        </div>
                                    ))}
                                </div>
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
                                                <td className="px-3 py-3">{formatCurrencyFromPaise(item.amount)}</td>
                                                <td className="px-3 py-3 capitalize">{item.status}</td>
                                                <td className="px-3 py-3 text-cyan-300">{item.razorpayPaymentId || item.razorpayOrderId || '--'}</td>
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
