import type { Request, Response, NextFunction } from "express"
import { ForbiddenError } from "../errors/index.js"

const requireVerified = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user!.isVerified) throw new ForbiddenError("To do that please verify your email")
  next()
}

export default requireVerified