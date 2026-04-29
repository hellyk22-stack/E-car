const PLAN_LIMITS = {
    explorer: {
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
    pro_buyer: {
        smartCompareLimit: 10,
        aiChatsPerDay: 25,
        wishlistLimit: 25,
        activeBookingsLimit: 5,
        priceHistory: true,
        exportPDF: true,
        exportExcel: false,
        priorityShowroom: true,
        priceAlerts: true,
        earlyAccess: false,
    },
    elite: {
        smartCompareLimit: 'unlimited',
        aiChatsPerDay: 'unlimited',
        wishlistLimit: 'unlimited',
        activeBookingsLimit: 'unlimited',
        priceHistory: true,
        exportPDF: true,
        exportExcel: true,
        priorityShowroom: true,
        priceAlerts: true,
        earlyAccess: true,
    },
}

const getPlanLabel = (plan) => {
    if (plan === 'pro_buyer') return 'Pro Buyer'
    if (plan === 'elite') return 'Elite'
    return 'Explorer'
}

const isUnlimited = (value) => value === 'unlimited'

const getActiveSubscription = (user = {}) => {
    const storedPlan = user.subscription?.plan || 'explorer'
    const planExpiry = user.subscription?.planExpiry || null
    const billingCycle = user.subscription?.billingCycle || null
    const isExpired = !!(planExpiry && new Date(planExpiry) < new Date())
    const plan = isExpired ? 'explorer' : storedPlan
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.explorer

    return {
        storedPlan,
        plan,
        planLabel: getPlanLabel(plan),
        planExpiry: isExpired ? null : planExpiry,
        billingCycle: isExpired ? null : billingCycle,
        isExpired,
        isPremium: plan !== 'explorer',
        limits,
    }
}

module.exports = {
    PLAN_LIMITS,
    getPlanLabel,
    getActiveSubscription,
    isUnlimited,
}
