import { AppError } from "../errors/index.js";
import { mongo } from "mongoose";
import { ZodError } from "zod";
import type { Request, Response, NextFunction } from "express";

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  let statusCode = 500
  let message = "Internal service error"

  if (err instanceof ZodError) {
    statusCode = 400
    message = err.issues.map(e => e.message).join(", ")
  }
  else if (err instanceof AppError) {
    statusCode = err.statusCode
    message = err.message
  }
  else if (err instanceof mongo.MongoServerError && err.code === 11000) {
    const field = Object.keys(err.keyValue)[0]
    statusCode = 409
    message = `${field} already in use`
  }
  else {
    console.error(err)
  }

  return res.status(statusCode).json({ message })
}