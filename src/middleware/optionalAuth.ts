import type { NextFunction, Request, Response } from "express"
import { ForbiddenError } from "../errors/index.js"
import { verifyAccessToken } from "../utils/token.js"

const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith("Bearer ")) return next()

  const accessToken = authHeader.split(" ")[1]
  const decoded = verifyAccessToken(accessToken)
  req.user = decoded
  if (req.user.isBanned) throw new ForbiddenError("Your account has been suspended")
  next()
}

export default optionalAuth
