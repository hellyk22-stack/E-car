const NotificationModel = require("../models/NotificationModel")

const formatLocationLabel = (booking) => {
    if (booking?.bookingType === "home_delivery") {
        const parts = [
            booking?.userDetails?.address,
            booking?.userDetails?.pincode,
        ].filter(Boolean)
        return parts.join(", ") || "Home address will be shared after confirmation"
    }

    const parts = [
        booking?.showroomSnapshot?.name,
        booking?.showroomSnapshot?.address?.street,
        booking?.showroomSnapshot?.address?.city,
        booking?.showroomSnapshot?.address?.state,
        booking?.showroomSnapshot?.address?.pincode,
    ].filter(Boolean)
    return parts.join(", ") || "Showroom details unavailable"
}

const buildBookingNotificationData = (booking) => ({
    bookingId: String(booking?._id || ""),
    bookingCode: String(booking?.bookingId || ""),
    bookingStatus: String(booking?.status || ""),
    bookingType: String(booking?.bookingType || ""),
    showroomId: String(booking?.showroom || ""),
    showroomName: String(booking?.showroomSnapshot?.name || ""),
    carId: String(booking?.car || ""),
    carName: String(booking?.carSnapshot?.name || ""),
    scheduledDate: booking?.scheduledDate || null,
    scheduledTime: String(booking?.scheduledTime || ""),
    locationLabel: formatLocationLabel(booking),
})

const createBookingStatusNotification = async ({
    booking,
    actorId,
    actorName = "E-CAR Updates",
    title,
    message,
    type = "booking_status_updated",
}) => {
    if (!booking?.user || !title || !message) return null

    return NotificationModel.create({
        type,
        title: String(title).trim(),
        message: String(message).trim(),
        createdBy: actorId || booking.user,
        createdByName: String(actorName || "E-CAR Updates").trim() || "E-CAR Updates",
        audienceRoles: ["user"],
        audienceUsers: [booking.user],
        data: buildBookingNotificationData(booking),
    })
}

const createAdminBookingNotification = async ({
    booking,
    actorId,
    actorName = "E-CAR Updates",
    title,
    message,
    type = "booking_admin_update",
}) => {
    if (!booking?._id || !title || !message) return null

    return NotificationModel.create({
        type,
        title: String(title).trim(),
        message: String(message).trim(),
        createdBy: actorId || booking.user,
        createdByName: String(actorName || "E-CAR Updates").trim() || "E-CAR Updates",
        audienceRoles: ["admin"],
        audienceUsers: [],
        data: buildBookingNotificationData(booking),
    })
}

module.exports = {
    createBookingStatusNotification,
    createAdminBookingNotification,
}
