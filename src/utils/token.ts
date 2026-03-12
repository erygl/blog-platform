import jwt from "jsonwebtoken"
import { env } from "../config/env.js"
import { TokenExpiredError } from "jsonwebtoken"
import { UnauthorizedError } from "../errors/index.js"

interface AccessTokenPayload {
  userId: string,
  userRole: "user" | "admin"
}

interface RefreshTokenPayload {
  userId: string
}

const createAccessToken = (payload: AccessTokenPayload): string => {
  return jwt.sign(payload, env.accessTokenSecret, { expiresIn: "15m" })
}

const verifyAccessToken = (token: string): AccessTokenPayload => {
  try {
    return jwt.verify(token, env.accessTokenSecret) as AccessTokenPayload
  } catch (error) {
    if (error instanceof TokenExpiredError) throw new UnauthorizedError("Access token has expired")
    throw new UnauthorizedError("Invalid access token")
  }
}

const createRefreshToken = (payload: RefreshTokenPayload): string => {
  return jwt.sign(payload, env.refreshTokenSecret, { expiresIn: "7d" })
}

const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  try {
    return jwt.verify(token, env.refreshTokenSecret) as RefreshTokenPayload
  } catch (error) {
    if (error instanceof TokenExpiredError) throw new UnauthorizedError("Refresh token has expired")
    throw new UnauthorizedError("Invalid refresh token")
  }
}

export {
  createAccessToken,
  verifyAccessToken,
  createRefreshToken,
  verifyRefreshToken
}