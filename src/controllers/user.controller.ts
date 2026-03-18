import type { Request, Response } from "express";
import * as userService from "../services/user.service.js"
import * as userValidation from "../validations/user.validation.js"

const updateProfile = async (req: Request, res: Response) => {
  const data = userValidation.updateProfileSchema.parse(req.body)
  const userId = req.user!.userId
  const user = await userService.updateProfile(userId, data)
  res.status(200).json({
    user: {
      username: user.username,
      bio: user.bio,
      avatar: user.avatar
    }
  })
}

const updateEmail = async (req: Request, res: Response) => {
  const { email, password } = userValidation.updateEmailSchema.parse(req.body)
  const userId = req.user!.userId
  await userService.updateEmail(userId, email, password)
  res.status(200).json({ message: "Verification email sent to your new address" })
}

const updatePassword = async (req: Request, res: Response) => {
  const { oldPassword, newPassword } = userValidation.updatePasswordSchema.parse(req.body)
  const userId = req.user!.userId
  await userService.updatePassword(userId, oldPassword, newPassword)
  res.status(200).json({ message: "Password changed successfully" })
}

export {
  updateProfile,
  updateEmail,
  updatePassword
}