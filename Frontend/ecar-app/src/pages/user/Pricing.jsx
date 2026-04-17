import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import axiosInstance from '../../utils/axiosInstance'
import {
    fetchSubscriptionStatus,
    formatBillingCycle,
    formatPlanName,
    loadRazorpay,
} from '../../utils/subscription'

const plans = {
    explorer: {
        monthly: 0,
        annual: 0,
        caption: 'Free forever',
        features: [
            ['Smart Compare', 'Up to 3 cars'],
            ['Basic Compare', 'Unlimited'],
            ['AI Advisor', '3 chats per day'],
            ['Wishlist', '5 saved cars'],
            ['Test Drives', '1 active booking'],
            ['Price History Chart', 'No'],
            ['Export Comparison PDF', 'No'],
            ['Export Comparison Excel', 'No'],
            ['Price Drop Alerts', 'No'],
        ],
    },
    pro_buyer: {
        monthly: 199,
        annual: 1910,
        caption: 'For active car buyers',
        features: [
            ['Smart Compare', 'Up to 4 cars'],
            ['Basic Compare', 'Unlimited'],
            ['AI Advisor', 'Unlimited'],
            ['Wishlist', 'Unlimited'],
            ['Test Drives', '3 active bookings'],
            ['Price History Chart', 'Yes'],
            ['Export Comparison PDF', 'Yes'],
            ['Export Comparison Excel', 'No'],
            ['Price Drop Alerts', 'No'],
        ],
    },
    elite: {
        monthly: 499,
        annual: 4790,
        caption: 'For premium shoppers',
        features: [
            ['Smart Compare', 'Up to 6 cars'],
            ['Basic Compare', 'Unlimited'],
            ['AI Advisor', 'Unlimited'],
            ['Wishlist', 'Unlimited'],
            ['Test Drives', 'Unlimited'],
            ['Price History Chart', 'Yes'],
            ['Export Comparison PDF', 'Yes'],
            ['Export Comparison Excel', 'Yes'],
            ['Priority Showrooms', 'Yes'],
            ['Price Drop Alerts', 'Yes'],
        ],
    },
}

