const renderShell = (title, body) => `
    <div style="font-family: Arial, sans-serif; background:#0f172a; padding:32px; color:#e2e8f0">
        <div style="max-width:640px; margin:0 auto; background:#111827; border:1px solid #334155; border-radius:20px; padding:32px">
            <p style="font-size:12px; letter-spacing:0.24em; text-transform:uppercase; color:#818cf8; margin:0 0 12px">E-CAR</p>
            <h1 style="margin:0 0 16px; color:#fff">${title}</h1>
            <div style="color:#cbd5e1; line-height:1.7">${body}</div>
        </div>
    </div>
`

export const showroomRegistrationReceivedTemplate = (showroomName) => ({
    subject: 'Showroom registration received',
    html: renderShell(
        'Registration received',
        `<p>Hello ${showroomName},</p><p>We received your showroom registration and it is now pending admin approval. We will notify you as soon as it is approved.</p>`,
    ),
})

export const showroomApprovedTemplate = (showroomName) => ({
    subject: 'Your showroom is approved',
    html: renderShell(
        'Welcome to E-CAR',
        `<p>Hello ${showroomName},</p><p>Your showroom has been approved. You can now log in, manage inventory, set availability, and respond to test drive bookings.</p>`,
    ),
})

export const userBookingConfirmationTemplate = ({ userName, bookingId, carName, date, time, showroomName, showroomAddress, staffName, staffPhone }) => ({
    subject: `Test drive confirmed: ${bookingId}`,
    html: renderShell(
        'Your test drive is confirmed',
        `
            <p>Hello ${userName},</p>
            <p>Your booking <strong>${bookingId}</strong> has been confirmed.</p>
            <p><strong>Car:</strong> ${carName}<br />
            <strong>Date:</strong> ${date}<br />
            <strong>Time:</strong> ${time}<br />
            <strong>Showroom:</strong> ${showroomName}<br />
            <strong>Address:</strong> ${showroomAddress}</p>
            <p><strong>Assigned staff:</strong> ${staffName || 'Will be shared soon'}${staffPhone ? ` (${staffPhone})` : ''}</p>
        `,
    ),
})

export const bookingRejectedTemplate = ({ userName, bookingId, reason }) => ({
    subject: `Booking update for ${bookingId}`,
    html: renderShell(
        'Your booking could not be confirmed',
        `<p>Hello ${userName},</p><p>Your booking <strong>${bookingId}</strong> was rejected.</p><p><strong>Reason:</strong> ${reason}</p>`,
    ),
})

export const bookingCompletedTemplate = ({ userName, bookingId, ratingLink }) => ({
    subject: `Rate your test drive for ${bookingId}`,
    html: renderShell(
        'How was your experience?',
        `<p>Hello ${userName},</p><p>Your test drive for booking <strong>${bookingId}</strong> has been marked complete.</p><p>Please rate your experience here: <a href="${ratingLink}" style="color:#a5b4fc">${ratingLink}</a></p>`,
    ),
})

export const subscriptionActivatedTemplate = ({ userName, planLabel, billingCycleLabel, amount, startDate, endDate, paymentId }) => ({
    subject: `${planLabel} plan activated`,
    html: renderShell(
        'Subscription confirmed',
        `
            <p>Hello ${userName},</p>
            <p>Your <strong>${planLabel}</strong> plan is now active.</p>
            <p><strong>Billing cycle:</strong> ${billingCycleLabel}<br />
            <strong>Amount paid:</strong> Rs ${Math.round((amount || 0) / 100).toLocaleString('en-IN')}<br />
            <strong>Payment ID:</strong> ${paymentId}<br />
            <strong>Starts:</strong> ${new Date(startDate).toLocaleDateString('en-IN')}<br />
            <strong>Expires:</strong> ${new Date(endDate).toLocaleDateString('en-IN')}</p>
        `,
    ),
})

export const subscriptionCancelledTemplate = ({ userName, planLabel }) => ({
    subject: `${planLabel} plan cancelled`,
    html: renderShell(
        'Subscription cancelled',
        `<p>Hello ${userName},</p><p>Your ${planLabel} plan has been cancelled and your account is now back on <strong>Explorer</strong>.</p>`,
    ),
})

export const priceAlertTriggeredTemplate = ({ userName, carName, currentPrice, targetPrice, carLink }) => ({
    subject: `Price alert: ${carName} is now within your target`,
    html: renderShell(
        'Your price alert was triggered',
        `
            <p>Hello ${userName},</p>
            <p><strong>${carName}</strong> is now available at Rs ${Math.round(currentPrice || 0).toLocaleString('en-IN')}.</p>
            <p>Your target was Rs ${Math.round(targetPrice || 0).toLocaleString('en-IN')}.</p>
            <p><a href="${carLink}" style="color:#a5b4fc">View car details</a></p>
        `,
    ),
})
