import cron from "node-cron"
import { recalculateRecentPosts, decayOldPosts } from "./trendingScore.job.js"
import { cleanupOrphanImages } from "./cleanupOrphanImages.job.js"

export const startJobs = () => {
  recalculateRecentPosts()
  cron.schedule("0 * * * *", recalculateRecentPosts)
  cron.schedule("0 4 * * *", decayOldPosts)
  cron.schedule("0 5 1 * 7", cleanupOrphanImages)
}