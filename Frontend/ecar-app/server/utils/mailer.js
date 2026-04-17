import mailTransport from '../config/mailer.js'

export const sendEmail = async ({ to, subject, html, text }) => {
    if (!to) return

    await mailTransport.sendMail({
        from: process.env.MAIL_FROM || process.env.SMTP_USER,
        to,
        subject,
        html,
        text,
    })
}

export const sendEmailSafe = async (payload) => {
    try {
        await sendEmail(payload)
    } catch (error) {
        console.error('Email send failed', error.message)
    }
}
