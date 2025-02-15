export const emailConfig = {
  host: process.env.SMTP_HOST || 'sandbox.smtp.mailtrap.io',
  port: parseInt(process.env.SMTP_PORT || '2525'),
  auth: {
    user: process.env.SMTP_USER || 'bbbee9961819e4',
    pass: process.env.SMTP_PASS || '5f631f34141d19'
  },
  from: process.env.EMAIL_FROM || 'no-reply@demomailtrap.com',
  secure: false
}; 