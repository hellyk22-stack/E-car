import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import { connectDb } from './config/db.js'
import showroomAuthRoutes from './routes/showroomAuth.js'
import showroomRoutes from './routes/showroom.js'
import adminRoutes from './routes/admin.js'
import userRoutes from './routes/user.js'
import paymentRoutes from './routes/payment.js'
import carRoutes from './routes/car.js'
import aiRoutes from './routes/ai.js'
import wishlistRoutes from './routes/wishlist.js'
import notificationRoutes from './routes/notification.js'
import { startPriceAlertCron } from './utils/priceAlertCron.js'

const requiredEnvVars = ['MONGO_URL', 'JWT_SECRET']
const missingEnvVars = requiredEnvVars.filter((name) => !process.env[name]?.trim())

if (missingEnvVars.length > 0) {
    console.error(
        `Startup error: missing required environment variable(s): ${missingEnvVars.join(', ')}`
    )
    process.exit(1)
}

const app = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(morgan('dev'))

app.get('/health', (_req, res) => {
    res.json({ success: true, data: { status: 'ok' } })
})

app.use('/showroom', showroomAuthRoutes)
app.use('/showroom', showroomRoutes)
app.use('/admin', adminRoutes)
app.use('/user', userRoutes)
app.use('/payment', paymentRoutes)
app.use('/car', carRoutes)
app.use('/ai', aiRoutes)
app.use('/wishlist', wishlistRoutes)
app.use('/notification', notificationRoutes)

app.use((err, _req, res, _next) => {
    console.error(err)
    const message = err.message || 'Something went wrong'
    res.status(500).json({ success: false, message })
})

const port = Number(process.env.PORT || 3000)

connectDb()
    .then(() => {
        startPriceAlertCron()
        app.listen(port, () => {
            console.log(`E-CAR server running on port ${port}`)
        })
    })
    .catch((error) => {
        console.error('Failed to start server', error)
        process.exit(1)
    })
