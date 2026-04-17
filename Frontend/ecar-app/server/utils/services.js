import ActivityLog from '../models/ActivityLog.js'
import Notification from '../models/Notification.js'
import ShowroomAvailability from '../models/ShowroomAvailability.js'
import { normalizeDateOnly } from './api.js'

export const createNotification = (payload) => Notification.create(payload)

export const logActivity = (payload) => ActivityLog.create(payload)

export const reserveSlot = async ({ showroomId, date, time, bookingMongoId }) => {
    const day = normalizeDateOnly(date)
    const availability = await ShowroomAvailability.findOne({ showroom: showroomId, date: day })

    if (!availability) {
        throw new Error('Selected date is not available')
    }

    const slot = availability.slots.find((item) => item.time === time)
    if (!slot) {
        throw new Error('Selected time slot is unavailable')
    }
    if (slot.isBooked) {
        throw new Error('Selected time slot is already booked')
    }

    slot.isBooked = true
    slot.bookingId = bookingMongoId
    await availability.save()
}

export const releaseSlot = async ({ showroomId, date, time }) => {
    const day = normalizeDateOnly(date)
    const availability = await ShowroomAvailability.findOne({ showroom: showroomId, date: day })
    if (!availability) return

    const slot = availability.slots.find((item) => item.time === time)
    if (!slot) return

    slot.isBooked = false
    slot.bookingId = undefined
    await availability.save()
}
