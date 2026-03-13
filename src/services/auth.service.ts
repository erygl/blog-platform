import bcrypt from "bcryptjs"
import User from "../models/User.js"
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError
} from "../errors/index.js"
import {
  createAccessToken,
  createRefreshToken,
  createVerificationToken,
  verifyVerificationToken,
  type AccessTokenPayload
} from "../utils/token.js"
import { sendVerificationEmail, sendResetEmail } from "../utils/email.js"
import {
  registerSchema,
  loginSchema,
  forgetPasswordSchema,
  resetPasswordSchema
} from "../validations/auth.validation.js"
import type { ParsedQs } from "qs"
import crypto from "crypto"


const registerUser = async (input: unknown) => {
  const { username, email, password, bio, avatar } = registerSchema.parse(input)

  const hashedPassword = await bcrypt.hash(password, 10)

  const user = await User.create({
    username, email, password: hashedPassword, bio, avatar
  })

  const verificationToken = createVerificationToken(user._id.toString())
  await sendVerificationEmail(user.email, verificationToken)

  return {
    username: user.username,
    email: user.email,
    bio: user.bio,
  }
}

const loginUser = async (input: unknown) => {
  const { email, password } = loginSchema.parse(input)
  const user = await User.findOne({ email }).select("+password")

  if (!user) {
    await bcrypt.compare(password, "$2b$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ01234")
    throw new UnauthorizedError("Wrong credentials")
  }

  if (!(await bcrypt.compare(password, user.password))) {
    throw new UnauthorizedError("Wrong credentials")
  }

  const accessToken = createAccessToken({
    userId: user._id.toString(),
    userRole: user.role
  })

  const refreshToken = createRefreshToken(user._id.toString())
  const hashedRefreshToken = await bcrypt.hash(refreshToken, 10)
  user.refreshToken = hashedRefreshToken
  await user.save()

  return { accessToken, refreshToken }
}

const logoutUser = async (payload: AccessTokenPayload): Promise<void> => {
  await User.findByIdAndUpdate(payload.userId, { refreshToken: null })
}

const verifyUserEmail = async (query: ParsedQs): Promise<void> => {
  const { token } = query
  if (!token || typeof token !== "string")
    throw new BadRequestError("Token is missing")

  const { userId } = verifyVerificationToken(token)

  const user = await User.findOneAndUpdate(
    { _id: userId, isVerified: false },
    { isVerified: true }
  )
  if (!user) throw new BadRequestError("Email already verified or user not found")
}

const sendPasswordResetEmail = async (input: unknown): Promise<void> => {
  const { email } = forgetPasswordSchema.parse(input)

  const user = await User.findOne({ email })
  if (user) {
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedResetToken =
      crypto.createHash("sha256").update(resetToken).digest("hex")

    user.passwordResetToken = hashedResetToken
    user.passwordResetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000) // 1h
    await user.save()

    await sendResetEmail(user.email, resetToken)
  }
}

const resetUserPassword = async (query: ParsedQs, input: unknown)
  : Promise<void> => {
  const { token } = query
  if (!token || typeof token !== "string")
    throw new BadRequestError("Token is missing")

  const { password } = resetPasswordSchema.parse(input)

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex")

  const user = await User.findOne({ passwordResetToken: hashedToken })
    .select("+passwordResetToken +passwordResetTokenExpiry")

  if (!user) throw new BadRequestError("Invalid or expired token")
  if (!user.passwordResetTokenExpiry || user.passwordResetTokenExpiry < new Date()) {
    user.passwordResetToken = null
    user.passwordResetTokenExpiry = null
    await user.save()
    throw new BadRequestError("Invalid or expired token")
  }

  user.password = await bcrypt.hash(password, 10)
  user.passwordResetToken = null
  user.passwordResetTokenExpiry = null
  user.refreshToken = null
  await user.save()
}

export {
  registerUser,
  loginUser,
  logoutUser,
  verifyUserEmail,
  sendPasswordResetEmail,
  resetUserPassword
}