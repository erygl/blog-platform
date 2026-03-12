import express, { type Application } from "express"
import authRouter from "./routes/auth.routes.js"
import { errorHandler } from "./middleware/errorHandler.js"

const app: Application = express()

app.use(express.json())

app.use("/api/auth", authRouter)
app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" })
})

app.use(errorHandler)


export default app