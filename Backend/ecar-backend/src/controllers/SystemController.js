const AdminActivityLogModel = require("../models/AdminActivityLogModel")

const getActivityLogs = async (req, res) => {
    try {
        const page = Math.max(Number(req.query.page || 1), 1)
        const limit = Math.min(Math.max(Number(req.query.limit || 12), 1), 50)
        const search = String(req.query.search || "").trim()

        const query = search
            ? {
                $or: [
                    { action: { $regex: search, $options: "i" } },
                    { entityType: { $regex: search, $options: "i" } },
                    { description: { $regex: search, $options: "i" } },
                    { actorName: { $regex: search, $options: "i" } },
                ],
            }
            : {}

        const [total, logs] = await Promise.all([
            AdminActivityLogModel.countDocuments(query),
            AdminActivityLogModel.find(query)
                .sort({ createdAt: -1, _id: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
        ])

        return res.json({
            message: "Activity logs fetched",
            data: logs,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.max(Math.ceil(total / limit), 1),
                search,
            },
        })
    } catch (err) {
        return res.status(500).json({ message: "Error while fetching activity logs", err })
    }
}

module.exports = {
    getActivityLogs,
}