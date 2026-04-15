import mongoose from "mongoose"
import { env } from "./env.js"

export const connectDB = async () => {
  try {
    mongoose.set("transactionAsyncLocalStorage", true)
    await mongoose.connect(env.dbUrl)
    console.log("Connected to database")
  } catch (error) {
    console.error("Database connection failed", error)
    process.exit(1)
  }
}