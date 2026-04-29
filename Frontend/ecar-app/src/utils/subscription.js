import axiosInstance from './axiosInstance'
import { getRole, isAuthenticated } from './auth'

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

export const buildPlanFeatureRows = (limits = {}) => {
    const rows = [
        ['Smart Compare', isUnlimitedLimit(limits.smartCompareLimit) ? 'Unlimited' : `${limits.smartCompareLimit || 0} smart comparisons`],
        ['Basic Compare', 'Unlimited'],
        ['AI Advisor', isUnlimitedLimit(limits.aiChatsPerDay) ? 'Unlimited' : `${limits.aiChatsPerDay || 0} chats per day`],
        ['Wishlist', isUnlimitedLimit(limits.wishlistLimit) ? 'Unlimited' : `${limits.wishlistLimit || 0} saved cars`],
        ['Test Drives', isUnlimitedLimit(limits.activeBookingsLimit) ? 'Unlimited' : `${limits.activeBookingsLimit || 0} active bookings`],
        ['Price History Chart', limits.priceHistory ? 'Yes' : 'No'],
        ['Export Comparison PDF', limits.exportPDF ? 'Yes' : 'No'],
        ['Export Comparison Excel', limits.exportExcel ? 'Yes' : 'No'],
        ['Price Drop Alerts', limits.priceAlerts ? 'Yes' : 'No'],
    ]

    if (limits.priorityShowroom) rows.push(['Priority Showrooms', 'Yes'])
    if (limits.earlyAccess) rows.push(['Early Access', 'Yes'])

    return rows
}

export const fetchSubscriptionStatus = async () => {
    if (!isAuthenticated() || getRole() !== 'user') {
        return EXPLORER_FALLBACK
    }

    try {
        const res = await axiosInstance.get('/payment/status')
        const data = res.data?.data || {}

        return {
            ...EXPLORER_FALLBACK,
            ...data,
            limits: {
                ...EXPLORER_FALLBACK.limits,
                ...(data.limits || {}),
            },
            usage: {
                ...EXPLORER_FALLBACK.usage,
                ...(data.usage || {}),
            },
        }
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
export const checkUsageWarnings = (usage = {}) => {
    const warnings = []
    
    // Check Wishlist (Warn if 1 slot remains)
    if (usage.wishlistLimit && !isUnlimitedLimit(usage.wishlistLimit)) {
        const remaining = usage.wishlistLimit - usage.wishlistCount
        if (remaining === 1) {
            warnings.push({
                type: 'wishlist',
                message: 'Wishlist almost full! You have only 1 slot left on your current plan.',
                severity: 'warning'
            })
        }
    }

    // Check Test Drives (Warn if 1 slot remains)
    if (usage.activeBookingsLimit && !isUnlimitedLimit(usage.activeBookingsLimit)) {
        const remaining = usage.activeBookingsLimit - usage.activeBookingsCount
        if (remaining === 1) {
            warnings.push({
                type: 'booking',
                message: 'Booking limit nearing! Only 1 active test drive slot remaining.',
                severity: 'warning'
            })
        }
    }

    // Check AI Chats (Warn at 80% usage)
    if (usage.aiChatsLimit && !isUnlimitedLimit(usage.aiChatsLimit)) {
        const ratio = usage.aiChatsToday / usage.aiChatsLimit
        if (ratio >= 0.8 && usage.aiChatsToday < usage.aiChatsLimit) {
            warnings.push({
                type: 'ai',
                message: `Daily AI limit diagnostic: You have used ${usage.aiChatsToday}/${usage.aiChatsLimit} of your daily chats.`,
                severity: 'info'
            })
        }
    }

    // Check Smart Comparisons (Warn if 1 slot remains)
    if (usage.savedComparisonsLimit && !isUnlimitedLimit(usage.savedComparisonsLimit)) {
        const remaining = usage.savedComparisonsLimit - usage.savedComparisonsCount
        if (remaining === 1) {
            warnings.push({
                type: 'compare',
                message: 'Comparison storage almost full! Only 1 saved comparison slot left.',
                severity: 'warning'
            })
        }
    }

    return warnings
}
