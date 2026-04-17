import Post from "../models/Post.js"

export const recalculateRecentPosts = async () => {
  try {
    const activeWindow = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const posts = await Post.find({
      status: "published", lastActivityAt: { $gte: activeWindow }
    })
      .select("_id viewsCount likesCount commentsCount publishedAt")
      .lean()

    const ops = posts.map(p => {
      const ageInHours = (Date.now() - p.publishedAt!.getTime()) / (1000 * 60 * 60)
      const points = p.likesCount + (p.commentsCount * 2) + (p.viewsCount * 0.2);
      const score = points / Math.pow(ageInHours + 2, 1.5);
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