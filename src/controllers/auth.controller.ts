import type { Request, Response } from "express"
import { registerUser, loginUser } from "../services/auth.service.js"

const register = async (req: Request, res: Response) => {
  const user = await registerUser(req.body)
  
  res.status(201).json({ user })
}

const login = async (req: Request, res: Response) => {
  const {
    accessToken,
    refreshToken
  } = await loginUser(req.body)

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  })
  res.status(200).json({ accessToken })
}

export {
  register,
  login
}