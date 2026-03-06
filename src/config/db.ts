import mongoose from "mongoose"
import { env } from "./env.js"

export const connectDB = async () => {
  try {
    await mongoose.connect(env.dbUrl)
    console.log("connected to db")
  } catch (error) {
    console.error("db connection failed", error)
    process.exit(1)
  }
}