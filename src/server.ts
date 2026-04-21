import app from "./app.js";
import { connectDB } from "./config/db.js"
import { env } from "./config/env.js";
import { startJobs } from "./jobs/index.js"
import { initSSE } from "./services/notification.service.js"

const start = async () => {
  await connectDB()
  startJobs()
  initSSE()
  app.listen(env.port, () => {
    console.log(`Server is listening on port ${env.port}`)
  })
}

start().catch((err) => {
  console.error(err)
  process.exit(1)
})