import Post from "../models/Post.js";
import Tag from "../models/Tag.js";
import User from "../models/User.js";
import { generateSlug } from "../utils/slug.js";

const getTrendingPosts = async (page: number, limit: number) => {
  const skip = (page - 1) * limit
  const posts = await Post.find({ status: "published" })
    .sort({ trendingScore: -1 })
    .skip(skip)
    .limit(limit + 1)
    .select("title slug excerpt author coverImage likesCount commentsCount viewsCount publishedAt")
    .populate("author", "username avatar")
    .lean()

  const hasMore = posts.length > limit
  return { posts: posts.slice(0, limit), hasMore }
}

const createPost = async (data: {
  title: string,
  content: string,
  status: "draft" | "published",
  coverImage?: string,
  tags?: string[]
}, userId: string) => {
  const slug = generateSlug(data.title, true)
  const excerpt = data.content.slice(0, 100).trimEnd()

  const tagIds = await Promise.all(
    (data.tags ?? []).map(async (name) => {
      const tagSlug = generateSlug(name)
      const tag = await Tag.findOneAndUpdate(
        { name },
        { $setOnInsert: { name, slug: tagSlug } },
        { upsert: true, returnDocument: "after" }
      )
      return tag._id
    })
  )

  const post = await Post.create({
    ...data,
    author: userId,
    slug,
    excerpt,
    tags: tagIds,
    publishedAt: data.status === "published" ? new Date() : null
  })

  return post
}

const getFeed = async (userId: string, page: number, limit: number) => {
  const skip = (page - 1) * limit
  const currentUser = await User.findById(userId).select("following").lean()
  const followedUsers = currentUser!.following
  const posts = await Post.find({ author: followedUsers, status: "published" })
    .sort("-publishedAt")
    .skip(skip)
    .limit(limit + 1)
    .select("title slug excerpt author coverImage likesCount commentsCount viewsCount publishedAt")
    .populate("author", "username avatar")
    .lean()

  const hasMore = posts.length > limit
  return { posts: posts.slice(0, limit), hasMore }
}

const getDrafts = async (userId: string) => {
  const drafts = await Post.find({ author: userId, status: "draft" })
    .sort("-createdAt")
    .select("title slug excerpt updatedAt")
    .lean()

  return drafts
}

export {
  getTrendingPosts,
  createPost,
  getFeed,
  getDrafts
}