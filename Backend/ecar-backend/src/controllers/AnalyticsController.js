const UserModel = require("../models/UserModel")
const CarModel = require("../models/CarModel")
const WishlistModel = require("../models/WishlistModel")
const CarViewEventModel = require("../models/CarViewEventModel")
const SearchEventModel = require("../models/SearchEventModel")
const AIChatSessionModel = require("../models/AIChatSessionModel")
const { sendCsv } = require("../utils/CsvUtil")

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

const startOfDay = (value = new Date()) => {
    const date = new Date(value)
    date.setHours(0, 0, 0, 0)
    return date
}

const getRangeStart = (period = "week") => {
    const now = new Date()
    const start = startOfDay(now)

    if (period === "month") {
        start.setDate(start.getDate() - 29)
        return start
    }

    start.setDate(start.getDate() - 6)
    return start
}

const buildPriceRangeLabel = (maxPrice) => {
    const value = Number(maxPrice || 0)
    if (!value) return "No price cap"
    if (value <= 500000) return "Up to 5L"
    if (value <= 1000000) return "5L - 10L"
    if (value <= 2000000) return "10L - 20L"
    if (value <= 4000000) return "20L - 40L"
    return "40L+"
}

const getTopViewedCars = async (period = "week", limit = 10) => {
    const start = getRangeStart(period)

    return CarViewEventModel.aggregate([
        { $match: { viewedAt: { $gte: start } } },
        {
            $group: {
                _id: "$carId",
                views: { $sum: 1 },
                uniqueUsers: { $addToSet: "$userId" },
            },
        },
        {
            $lookup: {
                from: "cars",
                localField: "_id",
                foreignField: "_id",
                as: "car",
            },
        },
        { $unwind: "$car" },
        {
            $project: {
                _id: "$car._id",
                name: "$car.name",
                brand: "$car.brand",
                type: "$car.type",
                fuel: "$car.fuel",
                price: "$car.price",
                image: "$car.image",
                views: 1,
                uniqueUsers: { $size: "$uniqueUsers" },
            },
        },
        { $sort: { views: -1, uniqueUsers: -1, name: 1 } },
        { $limit: limit },
    ])
}

const getSearchInsightsData = async (period = "week") => {
    const since = getRangeStart(period)
    const [brands, types, priceRanges, recentSearches] = await Promise.all([
        SearchEventModel.aggregate([
            { $match: { searchedAt: { $gte: since }, brand: { $ne: "" } } },
            { $group: { _id: { $toLower: "$brand" }, count: { $sum: 1 } } },
            { $sort: { count: -1, _id: 1 } },
            { $limit: 8 },
        ]),
        SearchEventModel.aggregate([
            { $match: { searchedAt: { $gte: since }, type: { $ne: "" } } },
            { $group: { _id: "$type", count: { $sum: 1 } } },
            { $sort: { count: -1, _id: 1 } },
            { $limit: 8 },
        ]),
        SearchEventModel.aggregate([
            { $match: { searchedAt: { $gte: since }, priceRangeLabel: { $ne: "" } } },
            { $group: { _id: "$priceRangeLabel", count: { $sum: 1 } } },
            { $sort: { count: -1, _id: 1 } },
            { $limit: 8 },
        ]),
        SearchEventModel.find({ searchedAt: { $gte: since } })
            .sort({ searchedAt: -1 })
            .limit(10)
            .select("brand type fuel transmission maxPrice priceRangeLabel queryText searchedAt")
            .lean(),
    ])

    return {
        brands: brands.map((item) => ({ label: item._id, value: item.count })),
        types: types.map((item) => ({ label: item._id, value: item.count })),
        priceRanges: priceRanges.map((item) => ({ label: item._id, value: item.count })),
        recentSearches,
    }
}

const getWishlistLeaderboardData = async (limit = 10) => {
    return WishlistModel.aggregate([
        { $group: { _id: "$carId", saves: { $sum: 1 } } },
        {
            $lookup: {
                from: "cars",
                localField: "_id",
                foreignField: "_id",
                as: "car",
            },
        },
        { $unwind: "$car" },
        {
            $project: {
                _id: "$car._id",
                name: "$car.name",
                brand: "$car.brand",
                type: "$car.type",
                fuel: "$car.fuel",
                price: "$car.price",
                image: "$car.image",
                saves: 1,
            },
        },
        { $sort: { saves: -1, name: 1 } },
        { $limit: limit },
    ])
}

const logCarView = async (req, res) => {
    try {
        const { carId } = req.body || {}
        if (!carId) {
            return res.status(400).json({ message: "carId is required" })
        }

        await CarViewEventModel.create({
            userId: req.user.id,
            carId,
            viewedAt: new Date(),
        })

        return res.status(201).json({ message: "Car view logged" })
    } catch (err) {
        return res.status(500).json({ message: "Error while logging car view", err })
    }
}

const logSearch = async (req, res) => {
    try {
        const { brand, type, fuel, transmission, maxPrice, queryText } = req.body || {}

        await SearchEventModel.create({
            userId: req.user.id,
            brand: String(brand || "").trim(),
            type: String(type || "").trim(),
            fuel: String(fuel || "").trim(),
            transmission: String(transmission || "").trim(),
            maxPrice: maxPrice === "" || maxPrice === null || typeof maxPrice === "undefined" ? null : Number(maxPrice),
            priceRangeLabel: buildPriceRangeLabel(maxPrice),
            queryText: String(queryText || "").trim(),
            searchedAt: new Date(),
        })

        return res.status(201).json({ message: "Search logged" })
    } catch (err) {
        return res.status(500).json({ message: "Error while logging search", err })
    }
}

