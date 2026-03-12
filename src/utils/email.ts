import { env } from "../config/env.js"
import { Resend } from "resend"
import { AppError } from "../errors/index.js";

const resend = new Resend(env.resendApiKey)

export const sendVerificationEmail = async (userEmail: string, token: string) => {
  const { error } = await resend.emails.send({
    from: "blog-platform <onboarding@resend.dev>",
    to: [userEmail],
    subject: "Email Verification",
    html: `<p>Please click link below to verify your email</p>
    <a href="${env.appUrl}/api/auth/verify-email?token=${token}">Verify Email</a>`,
  });

  if (error) {
    console.error("Resend error: ", error)
    throw new AppError("Failed to send verification email", 500)
  }
}