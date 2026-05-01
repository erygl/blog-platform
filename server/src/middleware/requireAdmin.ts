import type { Request, Response, NextFunction } from "express"
import { NotFoundError } from "../errors/index.js"

const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user!.userRole !== "admin")
    throw new NotFoundError("Route not found")
  next()
}

export default requireAdmin