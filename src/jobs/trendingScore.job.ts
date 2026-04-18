import Post from "../models/Post.js"

const NEWNESS_BONUS_HOURS = 3

export const calcTrendingScore = (post: {
  likesCount: number
  commentsCount: number
  viewsCount: number
  publishedAt: Date
}) => {
  const ageInHours = (Date.now() - post.publishedAt.getTime()) / (60 * 60 * 1000)
  const bonus = Math.max(0, NEWNESS_BONUS_HOURS - ageInHours)
  const points = post.likesCount + (post.commentsCount * 2) + (post.viewsCount * 0.2) + bonus
  return points / Math.pow(ageInHours + 2, 1.5)
}

export const recalculateRecentPosts = async () => {
  try {
    const activeWindow = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const posts = await Post.find({
      status: "published", lastActivityAt: { $gte: activeWindow }
    })
      .select("_id viewsCount likesCount commentsCount publishedAt")
      .lean()

    const ops = posts.map(p => {
      const score = calcTrendingScore({
        likesCount: p.likesCount,
        commentsCount: p.commentsCount,
        viewsCount: p.viewsCount,
        publishedAt: p.publishedAt!
      });
      return {
        updateOne: {
          filter: { _id: p._id },
          update: {
            $set: { trendingScore: score }
          }
        }
      }
    })

    const BATCH_SIZE = 500
    for (let i = 0; i < posts.length; i += BATCH_SIZE) {
      const chunk = ops.slice(i, i + BATCH_SIZE)
      await Post.bulkWrite(chunk, { ordered: false })
    }
    console.log(`recalculateRecentPosts completed at ${new Date().toISOString()}`)
  } catch (error) {
    console.error("recalculateRecentPosts failed: ", error)
  }
}

export const decayOldPosts = async () => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    await Post.updateMany(
      {
        status: "published",
        lastActivityAt: { $lt: thirtyDaysAgo },
        trendingScore: { $gt: 0 }
      },
      { $set: { trendingScore: 0 } }
    )
    console.log(`decayOldPosts completed at ${new Date().toISOString()}`)
  } catch (error) {
    console.error("decayOldPosts failed: ", error)
  }
}