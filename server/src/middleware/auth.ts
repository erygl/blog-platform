import type { NextFunction, Request, Response } from "express"
import { ForbiddenError, UnauthorizedError } from "../errors/index.js"
import { verifyAccessToken } from "../utils/token.js"

const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith("Bearer "))
    throw new UnauthorizedError("Token is not provided")

  const accessToken = authHeader.split(" ")[1]
  const decoded = verifyAccessToken(accessToken)

  req.user = decoded
  if (req.user.isBanned) throw new ForbiddenError("Your account has been suspended")
  next()
}

export default authMiddleware