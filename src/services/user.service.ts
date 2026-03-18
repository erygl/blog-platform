import User from "../models/User.js"
import { NotFoundError, UnauthorizedError, BadRequestError } from "../errors/index.js"
import bcrypt from "bcryptjs"
import { sendVerificationEmail } from "../utils/email.js"
import { createVerificationToken } from "../utils/token.js"

const updateProfile = async (
  userId: string,
  data: { username?: string, bio?: string, avatar?: string }
) => {
  const user = await User.findByIdAndUpdate(userId, data, { returnDocument: "after" })
  if (!user) throw new NotFoundError("User not found")
  return user
}

const updateEmail = async (
  userId: string,
  email: string,
  password: string
): Promise<void> => {
  const user = await User.findById(userId).select("+password")
  if (!user) throw new NotFoundError("User not found")

  const isPasswordValid = await bcrypt.compare(password, user.password)
  if (!isPasswordValid) throw new UnauthorizedError("Invalid password")

  if (user.email === email)
    throw new BadRequestError("New email must be different from current email")

  user.email = email
  user.isVerified = false
  await user.save()

  const token = createVerificationToken(userId)
  await sendVerificationEmail(user.email, token)
}

const updatePassword = async (
  userId: string,
  oldPassword: string,
  newPassword: string
) => {
  const user = await User.findById(userId).select("+password")
  if (!user) throw new NotFoundError("User not found")

  const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password)
  if (!isOldPasswordValid) throw new UnauthorizedError("Invalid old password")

  if (oldPassword === newPassword)
    throw new BadRequestError("New password can not be the same with old password")

  const hashedNewPassword = await bcrypt.hash(newPassword, 10)
  user.password = hashedNewPassword
  user.refreshToken = null
  await user.save()
}


export {
  updateProfile,
  updateEmail,
  updatePassword
}