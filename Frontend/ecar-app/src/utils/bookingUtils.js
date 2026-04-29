export const formatCurrency = (value) => `Rs ${Math.round(Number(value || 0)).toLocaleString('en-IN')}`

export const formatDate = (value, options = {}) =>
    value
        ? new Date(value).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            ...options,
        })
        : '--'

export const formatDateTimeLabel = (date, time) => `${formatDate(date)}${time ? ` at ${time}` : ''}`
export const formatDateInputValue = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '')

export const normalizeBookingType = (bookingType) => {
    if (bookingType === 'home_delivery' || bookingType === 'home') return 'home'
    if (bookingType === 'at_showroom' || bookingType === 'showroom') return 'showroom'
    return bookingType || ''
}

export const getStatusTone = (status) => {
    const tones = {
        pending: { bg: 'rgba(245,158,11,0.14)', border: 'rgba(245,158,11,0.28)', color: '#fbbf24' },
        confirmed: { bg: 'rgba(59,130,246,0.14)', border: 'rgba(59,130,246,0.28)', color: '#93c5fd' },
        completed: { bg: 'rgba(16,185,129,0.14)', border: 'rgba(16,185,129,0.28)', color: '#6ee7b7' },
        cancelled: { bg: 'rgba(239,68,68,0.14)', border: 'rgba(239,68,68,0.28)', color: '#fca5a5' },
        rejected: { bg: 'rgba(239,68,68,0.14)', border: 'rgba(239,68,68,0.28)', color: '#fca5a5' },
    }

    return tones[status] || tones.pending
}

export const statusLabels = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    completed: 'Completed',
    cancelled: 'Cancelled',
    rejected: 'Rejected',
}

export const bookingTypeLabels = {
    showroom: 'Showroom drive',
    home: 'Home drive',
    at_showroom: 'Showroom drive',
    home_delivery: 'Home drive',
}

export const timelineSteps = [
    { key: 'pending', label: 'Submitted', icon: '1' },
    { key: 'awaiting_confirmation', label: 'Waiting For Showroom Confirmation', icon: '2' },
    { key: 'confirmed', label: 'Appointment Confirmed', icon: '3' },
    { key: 'completed', label: 'Test Drive Completed', icon: '4' },
]

export const getTimelineState = (status) => {
    if (status === 'cancelled' || status === 'rejected') return 'failed'
    if (status === 'completed') return 'completed'
    if (status === 'confirmed') return 'confirmed'
    return 'pending'
}

export const getBookingTypeTone = (bookingType) => {
    if (normalizeBookingType(bookingType) === 'home') {
        return {
            bg: 'rgba(37,99,235,0.14)',
            border: 'rgba(96,165,250,0.28)',
            color: '#bfdbfe',
        }
    }

    return {
        bg: 'rgba(5,150,105,0.14)',
        border: 'rgba(16,185,129,0.28)',
        color: '#a7f3d0',
    }
}

export const getBookingLocationTitle = (booking) =>
    normalizeBookingType(booking?.bookingType) === 'home' ? 'Address' : 'Showroom'

export const getBookingLocationLabel = (booking) => {
    if (normalizeBookingType(booking?.bookingType) === 'home') {
        const parts = [booking?.userDetails?.address, booking?.userDetails?.pincode].filter(Boolean)
        return parts.join(', ') || '--'
    }

    const showroomAddress = [
        booking?.showroom?.name,
        booking?.showroom?.address?.street,
        booking?.showroom?.address?.city,
    ].filter(Boolean)

    return showroomAddress.join(', ') || booking?.showroom?.name || '--'
}

export const bookingProgressSteps = [
    { key: 'pending', label: 'Pending' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'completed', label: 'Completed' },
]

export const getBookingProgressIndex = (status) => {
    if (status === 'completed') return 2
    if (status === 'confirmed') return 1
    return 0
}

export const buildBookingReceipt = (booking) => {
    const lines = [
        'E-CAR TEST DRIVE RECEIPT',
        '------------------------',
        `Booking ID: ${booking.bookingId}`,
        `Status: ${statusLabels[booking.status] || booking.status}`,
        `Car: ${booking.car?.name || '--'}`,
        `${getBookingLocationTitle(booking)}: ${getBookingLocationLabel(booking)}`,
        `Type: ${bookingTypeLabels[booking.bookingType] || booking.bookingType || '--'}`,
        `Date & Time: ${formatDateTimeLabel(booking.scheduledDate, booking.scheduledTime)}`,
        `Customer: ${booking.userDetails?.fullName || '--'}`,
        `Phone: ${booking.userDetails?.phone || '--'}`,
        `License: ${booking.userDetails?.drivingLicense?.number || '--'}`,
        `Assigned Staff: ${booking.assignedStaff?.name || '--'}${booking.assignedStaff?.phone ? ` (${booking.assignedStaff.phone})` : ''}`,
    ]

    return lines.join('\n')
}

export const downloadBookingReceipt = (booking) => {
    const blob = new Blob([buildBookingReceipt(booking)], { type: 'text/plain;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${booking.bookingId || 'test-drive-receipt'}.txt`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
}
