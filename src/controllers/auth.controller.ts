import type { Request, Response } from "express"
import * as authService from "../services/auth.service.js"

const register = async (req: Request, res: Response) => {
  const user = await authService.registerUser(req.body)

  res.status(201).json({ user })
}

const login = async (req: Request, res: Response) => {
  const { accessToken, refreshToken } = await authService.loginUser(req.body)

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  })
  res.status(200).json({ accessToken })
}

const logout = async (req: Request, res: Response) => {
  await authService.logoutUser(req.user!)
  res.clearCookie("refreshToken")
  res.status(200).json({ message: "Logged out successfully" })
}

const verifyEmail = async (req: Request, res: Response) => {
  await authService.verifyUserEmail(req.query)
  res.status(200).json({ message: "Email verified successfully" })
}

const forgottenPassword = async (req: Request, res: Response) => {
  await authService.sendPasswordResetEmail(req.body)
  res.status(200).json({ message: "Reset link sent" })
}

const resetPassword = async (req: Request, res: Response) => {
  await authService.resetUserPassword(req.query, req.body)
  res.status(200).json({ message: "Password updated successfully" })
}

const refresh = async (req: Request, res: Response) => {
  const newAccessToken = await authService.refreshAccessToken(req.cookies.refreshToken)
  res.status(200).json({ accessToken: newAccessToken })
}

export {
  register,
  login,
  logout,
  verifyEmail,
  forgottenPassword,
  resetPassword,
  refresh
}