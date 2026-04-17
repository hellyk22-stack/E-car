export const DEFAULT_OPEN_TIME = "10:00 AM"
export const DEFAULT_CLOSE_TIME = "07:00 PM"
export const DEFAULT_SLOT_TIMES = [
    "10:00 AM",
    "11:00 AM",
    "12:00 PM",
    "01:00 PM",
    "02:00 PM",
    "03:00 PM",
    "04:00 PM",
    "05:00 PM",
    "06:00 PM",
]

export const parseTimeLabel = (value) => {
    const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
    if (!match) return null

    const [, rawHour, rawMinute, rawMeridiem] = match
    let hour = Number(rawHour)
    const minute = Number(rawMinute)
    const meridiem = rawMeridiem.toUpperCase()

    if (meridiem === "PM" && hour !== 12) hour += 12
    if (meridiem === "AM" && hour === 12) hour = 0

    return hour * 60 + minute
}

export const formatMinutes = (minutes) => {
    const safeMinutes = Math.max(Number(minutes) || 0, 0)
    const hour24 = Math.floor(safeMinutes / 60) % 24
    const minute = safeMinutes % 60
    const meridiem = hour24 >= 12 ? "PM" : "AM"
    const hour12 = hour24 % 12 || 12

    return `${String(hour12).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${meridiem}`
}

export const generateSlotTimes = (openTime, closeTime) => {
    const openMinutes = parseTimeLabel(openTime || DEFAULT_OPEN_TIME)
    const closeMinutes = parseTimeLabel(closeTime || DEFAULT_CLOSE_TIME)

    if (openMinutes === null || closeMinutes === null || closeMinutes <= openMinutes) {
        return DEFAULT_SLOT_TIMES
    }

    const slots = []
    for (let cursor = openMinutes; cursor < closeMinutes; cursor += 60) {
        slots.push(formatMinutes(cursor))
    }

    return slots.length ? slots : DEFAULT_SLOT_TIMES
}

export const sortSlotTimes = (items) => {
    return [...items].sort((left, right) => {
        const leftMin = parseTimeLabel(left) || 0
        const rightMin = parseTimeLabel(right) || 0
        return leftMin - rightMin
    })
}
