import type { Request, Response } from "express";
import * as userService from "../services/user.service.js"

const updateProfile = async (req: Request, res: Response) => {
  const user = await userService.updateProfile(req.user!.userId, req.body)
  res.status(200).json({
    user: {
      username: user.username,
      bio: user.bio,
      avatar: user.avatar
    }
  })
}

const updateEmail = async (req: Request, res: Response) => {
  await userService.updateEmail(req.user!.userId, req.body)
  res.status(200).json({ message: "Verification email sent to your new address" })
}

const updatePassword = async (req: Request, res: Response) => {
  await userService.updatePassword(req.user!.userId, req.body)
  res.status(200).json({ message: "Password changed successfully" })
}

export {
  updateProfile,
  updateEmail,
  updatePassword
}