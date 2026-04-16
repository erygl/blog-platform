import jwt from "jsonwebtoken"
import { env } from "../config/env.js"
import { UnauthorizedError } from "../errors/index.js"

export interface AccessTokenPayload {
  userId: string,
  userRole: "user" | "admin",
  isVerified: boolean,
  isBanned: boolean
}

const createAccessToken = (payload: AccessTokenPayload): string => {
  return jwt.sign(payload, env.accessTokenSecret, { expiresIn: "15m" })
}

const verifyAccessToken = (token: string): AccessTokenPayload => {
  try {
    return jwt.verify(token, env.accessTokenSecret) as AccessTokenPayload
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) throw new UnauthorizedError("Access token has expired")
    throw new UnauthorizedError("Invalid access token")
  }
}

const createRefreshToken = (userId: string): string => {
  return jwt.sign({ userId }, env.refreshTokenSecret, { expiresIn: "7d" })
}

const verifyRefreshToken = (token: string): { userId: string } => {
  try {
    return jwt.verify(token, env.refreshTokenSecret) as { userId: string }
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) throw new UnauthorizedError("Refresh token has expired")
    throw new UnauthorizedError("Invalid refresh token")
  }
}

const createVerificationToken = (userId: string): string => {
  return jwt.sign({ userId }, env.verificationTokenSecret, { expiresIn: "15m" })
}

const verifyVerificationToken = (token: string): { userId: string } => {
  try {
    return jwt.verify(token, env.verificationTokenSecret) as { userId: string }
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) throw new UnauthorizedError("Verification token has expired")
    throw new UnauthorizedError("Invalid verification token")
  }
}

export {
  createAccessToken,
  verifyAccessToken,
  createRefreshToken,
  verifyRefreshToken,
  createVerificationToken,
  verifyVerificationToken
}