const Pricing = () => {
    const navigate = useNavigate()
    const [billingCycle, setBillingCycle] = useState('monthly')
    const [subscription, setSubscription] = useState(null)
    const [loading, setLoading] = useState(true)
    const [subscribingPlan, setSubscribingPlan] = useState('')

    useEffect(() => {
        fetchSubscriptionStatus()
            .then(setSubscription)
            .catch(() => toast.error('Unable to load your current plan right now.'))
            .finally(() => setLoading(false))
    }, [])

    const annualSavings = useMemo(() => ({
        pro_buyer: Math.max(plans.pro_buyer.monthly * 12 - plans.pro_buyer.annual, 0),
        elite: Math.max(plans.elite.monthly * 12 - plans.elite.annual, 0),
    }), [])

    const handleSubscribe = async (planKey) => {
        if (planKey === 'explorer') {
            toast.info('Explorer is already the free plan.')
            return
        }

        try {
            setSubscribingPlan(planKey)
            const Razorpay = await loadRazorpay()
            const orderRes = await axiosInstance.post('/payment/create-order', {
                plan: planKey,
                billingCycle,
            })

            const order = orderRes.data.data
            const options = {
                key: order.keyId,
                amount: order.amount,
                currency: order.currency,
                name: 'E-CAR',
                description: `${formatPlanName(planKey)} Plan - ${formatBillingCycle(billingCycle)}`,
                order_id: order.orderId,
                handler: async (response) => {
                    await axiosInstance.post('/payment/verify', {
                        razorpayOrderId: response.razorpay_order_id,
                        razorpayPaymentId: response.razorpay_payment_id,
                        razorpaySignature: response.razorpay_signature,
                        plan: planKey,
                        billingCycle,
                    })
                    toast.success('Subscription activated successfully.')
                    navigate('/user/subscription')
                },
                prefill: {
                    name: localStorage.getItem('name') || 'User',
                },
                theme: {
                    color: '#378ADD',
                },
            }

            const instance = new Razorpay(options)
            instance.open()
        } catch (error) {
            toast.error(error.response?.data?.message || 'Unable to start checkout right now.')
        } finally {
            setSubscribingPlan('')
        }
    }

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,138,221,0.2),_transparent_28%),linear-gradient(135deg,_#06111f,_#0f172a_45%,_#14213d)] px-4 py-10 text-slate-100">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
                .pricing-title { font-family: 'Syne', sans-serif; letter-spacing: -0.03em; }
                .pricing-copy { font-family: 'DM Sans', sans-serif; }
            `}</style>

            <div className="mx-auto max-w-6xl">
                <div className="mb-10 text-center">
                    <p className="pricing-copy text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">Plans</p>
                    <h1 className="pricing-title mt-3 text-4xl font-black text-white md:text-5xl">Choose the right buying mode</h1>
                    <p className="pricing-copy mx-auto mt-4 max-w-3xl text-base text-slate-300">
                        Explorer keeps discovery free. Pro Buyer unlocks AI-heavy research. Elite is built for shoppers who want the full decision toolkit.
                    </p>

                    <div className="pricing-copy mt-6 inline-flex rounded-full border border-white/10 bg-white/5 p-1">
                        {['monthly', 'annual'].map((cycle) => (
                            <button
                                key={cycle}
                                type="button"
                                onClick={() => setBillingCycle(cycle)}
                                className={`rounded-full px-5 py-2 text-sm font-semibold transition ${billingCycle === cycle ? 'bg-white text-slate-950' : 'text-slate-300'}`}
                            >
                                {cycle === 'monthly' ? 'Monthly' : 'Annual'}
                            </button>
                        ))}
                    </div>
                    {billingCycle === 'annual' && (
                        <p className="pricing-copy mt-3 text-sm text-emerald-300">Annual plans include roughly 20% savings.</p>
                    )}
                </div>

                {!loading && subscription && (
                    <div className="pricing-copy mb-8 rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-sm text-slate-300">
                        Current plan: <span className="font-semibold text-white">{subscription.planLabel || formatPlanName(subscription.plan)}</span>
                        {subscription.billingCycle ? ` | ${formatBillingCycle(subscription.billingCycle)}` : ''}
                        {subscription.planExpiry ? ` | expires ${new Date(subscription.planExpiry).toLocaleDateString('en-IN')}` : ''}
                    </div>
                )}

                <div className="grid gap-6 lg:grid-cols-3">
                    {Object.entries(plans).map(([planKey, plan]) => {
                        const isCurrentPlan = subscription?.plan === planKey
                        const price = billingCycle === 'annual' ? plan.annual : plan.monthly

                        return (
                            <div
                                key={planKey}
                                className={`rounded-[28px] border p-6 shadow-[0_28px_80px_rgba(2,6,23,0.35)] ${planKey === 'elite' ? 'border-amber-300/25 bg-[linear-gradient(180deg,rgba(245,158,11,0.16),rgba(255,255,255,0.04))]' : 'border-white/10 bg-white/[0.04]'}`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="pricing-title text-2xl font-bold text-white">{formatPlanName(planKey)}</p>
                                        <p className="pricing-copy mt-2 text-sm text-slate-400">{plan.caption}</p>
                                    </div>
                                    {isCurrentPlan && (
                                        <span className="pricing-copy rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                                            Current Plan
                                        </span>
                                    )}
                                </div>

                                <div className="mt-8">
                                    <div className="flex items-end gap-2">
                                        <span className="pricing-title text-5xl font-black text-white">{price === 0 ? 'Free' : `Rs ${price}`}</span>
                                        {price !== 0 && (
                                            <span className="pricing-copy pb-2 text-sm text-slate-400">/{billingCycle === 'annual' ? 'year' : 'month'}</span>
                                        )}
                                    </div>
                                    {billingCycle === 'annual' && annualSavings[planKey] > 0 && (
                                        <p className="pricing-copy mt-2 text-sm text-emerald-300">Save Rs {annualSavings[planKey].toLocaleString('en-IN')} per year</p>
                                    )}
                                </div>

                                <div className="pricing-copy mt-8 space-y-3">
                                    {plan.features.map(([label, value]) => (
                                        <div key={label} className="flex items-start justify-between gap-4 rounded-2xl border border-white/8 bg-slate-950/30 px-4 py-3">
                                            <span className="text-sm text-slate-200">{label}</span>
                                            <span className="text-right text-sm font-semibold text-white">{value}</span>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    type="button"
                                    disabled={isCurrentPlan || !!subscribingPlan}
                                    onClick={() => handleSubscribe(planKey)}
                                    className={`pricing-copy mt-8 w-full rounded-2xl px-5 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${planKey === 'elite' ? 'bg-[linear-gradient(135deg,#f59e0b,#f97316)]' : 'bg-[linear-gradient(135deg,#378ADD,#0ea5e9)]'}`}
                                >
                                    {isCurrentPlan ? 'Current Plan' : subscribingPlan === planKey ? 'Opening checkout...' : `Subscribe to ${formatPlanName(planKey)}`}
                                </button>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

export default Pricing
