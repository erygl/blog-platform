import app from "./App.js";
import { connectDB } from "./config/db.js"
import { env } from "./config/env.js";

const PORT = env.port

const start = async () => {
  await connectDB()
  app.listen(PORT, () => {
    console.log(`server is listening on port ${PORT}`)
  })
}

start()