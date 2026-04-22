import type { Request, Response } from "express"
import * as authService from "../services/auth.service.js"
import * as authValidation from "../validations/auth.validation.js"
import {
  BadRequestError,
  UnauthorizedError
} from "../errors/index.js"

const register = async (req: Request, res: Response) => {
  const input = authValidation.registerSchema.parse(req.body)
  const user = await authService.registerUser(input)

  res.status(201).json({ user })
}

const login = async (req: Request, res: Response) => {
  const { email, password } = authValidation.loginSchema.parse(req.body)
  const { accessToken, refreshToken } = await authService.loginUser(email, password)

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  })
  res.status(200).json({ accessToken })
}

const logout = async (req: Request, res: Response) => {
  const userId = req.user!.userId
  await authService.logoutUser(userId)
  res.clearCookie("refreshToken")
  res.status(200).json({ message: "Logged out successfully" })
}

const verifyEmail = async (req: Request, res: Response) => {
  const token = req.query.token
  if (!token || typeof token !== "string")
    throw new BadRequestError("Token is missing")
  await authService.verifyUserEmail(token)
  res.status(200).json({ message: "Email verified successfully" })
}

const forgottenPassword = async (req: Request, res: Response) => {
  const { email } = authValidation.forgetPasswordSchema.parse(req.body)
  await authService.sendPasswordResetEmail(email)
  res.status(200).json({ message: "Reset link sent" })
}

const resetPassword = async (req: Request, res: Response) => {
  const token = req.query.token
  if (!token || typeof token !== "string")
    throw new BadRequestError("Token is missing")
  const { password } = authValidation.resetPasswordSchema.parse(req.body)
  await authService.resetUserPassword(token, password)
  res.status(200).json({ message: "Password updated successfully" })
}

const refresh = async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refreshToken
  if (!refreshToken)
    throw new UnauthorizedError("Token is missing")
  const newAccessToken = await authService.refreshAccessToken(refreshToken)
  res.status(200).json({ accessToken: newAccessToken })
}

const flagCompromise = async (req: Request, res: Response) => {
  const token = req.query.token
  if (!token || typeof token !== "string")
    throw new BadRequestError("Token is missing")
  await authService.flagCompromise(token)
  res.status(200).json({ message: "Check your email for a password reset link." })
}

export {
  register,
  login,
  logout,
  verifyEmail,
  forgottenPassword,
  resetPassword,
  refresh,
  flagCompromise
}