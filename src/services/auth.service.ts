import bcrypt from "bcryptjs"
import User from "../models/User.js"
import { BadRequestError, UnauthorizedError } from "../errors/index.js"
import {
  createAccessToken,
  createRefreshToken,
  createVerificationToken,
  verifyVerificationToken,
  type AccessTokenPayload
} from "../utils/token.js"
import { sendVerificationEmail } from "../utils/email.js"
import { registerSchema, loginSchema } from "../validations/auth.validation.js"
import type { ParsedQs } from "qs"


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
    await bcrypt.compare(password, "$2b$10$fakehashfakehashfakehashfake")
    throw new UnauthorizedError("Wrong credentials")
  }

  if (!(await bcrypt.compare(password, user.password))) {
    throw new UnauthorizedError("Wrong credentials")
  }

  const accessToken = createAccessToken({
    userId: user._id.toString(),
    userRole: user.role
  })

  const refreshToken = createRefreshToken({ userId: user._id.toString() })
  const hashedRefreshToken = await bcrypt.hash(refreshToken, 10)
  user.refreshToken = hashedRefreshToken
  await user.save()

  return { accessToken, refreshToken }
}

const logoutUser = async (payload: AccessTokenPayload): Promise<void> => {
  await User.findByIdAndUpdate(payload.userId, { refreshToken: null })
}

const verifyUser = async (query: ParsedQs): Promise<void> => {
  const { token } = query
  if (!token || typeof token !== "string") throw new BadRequestError("Token is missing")

  const { userId } = verifyVerificationToken(token)

  const user = await User.findOneAndUpdate(
    { _id: userId, isVerified: false },
    { isVerified: true }
  )
  if (!user) throw new BadRequestError("Email already verified or user not found")
}

export {
  registerUser,
  loginUser,
  logoutUser,
  verifyUser
}