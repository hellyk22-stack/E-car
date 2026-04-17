import axiosInstance from './axiosInstance'

export const EXPLORER_FALLBACK = {
    plan: 'explorer',
    planLabel: 'Explorer',
    planExpiry: null,
    billingCycle: null,
    limits: {
        smartCompareLimit: 3,
        aiChatsPerDay: 3,
        wishlistLimit: 5,
        activeBookingsLimit: 1,
        priceHistory: false,
        exportPDF: false,
        exportExcel: false,
        priorityShowroom: false,
        priceAlerts: false,
        earlyAccess: false,
    },
    usage: {
        aiChatsToday: 0,
        aiChatsLimit: 3,
        activeBookingsCount: 0,
        activeBookingsLimit: 1,
        wishlistCount: 0,
        wishlistLimit: 5,
    },
}

export const formatPlanName = (plan) => {
    if (plan === 'pro_buyer') return 'Pro Buyer'
    if (plan === 'elite') return 'Elite'
    return 'Explorer'
}

export const formatBillingCycle = (billingCycle) => {
    if (billingCycle === 'annual') return 'Annual'
    if (billingCycle === 'monthly') return 'Monthly'
    return 'Not active'
}

export const isUnlimitedLimit = (value) => value === 'unlimited' || value === Infinity

export const formatLimitValue = (value) => isUnlimitedLimit(value) ? 'Unlimited' : value

export const formatCurrencyFromPaise = (value) => `Rs ${Math.round((value || 0) / 100).toLocaleString('en-IN')}`

export const daysUntilExpiry = (value) => {
    if (!value) return null
    const now = new Date()
    const expiry = new Date(value)
    const diff = expiry.getTime() - now.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export const fetchSubscriptionStatus = async () => {
    try {
        const res = await axiosInstance.get('/payment/status')
        return { ...EXPLORER_FALLBACK, ...(res.data.data || {}) }
    } catch (_error) {
        return EXPLORER_FALLBACK
    }
}

export const loadRazorpay = async () => {
    if (window.Razorpay) {
        return window.Razorpay
    }

    const existing = document.querySelector('script[data-razorpay="true"]')
    if (existing) {
        await new Promise((resolve, reject) => {
            existing.addEventListener('load', resolve, { once: true })
            existing.addEventListener('error', reject, { once: true })
        })
        return window.Razorpay
    }

    await new Promise((resolve, reject) => {
        const script = document.createElement('script')
        script.src = 'https://checkout.razorpay.com/v1/checkout.js'
        script.async = true
        script.dataset.razorpay = 'true'
        script.onload = resolve
        script.onerror = reject
        document.body.appendChild(script)
    })

    return window.Razorpay
}
