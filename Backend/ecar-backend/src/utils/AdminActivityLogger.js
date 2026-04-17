const UserModel = require("../models/UserModel")
const AdminActivityLogModel = require("../models/AdminActivityLogModel")

const logAdminActivity = async ({ actorId, action, entityType, entityId = "", description, metadata = {} }) => {
    if (!actorId || !action || !entityType || !description) return null

    let actorName = "Admin"
    try {
        const actor = await UserModel.findById(actorId).select("name").lean()
        actorName = actor?.name || actorName
    } catch (err) {
        console.error("Failed to resolve admin name for activity log", err)
    }

    try {
        return await AdminActivityLogModel.create({
            actorId,
            actorName,
            action,
            entityType,
            entityId: entityId ? String(entityId) : "",
            description,
            metadata,
        })
    } catch (err) {
        console.error("Failed to write admin activity log", err)
        return null
    }
}

module.exports = {
    logAdminActivity,
}