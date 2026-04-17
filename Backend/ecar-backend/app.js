const express = require("express")
const cors = require("cors")
const app = express()
require("dotenv").config()

const dbConnection = require("./src/utils/DBConnection")
dbConnection()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use(cors({
    origin: true,
    credentials: true
}))

const userRoutes = require("./src/routes/UserRoutes")
const userShowroomRoutes = require("./src/routes/UserShowroomRoutes")
const carRoutes = require("./src/routes/CarRoutes")
const comparisonRoutes = require("./src/routes/ComparisonRoutes")
const showroomRoutes = require("./src/routes/ShowroomRoutes")
const aiRoutes = require("./src/routes/AIRoutes")
const reviewRoutes = require("./src/routes/ReviewRoutes")
const wishlistRoutes = require("./src/routes/WishlistRoutes")
const analyticsRoutes = require("./src/routes/AnalyticsRoutes")
const notificationRoutes = require("./src/routes/NotificationRoutes")
const systemRoutes = require("./src/routes/SystemRoutes")
const adminShowroomRoutes = require("./src/routes/AdminShowroomRoutes")

app.use("/user", userRoutes)
app.use("/user", userShowroomRoutes)
app.use("/car", carRoutes)
app.use("/compare", comparisonRoutes)
app.use("/showroom", showroomRoutes)
app.use("/ai", aiRoutes)
app.use("/review", reviewRoutes)
app.use("/wishlist", wishlistRoutes)
app.use("/analytics", analyticsRoutes)
app.use("/notification", notificationRoutes)
app.use("/system", systemRoutes)
app.use("/admin", adminShowroomRoutes)

app.get("/test", (req, res) => {
    res.json({ message: "E-CAR backend running!!" })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
    console.log(`Server started on PORT ${PORT}`)
})
