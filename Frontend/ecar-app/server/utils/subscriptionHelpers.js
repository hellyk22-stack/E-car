import PLAN_LIMITS, {
    FEATURE_MIN_PLAN,
    PLAN_PRICING,
    getPlanKey,
    getPlanLabel,
    getPlanLimits,
    hasPlanAccess,
    isUnlimited,
    serializePlanLimits,
} from './planLimits.js'

export {
    PLAN_LIMITS,
    PLAN_PRICING,
    FEATURE_MIN_PLAN,
    getPlanKey,
    getPlanLabel,
    getPlanLimits,
    hasPlanAccess,
    isUnlimited,
    serializePlanLimits,
}

export const getBillingCycleLabel = (billingCycle) => billingCycle === 'annual' ? 'Annual' : 'Monthly'

export const calculateSubscriptionAmount = (plan, billingCycle) => {
    const resolvedPlan = getPlanKey(plan)
    const cycleConfig = PLAN_PRICING[resolvedPlan]
    if (!cycleConfig || !cycleConfig[billingCycle]) {
        throw new Error('Invalid plan or billing cycle')
    }

    return cycleConfig[billingCycle]
}

export const calculateSubscriptionEndDate = (startDate, billingCycle) => {
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + (billingCycle === 'annual' ? 365 : 30))
    return endDate
}

export const syncExpiredPlan = async (user) => {
    if (!user) return user

    let changed = false

    if (!user.plan || !PLAN_LIMITS[user.plan]) {
        user.plan = 'explorer'
        changed = true
    }
    if (user.billingCycle === undefined) {
        user.billingCycle = null
        changed = true
    }
    if (user.planExpiry === undefined) {
        user.planExpiry = null
        changed = true
    }

    if (user.plan && user.plan !== 'explorer' && user.planExpiry && new Date(user.planExpiry) < new Date()) {
        user.plan = 'explorer'
        user.planExpiry = null
        user.billingCycle = null
        changed = true
    }

    if (changed) {
        await user.save()
    }

    return user
}

export const getMidnightWindow = () => {
    const now = new Date()
    const todayMidnight = new Date(now)
    todayMidnight.setHours(0, 0, 0, 0)

    const tomorrowMidnight = new Date(todayMidnight)
    tomorrowMidnight.setDate(tomorrowMidnight.getDate() + 1)

    return { now, todayMidnight, tomorrowMidnight }
}

export const buildUsageSnapshot = ({ user, activeBookingsCount = 0 }) => {
    const limits = getPlanLimits(user?.plan)

    return {
        aiChatsToday: user?.aiChatsToday || 0,
        aiChatsLimit: isUnlimited(limits.aiChatsPerDay) ? 'unlimited' : limits.aiChatsPerDay,
        activeBookingsCount,
        activeBookingsLimit: isUnlimited(limits.activeBookingsLimit) ? 'unlimited' : limits.activeBookingsLimit,
        wishlistCount: user?.wishlistCount || 0,
        wishlistLimit: isUnlimited(limits.wishlistLimit) ? 'unlimited' : limits.wishlistLimit,
    }
}

export const inferRequiredPlanForFeature = (featureName) => FEATURE_MIN_PLAN[featureName] || 'pro_buyer'

export const sanitizePublicLimits = (plan) => serializePlanLimits(getPlanLimits(plan))
