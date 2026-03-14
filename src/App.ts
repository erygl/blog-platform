import express, { type Application } from "express"
import rateLimit from "express-rate-limit"
import cookieParser from "cookie-parser"
import helmet from "helmet"
import authRouter from "./routes/auth.routes.js"
import { errorHandler } from "./middleware/errorHandler.js"

const app: Application = express()

app.use(helmet())
app.use(express.json())
app.use(cookieParser())

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  message: { message: "Too many attempts, please try again later" }
})

app.use("/api/auth", authLimiter, authRouter)
app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" })
})

app.use(errorHandler)


export default app