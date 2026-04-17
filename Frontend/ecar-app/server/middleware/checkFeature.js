import User from '../models/User.js'
import {
    getMidnightWindow,
    getPlanKey,
    getPlanLimits,
    hasPlanAccess,
    inferRequiredPlanForFeature,
    isUnlimited,
    syncExpiredPlan,
} from '../utils/subscriptionHelpers.js'

export const attachPlanContext = async (req, res, next) => {
    if (!req.user?.id) {
        return res.status(401).json({ success: false, message: 'Authentication required' })
    }

    const accountUser = await User.findById(req.user.id)
    if (!accountUser) {
        return res.status(404).json({ success: false, message: 'User not found' })
    }

    await syncExpiredPlan(accountUser)

    req.accountUser = accountUser
    req.userPlan = getPlanKey(accountUser.plan)
    req.planLimits = getPlanLimits(accountUser.plan)

    return next()
}

export const checkFeature = (featureName) => async (req, res, next) => {
    if (!req.accountUser) {
        const user = await User.findById(req.user?.id)
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' })
        }
        await syncExpiredPlan(user)
        req.accountUser = user
        req.userPlan = getPlanKey(user.plan)
        req.planLimits = getPlanLimits(user.plan)
    }

    const allowed = req.planLimits?.[featureName]
    if (allowed === true || (typeof allowed === 'number' && allowed > 0) || isUnlimited(allowed)) {
        return next()
    }

    return res.status(403).json({
        success: false,
        message: 'Upgrade required',
        requiredPlan: inferRequiredPlanForFeature(featureName),
        feature: featureName,
    })
}

export const checkAiChatLimit = async (req, res, next) => {
    if (!req.accountUser) {
        const user = await User.findById(req.user?.id)
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' })
        }
        await syncExpiredPlan(user)
        req.accountUser = user
        req.userPlan = getPlanKey(user.plan)
        req.planLimits = getPlanLimits(user.plan)
    }

    const user = req.accountUser
    const limits = req.planLimits
    const { todayMidnight, tomorrowMidnight } = getMidnightWindow()

    if (!user.aiChatsResetAt || new Date(user.aiChatsResetAt) < todayMidnight) {
        user.aiChatsToday = 0
        user.aiChatsResetAt = tomorrowMidnight
        await user.save()
    }

    const dailyLimit = limits.aiChatsPerDay
    if (!isUnlimited(dailyLimit) && user.aiChatsToday >= dailyLimit) {
        return res.status(429).json({
            success: false,
            message: 'Daily AI chat limit reached',
            resetsAt: tomorrowMidnight,
            requiredPlan: 'pro_buyer',
            feature: 'aiChatsPerDay',
        })
    }

    req.aiLimitInfo = {
        limit: dailyLimit,
        used: user.aiChatsToday,
        remainingBeforeReply: isUnlimited(dailyLimit) ? 'unlimited' : Math.max(dailyLimit - user.aiChatsToday, 0),
        resetsAt: user.aiChatsResetAt || tomorrowMidnight,
    }

    return next()
}
