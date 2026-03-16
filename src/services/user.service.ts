import User from "../models/User.js"
import * as userValidation from "../validations/user.validation.js"
import { NotFoundError, UnauthorizedError, BadRequestError } from "../errors/index.js"
import bcrypt from "bcryptjs"
import { sendVerificationEmail } from "../utils/email.js"
import { createVerificationToken } from "../utils/token.js"

const updateProfile = async (userId: string, input: unknown) => {
  const data = userValidation.updateProfileSchema.parse(input)
  const user = await User.findByIdAndUpdate(userId, data, { returnDocument: "after" })
  if (!user) throw new NotFoundError("User not found")
  return user
}

const updateEmail = async (userId: string, input: unknown): Promise<void> => {
  const { email, password } = userValidation.updateEmailSchema.parse(input)

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

const updatePassword = async (userId: string, input: unknown) => {
  const { oldPassword, newPassword } = userValidation.updatePasswordSchema.parse(input)

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