const getDashboardAnalytics = async (req, res) => {
    try {
        const today = startOfDay(new Date())
        const signupStart = getRangeStart("week")

        const [
            totalUsers,
            totalCars,
            totalWishlists,
            aiTodayAgg,
            signupsAgg,
            typeDistribution,
            topViewedWeek,
            topViewedMonth,
            wishlistLeaderboard,
        ] = await Promise.all([
            UserModel.countDocuments({ status: { $ne: "deleted" } }),
            CarModel.countDocuments({ status: { $ne: "inactive" } }),
            WishlistModel.countDocuments(),
            AIChatSessionModel.aggregate([
                { $unwind: "$messages" },
                { $match: { "messages.role": "user", "messages.createdAt": { $gte: today } } },
                { $count: "count" },
            ]),
            UserModel.aggregate([
                { $match: { createdAt: { $gte: signupStart } } },
                {
                    $group: {
                        _id: {
                            $dateToString: {
                                format: "%Y-%m-%d",
                                date: "$createdAt",
                                timezone: "Asia/Kolkata",
                            },
                        },
                        count: { $sum: 1 },
                    },
                },
                { $sort: { _id: 1 } },
            ]),
            CarModel.aggregate([
                { $match: { status: { $ne: "inactive" } } },
                { $group: { _id: "$type", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
            ]),
            getTopViewedCars("week", 5),
            getTopViewedCars("month", 5),
            getWishlistLeaderboardData(5),
        ])

        const signupsByDay = Array.from({ length: 7 }, (_, index) => {
            const date = new Date(signupStart)
            date.setDate(signupStart.getDate() + index)
            const key = date.toLocaleDateString("en-CA")
            const match = signupsAgg.find((item) => item._id === key)
            return {
                date: key,
                label: DAY_NAMES[date.getDay()],
                count: match?.count || 0,
            }
        })

        return res.json({
            message: "Analytics dashboard",
            data: {
                totals: {
                    totalUsers,
                    totalCars,
                    totalWishlists,
                    aiChatsToday: aiTodayAgg[0]?.count || 0,
                },
                signupsByDay,
                carTypeDistribution: typeDistribution.map((item) => ({ label: item._id || "Unknown", value: item.count })),
                topViewedWeek,
                topViewedMonth,
                wishlistLeaderboard,
            },
        })
    } catch (err) {
        return res.status(500).json({ message: "Error while fetching dashboard analytics", err })
    }
}

const getMostViewedCarsReport = async (req, res) => {
    try {
        const period = req.query.period === "month" ? "month" : "week"
        const data = await getTopViewedCars(period, 10)
        return res.json({ message: "Most viewed cars", data, meta: { period } })
    } catch (err) {
        return res.status(500).json({ message: "Error while fetching most viewed report", err })
    }
}

const exportMostViewedCsv = async (req, res) => {
    try {
        const period = req.query.period === "month" ? "month" : "week"
        const data = await getTopViewedCars(period, 100)
        return sendCsv(res, `most-viewed-${period}.csv`, [
            { key: "name", label: "Car Name" },
            { key: "brand", label: "Brand" },
            { key: "type", label: "Type" },
            { key: "fuel", label: "Fuel" },
            { key: "price", label: "Price" },
            { key: "views", label: "Views" },
            { key: "uniqueUsers", label: "Unique Users" },
        ], data)
    } catch (err) {
        return res.status(500).json({ message: "Error while exporting most viewed csv", err })
    }
}

const getSearchKeywordInsights = async (req, res) => {
    try {
        const period = req.query.period === "month" ? "month" : "week"
        const data = await getSearchInsightsData(period)
        return res.json({ message: "Search keyword insights", data, meta: { period } })
    } catch (err) {
        return res.status(500).json({ message: "Error while fetching search insights", err })
    }
}

const exportSearchInsightsCsv = async (req, res) => {
    try {
        const period = req.query.period === "month" ? "month" : "week"
        const data = await getSearchInsightsData(period)
        return sendCsv(res, `search-insights-${period}.csv`, [
            { key: "searchedAt", label: "Searched At" },
            { key: "queryText", label: "Query" },
            { key: "brand", label: "Brand" },
            { key: "type", label: "Type" },
            { key: "fuel", label: "Fuel" },
            { key: "transmission", label: "Transmission" },
            { key: "priceRangeLabel", label: "Price Range" },
            { key: "maxPrice", label: "Max Price" },
        ], data.recentSearches.map((item) => ({
            ...item,
            searchedAt: item.searchedAt ? new Date(item.searchedAt).toISOString() : "",
        })))
    } catch (err) {
        return res.status(500).json({ message: "Error while exporting search insights csv", err })
    }
}

const getWishlistLeaderboard = async (req, res) => {
    try {
        const data = await getWishlistLeaderboardData(10)
        return res.json({ message: "Wishlist leaderboard", data })
    } catch (err) {
        return res.status(500).json({ message: "Error while fetching wishlist leaderboard", err })
    }
}

const exportWishlistLeaderboardCsv = async (req, res) => {
    try {
        const data = await getWishlistLeaderboardData(100)
        return sendCsv(res, "wishlist-leaderboard.csv", [
            { key: "name", label: "Car Name" },
            { key: "brand", label: "Brand" },
            { key: "type", label: "Type" },
            { key: "fuel", label: "Fuel" },
            { key: "price", label: "Price" },
            { key: "saves", label: "Wishlist Saves" },
        ], data)
    } catch (err) {
        return res.status(500).json({ message: "Error while exporting wishlist leaderboard csv", err })
    }
}

module.exports = {
    logCarView,
    logSearch,
    getDashboardAnalytics,
    getMostViewedCarsReport,
    exportMostViewedCsv,
    getSearchKeywordInsights,
    exportSearchInsightsCsv,
    getWishlistLeaderboard,
    exportWishlistLeaderboardCsv,
}