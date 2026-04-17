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
        smartCompareLimit: 4,
        aiChatsPerDay: Infinity,
        wishlistLimit: Infinity,
        activeBookingsLimit: 3,
        priceHistory: true,
        exportPDF: true,
        exportExcel: false,
        priorityShowroom: false,
        priceAlerts: false,
        earlyAccess: false,
    },
    elite: {
        smartCompareLimit: 6,
        aiChatsPerDay: Infinity,
        wishlistLimit: Infinity,
        activeBookingsLimit: Infinity,
        priceHistory: true,
        exportPDF: true,
        exportExcel: true,
        priorityShowroom: true,
        priceAlerts: true,
        earlyAccess: true,
    },
}

export const PLAN_ORDER = ['explorer', 'pro_buyer', 'elite']

export const PLAN_PRICING = {
    pro_buyer: {
        monthly: 19900,
        annual: 191000,
    },
    elite: {
        monthly: 49900,
        annual: 479000,
    },
}

export const FEATURE_MIN_PLAN = {
    priceHistory: 'pro_buyer',
    exportPDF: 'pro_buyer',
    exportExcel: 'elite',
    priorityShowroom: 'elite',
    priceAlerts: 'elite',
    earlyAccess: 'elite',
}

export const getPlanKey = (plan) => (PLAN_LIMITS[plan] ? plan : 'explorer')

export const getPlanLimits = (plan) => PLAN_LIMITS[getPlanKey(plan)]

export const getPlanRank = (plan) => PLAN_ORDER.indexOf(getPlanKey(plan))

export const hasPlanAccess = (plan, requiredPlan) => getPlanRank(plan) >= getPlanRank(requiredPlan)

export const isUnlimited = (value) => value === Infinity

export const serializePlanLimits = (limits) => Object.fromEntries(
    Object.entries(limits).map(([key, value]) => [key, isUnlimited(value) ? 'unlimited' : value]),
)

export const getPlanLabel = (plan) => {
    if (plan === 'pro_buyer') return 'Pro Buyer'
    if (plan === 'elite') return 'Elite'
    return 'Explorer'
}

export default PLAN_LIMITS
