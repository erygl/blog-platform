import { env } from "../config/env.js"
import { Resend } from "resend"
import { AppError } from "../errors/index.js"

const resend = new Resend(env.resendApiKey)

export const sendEmail = async (
  to: string,
  template: { subject: string, html: string }
) => {
  const { error } = await resend.emails.send({
    from: "blog-platform <onboarding@resend.dev>",
    to: [to],
    subject: template.subject,
    html: template.html
  })

  if (error) {
    console.error("Resend error: ", error)
    throw new AppError("Failed to send email", 500)
  }
}

export const emailTemplates = {
  verifyEmail: (token: string) => ({
    subject: "Email Verification",
    html: `<p>Please click link below to verify your email</p>
    <a href="${env.appUrl}/api/auth/verify-email?token=${token}">Verify Email</a>`
  }),

  resetPassword: (token: string) => ({
    subject: "Reset your password",
    html: `<p>Please click link below to reset your password</p>
    <a href="${env.appUrl}/api/auth/reset-password?token=${token}">Reset Password</a>`
  }),

  passwordChanged: (flagToken: string) => ({
    subject: "Your password has changed",
    html: `<p>Your password was successfully changed.</p>
    <p>If you didn't make this change, <a href="${env.appUrl}/api/auth/flag-compromise?token=${flagToken}">click here</a> to secure your account immediately.</p>`
  }),

  emailChanged: (newEmail: string) => ({
    subject: "Your email address has changed",
    html: `<p>Your account email was changed to <strong>${newEmail}</strong>.</p>
    <p>If you didn't make this change, please contact support immediately.</p>`
  }),

  accountDeleted: (username: string) => ({
    subject: "Your account has been deleted",
    html: `<p>Hi ${username}, your account has been permanently deleted.</p>
    <p>If you didn't request this, please contact support immediately.</p>`
  }),

  accountBanned: (username: string) => ({
    subject: "Your account has been suspended",
    html: `<p>Hi ${username}, your account has been suspended for violating our community guidelines.</p>
    <p>If you believe this is a mistake, please contact support.</p>`
  })
}
