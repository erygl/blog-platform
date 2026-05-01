import Post from "../models/Post.js";
import Tag from "../models/Tag.js";
import User from "../models/User.js";
import { getBlockedIds } from "./block.service.js"
import { Types } from "mongoose"

const search = async (
  type: string,
  query: string,
  page: number,
  limit: number,
  userId?: string
) => {
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const skip = (page - 1) * limit
  const blockedIds = userId ? await getBlockedIds(userId) : []
  let result;
  if (type === "posts") {
    const blockFilter = blockedIds.length > 0 ? { author: { $nin: blockedIds } } : {}
    result = await Post.find({
      title: { $regex: escaped, $options: "i" }, status: "published", ...blockFilter
    })
      .sort({ trendingScore: -1 })
      .skip(skip)
      .limit(limit + 1)
      .select("-_id title slug excerpt author coverImage likesCount commentsCount viewsCount publishedAt")
      .populate("author", "-_id username name avatar")
      .lean()
  }
  else if (type === "users") {
    const blockFilter = blockedIds.length > 0 ? { _id: { $nin: blockedIds } } : {}
    result = await User.find({
      $or: [
        { username: { $regex: escaped, $options: "i" } },
        { name: { $regex: escaped, $options: "i" } }
      ],
      ...blockFilter
    })
      .sort({ followersCount: -1 })
      .skip(skip)
      .limit(limit + 1)
      .select("-_id username name avatar bio")
      .lean()
  }
  else {
    result = await Tag.find(
      { name: { $regex: escaped, $options: "i" }, postCount: { $gt: 0 } }
    )
      .sort({ postCount: -1 })
      .skip(skip)
      .limit(limit + 1)
      .select("-_id name slug postCount")
      .lean()
  }
  const hasMore = result.length > limit
  return { results: result.slice(0, limit), hasMore }
}

export { search }