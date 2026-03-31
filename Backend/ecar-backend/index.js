const express = require("express")
const cors = require("cors")
const app = express()
require("dotenv").config()

const dbConnection = require("./src/utils/DBConnection")
dbConnection()

app.use(cors({
    origin:"http://localhost:5173",
    credentials: true
}))
app.use(express.json())

// Routes
const userRoutes = require("./src/routes/UserRoutes")
const carRoutes = require("./src/routes/CarRoutes")

app.use("/user", userRoutes)
app.use("/car", carRoutes)

app.get("/test", (req, res) => {
    res.json({ message: "E-CAR backend running!!" })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
    console.log(`server started on PORT ${PORT}`)
})