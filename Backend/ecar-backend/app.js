const express = require("express")
const cors = require("cors")
const app = express()
require("dotenv").config()

const dbConnection = require("./src/utils/DBConnection")
dbConnection()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use(cors({
    origin: function(origin, callback) {
        if (!origin || origin.startsWith("http://localhost")) {
            callback(null, true)
        } else {
            callback(new Error("Not allowed by CORS"))
        }
    },
    credentials: true
}))

const userRoutes = require("./src/routes/UserRoutes")
const carRoutes = require("./src/routes/CarRoutes")
const aiRoutes = require("./src/routes/AIRoutes")
const reviewRoutes = require("./src/routes/ReviewRoutes")
const wishlistRoutes = require("./src/routes/WishlistRoutes")
const analyticsRoutes = require("./src/routes/AnalyticsRoutes")

app.use("/user", userRoutes)
app.use("/car", carRoutes)
app.use("/ai", aiRoutes)
app.use("/review", reviewRoutes)
app.use("/wishlist", wishlistRoutes)
app.use("/analytics", analyticsRoutes)

app.get("/test", (req, res) => {
    res.json({ message: "E-CAR backend running!!" })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
    console.log(`Server started on PORT ${PORT}`)
})