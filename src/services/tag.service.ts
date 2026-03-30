import { NotFoundError } from "../errors/index.js"
import Post from "../models/Post.js"
import Tag from "../models/Tag.js"

const getPopularTags = async (limit: number) => {
  const tags = await Tag.find({ postCount: { $gt: 0 } })
    .sort({ postCount: -1 })
    .limit(limit)
    .select("-_id")
    .lean()

  return { tags }
}

const getTagWithPosts = async (tagSlug: string, page: number, limit: number) => {
  const tag = await Tag.findOne({ slug: tagSlug })
    .select("_id name postCount")
    .lean()
  if (!tag) throw new NotFoundError("Tag not found")

  const skip = (page - 1) * limit
  const posts = await Post.find({ tags: tag._id, status: "published" })
    .sort({ trendingScore: - 1 })
    .skip(skip)
    .limit(limit + 1)
    .select("-_id title author coverImage excerpt slug likesCount commentsCount")
    .populate("author", "-_id username name avatar")
    .lean()

  const hasMore = posts.length > limit
  return {
    tag: { name: tag.name, postCount: tag.postCount },
    posts: posts.slice(0, limit),
    hasMore
  }
}

export {
  getPopularTags,
  getTagWithPosts
}