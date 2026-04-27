import { NotFoundError } from "../errors/index.js"
import Post from "../models/Post.js"
import Tag from "../models/Tag.js"
import { Types } from "mongoose"
import { decode, paginate } from "../utils/cursor.js"
import { getBlockedIds } from "./block.service.js"

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
  limit: number,
  userId?: string
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

  const blockedIds = userId ? await getBlockedIds(userId) : []
  const blockFilter = blockedIds.length > 0 ? { author: { $nin: blockedIds } } : {}

  const posts = await Post.find({ tags: tag._id, status: "published", ...cursorFilter, ...blockFilter })
    .sort({ trendingScore: -1, _id: -1 })
    .limit(limit + 1)
    .select("title author coverImage excerpt slug likesCount commentsCount trendingScore")
    .populate("author", "-_id username name avatar")
    .lean()

  const { data, hasMore, nextCursor } = paginate(
    posts,
    limit,
    last => ({ score: last.trendingScore, id: last._id.toString() })
  )
  const result = data.map(({ _id, trendingScore, ...rest }) => rest)
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