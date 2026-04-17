import ShowroomAvailability from '../models/ShowroomAvailability.js'
import Showroom from '../models/Showroom.js'
import { normalizeDateOnly } from './api.js'

export const DEFAULT_SHOWROOM_DAYS = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
]

export const DEFAULT_OPEN_TIME = '10:00 AM'
export const DEFAULT_CLOSE_TIME = '07:00 PM'
export const DEFAULT_SLOT_TIMES = [
    '10:00 AM',
    '11:00 AM',
    '12:00 PM',
    '01:00 PM',
    '02:00 PM',
    '03:00 PM',
    '04:00 PM',
    '05:00 PM',
    '06:00 PM',
]

const parseTimeLabel = (value) => {
    const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
    if (!match) return null

    const [, rawHour, rawMinute, rawMeridiem] = match
    let hour = Number(rawHour)
    const minute = Number(rawMinute)
    const meridiem = rawMeridiem.toUpperCase()

    if (meridiem === 'PM' && hour !== 12) hour += 12
    if (meridiem === 'AM' && hour === 12) hour = 0

    return hour * 60 + minute
}

const formatMinutes = (minutes) => {
    const safeMinutes = Math.max(Number(minutes) || 0, 0)
    const hour24 = Math.floor(safeMinutes / 60) % 24
    const minute = safeMinutes % 60
    const meridiem = hour24 >= 12 ? 'PM' : 'AM'
    const hour12 = hour24 % 12 || 12

    return `${String(hour12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${meridiem}`
}

export const getShowroomWorkingDays = (showroom) =>
    Array.isArray(showroom?.availableDays) && showroom.availableDays.length
        ? showroom.availableDays
        : DEFAULT_SHOWROOM_DAYS

export const getShowroomOpeningHours = (showroom) => ({
    open: showroom?.openingHours?.open || DEFAULT_OPEN_TIME,
    close: showroom?.openingHours?.close || DEFAULT_CLOSE_TIME,
})

export const buildSlotTimes = (openingHours = {}) => {
    const openMinutes = parseTimeLabel(openingHours.open || DEFAULT_OPEN_TIME)
    const closeMinutes = parseTimeLabel(openingHours.close || DEFAULT_CLOSE_TIME)

    if (openMinutes === null || closeMinutes === null || closeMinutes <= openMinutes) {
        return DEFAULT_SLOT_TIMES
    }

    const slots = []
    for (let cursor = openMinutes; cursor < closeMinutes; cursor += 60) {
        slots.push(formatMinutes(cursor))
    }

    return slots.length ? slots : DEFAULT_SLOT_TIMES
}

export const buildSlotRecords = (openingHours = {}) =>
    buildSlotTimes(openingHours).map((time) => ({ time, isBooked: false }))

const getWeekdayName = (date) =>
    new Date(date).toLocaleDateString('en-US', { weekday: 'long' })

export const ensureAvailabilityForDate = async ({ showroomId, date, showroom = null }) => {
    const day = normalizeDateOnly(date)
    const existing = await ShowroomAvailability.findOne({ showroom: showroomId, date: day })
    if (existing) return existing

    const resolvedShowroom = showroom || await Showroom.findById(showroomId)
    if (!resolvedShowroom) return null

    const workingDays = getShowroomWorkingDays(resolvedShowroom)
    if (!workingDays.includes(getWeekdayName(day))) {
        return null
    }

    try {
        return await ShowroomAvailability.create({
            showroom: showroomId,
            date: day,
            slots: buildSlotRecords(getShowroomOpeningHours(resolvedShowroom)),
        })
    } catch (error) {
        if (error?.code === 11000) {
            return ShowroomAvailability.findOne({ showroom: showroomId, date: day })
        }
        throw error
    }
}

export const seedUpcomingAvailability = async ({ showroomId, showroom = null, days = 14 }) => {
    const tasks = []
    const start = normalizeDateOnly(new Date())

    for (let offset = 0; offset < days; offset += 1) {
        const date = new Date(start)
        date.setDate(start.getDate() + offset)
        tasks.push(ensureAvailabilityForDate({ showroomId, date, showroom }))
    }

    return Promise.all(tasks)
}
