import Car from '../models/Car.js'
import PriceAlert from '../models/PriceAlert.js'
import User from '../models/User.js'
import { priceAlertTriggeredTemplate } from './emailTemplates.js'
import { sendEmailSafe } from './mailer.js'
import { logActivity } from './services.js'

let cronJobStarted = false

export const startPriceAlertCron = async () => {
    if (cronJobStarted) return

    try {
        const cronModule = await import('node-cron')
        const cron = cronModule.default || cronModule

        cron.schedule('0 */6 * * *', async () => {
            const alerts = await PriceAlert.find({ isTriggered: false })
                .populate('car')
                .populate('user', 'name email')

            await Promise.all(alerts.map(async (alert) => {
                const car = alert.car || await Car.findById(alert.car)
                if (!car || Number(car.price || 0) > Number(alert.targetPrice || 0)) {
                    return
                }

                alert.isTriggered = true
                alert.triggeredAt = new Date()
                await alert.save()

                const accountUser = alert.user || await User.findById(alert.user)
                if (!accountUser) return

                const carLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/user/car/${car._id}`
                await sendEmailSafe({
                    to: accountUser.email,
                    ...priceAlertTriggeredTemplate({
                        userName: accountUser.name,
                        carName: car.name,
                        currentPrice: car.price,
                        targetPrice: alert.targetPrice,
                        carLink,
                    }),
                })

                await logActivity({
                    actorId: accountUser._id,
                    actorRole: 'user',
                    action: 'PRICE_ALERT_TRIGGERED',
                    entityType: 'PriceAlert',
                    entityId: alert._id,
                    description: `Price alert triggered for ${car.name}`,
                    meta: { carId: car._id, targetPrice: alert.targetPrice, currentPrice: car.price },
                })
            }))
        })

        cronJobStarted = true
        console.log('Price alert cron scheduled every 6 hours')
    } catch (error) {
        console.error('Price alert cron not started', error.message)
    }
}
