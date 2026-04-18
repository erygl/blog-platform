import { NotFoundError } from "../errors/index.js"
import Post from "../models/Post.js"
import Tag from "../models/Tag.js"
import { Types } from "mongoose"
import { encode, decode } from "../utils/cursor.js"

const getPopularTags = async (limit: number) => {
  const tags = await Tag.find({ postCount: { $gt: 0 } })
    .sort({ postCount: -1 })
    .limit(limit)
    .select("-_id")
    .lean()

  return { tags }
}

const getTagWithPosts = async (
  tagSlug: string,
  cursor: string | undefined,
  limit: number
) => {
  const tag = await Tag.findOne({ slug: tagSlug })
    .select("_id name postCount")
    .lean()
  if (!tag) throw new NotFoundError("Tag not found")

  const cursorFilter = cursor ? (() => {
    const { score, id } = decode<{ score: number, id: string }>(cursor)
    return {
      $or: [
        { trendingScore: { $lt: score } },
        { trendingScore: score, _id: { $lt: new Types.ObjectId(id) } }
      ]
    }
  })() : {}

  const posts = await Post.find({ tags: tag._id, status: "published", ...cursorFilter })
    .sort({ trendingScore: -1, _id: -1 })
    .limit(limit + 1)
    .select("title author coverImage excerpt slug likesCount commentsCount trendingScore")
    .populate("author", "-_id username name avatar")
    .lean()

  const hasMore = posts.length > limit
  const sliced = posts.slice(0, limit)
  const last = sliced[sliced.length - 1]
  const nextCursor = hasMore
    ? encode({ score: last.trendingScore, id: last._id.toString() })
    : undefined
  const result = sliced.map(({ _id, trendingScore, ...rest }) => rest)
  return {
    tag: { name: tag.name, postCount: tag.postCount },
    posts: result,
    hasMore,
    nextCursor
  }
}

export {
  getPopularTags,
  getTagWithPosts
}