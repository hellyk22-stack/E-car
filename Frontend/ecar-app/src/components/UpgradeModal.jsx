import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import axiosInstance from '../utils/axiosInstance'
import { formatPlanName, loadRazorpay } from '../utils/subscription'

/**
 * UpgradeModal — a reusable premium upgrade prompt.
 *
 * Props:
 *  - isOpen       : boolean — controls visibility
 *  - onClose      : () => void — close handler
 *  - featureName  : string — the feature that triggered the gate (e.g. "AI Advisor")
 *  - requiredPlan : 'pro_buyer' | 'elite' — the minimum plan needed
 *  - onSuccess    : (plan) => void — optional callback after successful payment
 */

const PLAN_HIGHLIGHTS = {
    pro_buyer: {
        price: '₹299',
        cycle: '/month',
        color: 'from-blue-500 to-indigo-600',
        ring: 'ring-blue-400/30',
        glow: 'shadow-[0_0_60px_rgba(59,130,246,0.2)]',
        perks: [
            '10 Smart Comparisons',
            '25 AI chats per day',
            '25 wishlist slots',
            'Price history charts',
            'PDF exports',
            'Priority showroom access',
        ],
    },
    elite: {
        price: '₹599',
        cycle: '/month',
        color: 'from-amber-400 to-orange-500',
        ring: 'ring-amber-400/30',
        glow: 'shadow-[0_0_60px_rgba(245,158,11,0.2)]',
        perks: [
            'Unlimited everything',
            'Excel & PDF exports',
            'Priority showrooms',
            'Price drop alerts',
            'Early access features',
        ],
    },
}

const UpgradeModal = ({
    isOpen,
    onClose,
    featureName = 'this feature',
    requiredPlan = 'pro_buyer',
    onSuccess,
}) => {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const plan = PLAN_HIGHLIGHTS[requiredPlan] || PLAN_HIGHLIGHTS.pro_buyer
    const planKey = requiredPlan

    const handleUpgradeNow = async () => {
        try {
            setLoading(true)
            const Razorpay = await loadRazorpay()
            const orderRes = await axiosInstance.post('/payment/create-order', {
                plan: planKey,
                billingCycle: 'monthly',
            })

            const order = orderRes.data
            const options = {
                key: order.key,
                amount: order.amount,
                currency: order.currency,
                name: 'E-CAR',
                description: `${formatPlanName(planKey)} Plan — Monthly`,
                order_id: order.orderId,
                handler: async (response) => {
                    try {
                        await axiosInstance.post('/payment/verify-payment', {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                        })
                        toast.success('🎉 Subscription activated!')
                        onSuccess?.(planKey)
                        onClose()
                    } catch {
                        toast.error('Payment succeeded but verification failed. Contact support.')
                    }
                },
                modal: {
                    ondismiss: () => toast.info('Checkout dismissed.'),
                },
                prefill: {
                    name: localStorage.getItem('name') || '',
                    email: localStorage.getItem('email') || '',
                },
                theme: { color: '#378ADD' },
            }

            const instance = new Razorpay(options)
            instance.on('payment.failed', (res) =>
                toast.error(res.error?.description || 'Payment failed.')
            )
            instance.open()
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not start checkout.')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
                .upgrade-title { font-family: 'Syne', sans-serif; letter-spacing: -0.03em; }
                .upgrade-copy  { font-family: 'DM Sans', sans-serif; }
                @keyframes upgradeSlideIn {
                    from { opacity: 0; transform: translateY(24px) scale(0.97); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes upgradeFadeIn {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }
                .upgrade-panel  { animation: upgradeSlideIn 0.35s cubic-bezier(0.16,1,0.3,1); }
                .upgrade-overlay { animation: upgradeFadeIn 0.25s ease; }
            `}</style>

            {/* Backdrop */}
            <div
                className="upgrade-overlay fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                <div
                    className={`upgrade-panel upgrade-copy relative w-full max-w-md overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 ${plan.glow}`}
                >
                    {/* Top gradient accent */}
                    <div
                        className={`h-1.5 w-full bg-gradient-to-r ${plan.color}`}
                    />

                    <div className="px-6 pb-6 pt-7">
                        {/* Close */}
                        <button
                            onClick={onClose}
                            className="absolute right-4 top-5 flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-white"
                            aria-label="Close"
                        >
                            ✕
                        </button>

                        {/* Icon */}
                        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400/20 to-orange-500/10 text-3xl">
                            🔒
                        </div>

                        <h2 className="upgrade-title text-2xl font-bold text-white">
                            Unlock {featureName}
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-slate-400">
                            <span className="font-semibold text-white">{featureName}</span> requires
                            the{' '}
                            <span className={`font-semibold bg-gradient-to-r ${plan.color} bg-clip-text text-transparent`}>
                                {formatPlanName(planKey)}
                            </span>{' '}
                            plan or above.
                        </p>

                        {/* Price badge */}
                        <div className="mt-6 flex items-end gap-1">
                            <span className="upgrade-title text-4xl font-black text-white">
                                {plan.price}
                            </span>
                            <span className="pb-1 text-sm text-slate-400">{plan.cycle}</span>
                        </div>

                        {/* Perks */}
                        <ul className="mt-5 space-y-2.5">
                            {plan.perks.map((perk) => (
                                <li
                                    key={perk}
                                    className="flex items-center gap-2.5 text-sm text-slate-300"
                                >
                                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-xs text-emerald-300">
                                        ✓
                                    </span>
                                    {perk}
                                </li>
                            ))}
                        </ul>

                        {/* Actions */}
                        <div className="mt-7 flex flex-col gap-3">
                            <button
                                type="button"
                                disabled={loading}
                                onClick={handleUpgradeNow}
                                className={`w-full rounded-2xl bg-gradient-to-r ${plan.color} px-5 py-3.5 text-sm font-bold text-white shadow-lg transition hover:brightness-110 disabled:opacity-60`}
                            >
                                {loading ? 'Opening checkout...' : `Upgrade to ${formatPlanName(planKey)}`}
                            </button>
                            <button
                                type="button"
                                onClick={() => { onClose(); navigate('/user/pricing') }}
                                className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.06]"
                            >
                                Compare all plans
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default UpgradeModal
