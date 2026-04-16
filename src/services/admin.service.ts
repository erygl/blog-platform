import { NotFoundError } from "../errors/index.js"
import User from "../models/User.js"
import Post from "../models/Post.js"
import Like from "../models/Like.js"
import Comment from "../models/Comment.js"
import Tag from "../models/Tag.js"
import mongoose from "mongoose"
import { generateSlug } from "../utils/slug.js"

const getUsers = async (
  query: {
    q?: string,
    isVerified?: boolean,
    isBanned?: boolean,
    role?: "user" | "admin"
    page: number,
    limit: number
  }
) => {
  const skip = (query.page - 1) * query.limit
  const escapedQ = query.q?.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const filter: Record<string, unknown> = {}
  if (escapedQ) filter.$or = [
    { username: { $regex: escapedQ, $options: "i" } },
    { name: { $regex: escapedQ, $options: "i" } }
  ]
  if (query.isVerified !== undefined) filter.isVerified = query.isVerified
  if (query.isBanned !== undefined) filter.isBanned = query.isBanned
  if (query.role) filter.role = query.role

  const users = await User.find(filter)
    .sort("-createdAt")
    .skip(skip)
    .limit(query.limit + 1)
    .select("username avatar bio")
    .lean()

  const hasMore = users.length > query.limit
  return { users: users.slice(0, query.limit), hasMore }
}

const getUserById = async (userId: string) => {
  const user = await User.findById(userId)
    .lean()
  if (!user) throw new NotFoundError("User not found")

  const userPosts = await Post.find({ author: user._id })
    .select("_id status")
    .lean()

  const publishedPostCount = userPosts.filter(t => t.status === "published").length
  const draftPostCount = userPosts.filter(t => t.status === "draft").length

  return { ...user, publishedPostCount, draftPostCount }
}

const updateUser = async (
  userId: string,
  data: {
    isVerified?: boolean,
    isBanned?: boolean,
    role?: "admin" | "user",
    avatar?: null
  }
): Promise<void> => {
  const update: Record<string, unknown> = {}
  if (data.isVerified !== undefined) update.isVerified = data.isVerified
  if (data.isBanned !== undefined) update.isBanned = data.isBanned
  if (data.isBanned) update.refreshToken = null
  if (data.role !== undefined) update.role = data.role
  if ("avatar" in data) update.avatar = null

  const user = await User.findByIdAndUpdate(userId, update)
  if (!user) throw new NotFoundError("User not found")
}

const getPosts = async (
  query: {
    status?: "draft" | "published" | "archived",
    author?: string,
    sort: "createdAt" | "publishedAt" | "likesCount" | "viewsCount" | "trendingScore",
    order: "asc" | "desc",
    page: number,
    limit: number
  }
) => {
  const skip = (query.page - 1) * query.limit
  const escapedAuthor = query.author?.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const matchedUsers = escapedAuthor ? await User.find({
    $or: [
      { username: { $regex: escapedAuthor, $options: "i" } },
      { name: { $regex: escapedAuthor, $options: "i" } }
    ]
  }).select("_id").lean() : []

  const posts = await Post.find({
    ...(query.status !== undefined ? { status: query.status } : {}),
    ...(escapedAuthor ? { author: { $in: matchedUsers.map(u => u._id) } } : {})
  })
    .sort({ [query.sort]: query.order === "asc" ? 1 : -1 })
    .skip(skip)
    .limit(query.limit + 1)
    .select("title slug excerpt author coverImage likesCount commentsCount viewsCount publishedAt status")
    .populate("author", "-_id username name avatar")
    .lean()

  const hasMore = posts.length > query.limit
  return { posts: posts.slice(0, query.limit), hasMore }
}

const getPostById = async (postId: string) => {
  const post = await Post.findById(postId)
    .populate("author", "username name avatar")
    .populate("tags", "name")
    .lean()

  if (!post) throw new NotFoundError("Post not found")
  return post
}

const deletePost = async (postId: string): Promise<void> => {
  const session = await mongoose.startSession()
  try {
    await session.withTransaction(async () => {
      const post = await Post.findByIdAndDelete(postId)
      if (!post) throw new NotFoundError("Post not found")
      await Like.deleteMany({ post: post._id })
      await Comment.deleteMany({ post: post._id })
      if (post.status === "published")
        await Tag.updateMany({ _id: { $in: post.tags } }, { $inc: { postCount: -1 } })
    })
  } finally {
    await session.endSession()
  }
}

const deleteComment = async (
  commentId: string
): Promise<void> => {
  const session = await mongoose.startSession()
  try {
    await session.withTransaction(async () => {
      const comment = await Comment.findOneAndDelete({ _id: commentId })
      if (!comment) throw new NotFoundError("Comment not found")

      const replies = await Comment.find({ parentComment: comment._id })
        .select("_id")
        .lean()
      const replyIds = replies.map(r => r._id)

      await Like.deleteMany({ comment: { $in: [comment._id, ...replyIds] } })
      await Comment.deleteMany({ parentComment: comment._id })
      await Post.findByIdAndUpdate(
        comment.post,
        { $inc: { commentsCount: -(1 + replies.length) } }
      )

      if (comment.parentComment) {
        await Comment.findByIdAndUpdate(
          comment.parentComment,
          { $inc: { repliesCount: -1 } }
        )
      }
    })
  } finally {
    await session.endSession()
  }
}

const getTags = async (query: {
  q?: string,
  sort: "postCount" | "createdAt",
  order: "asc" | "desc",
  page: number,
  limit: number
}) => {
  const skip = (query.page - 1) * query.limit
  const escapedQ = query.q?.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const tags = await Tag.find(
    escapedQ ? { name: { $regex: escapedQ, $options: "i" } } : {}
  )
    .sort({ [query.sort]: query.order === "asc" ? 1 : -1 })
    .skip(skip)
    .limit(query.limit + 1)
    .lean()

  const hasMore = tags.length > query.limit
  return { tags: tags.slice(0, query.limit), hasMore }
}

const createTag = async (name: string) => {
  const slug = generateSlug(name)
  const tag = await Tag.create({ name, slug })
  return tag
}

const updateTag = async (tagId: string, name: string) => {
  const slug = generateSlug(name)
  const tag = await Tag.findByIdAndUpdate(
    tagId,
    { name, slug },
    { returnDocument: "after" }
  ).lean()
  if (!tag) throw new NotFoundError("Tag not found")
  return tag
}

const deleteTag = async (tagId: string): Promise<void> => {
  const session = await mongoose.startSession()
  try {
    await session.withTransaction(async () => {
      const tag = await Tag.findByIdAndDelete(tagId)
      if (!tag) throw new NotFoundError("Tag not found")
      await Post.updateMany({ tags: tagId }, { $pull: { tags: tagId } })
    })
  } finally {
    await session.endSession()
  }
}

const getStats = async (startDate?: Date, endDate?: Date) => {
  const createdAt: Record<string, Date> = {}
  if (startDate) createdAt.$gte = startDate
  if (endDate) createdAt.$lte = endDate
  const dateFilter = Object.keys(createdAt).length > 0 ? { createdAt } : {}

  const [
    totalUsers, verifiedUsers, unverifiedUsers, bannedUsers,
    publishedPosts, draftPosts, archivedPosts,
    totalComments,
    totalTags
  ] = await Promise.all([
    User.countDocuments(dateFilter),
    User.countDocuments({ ...dateFilter, isVerified: true }),
    User.countDocuments({ ...dateFilter, isVerified: false }),
    User.countDocuments({ ...dateFilter, isBanned: true }),
    Post.countDocuments({ ...dateFilter, status: "published" }),
    Post.countDocuments({ ...dateFilter, status: "draft" }),
    Post.countDocuments({ ...dateFilter, status: "archived" }),
    Comment.countDocuments(dateFilter),
    Tag.countDocuments(dateFilter)
  ])

  return {
    users: { total: totalUsers, verified: verifiedUsers, unverified: unverifiedUsers, banned: bannedUsers },
    posts: { published: publishedPosts, draft: draftPosts, archived: archivedPosts },
    comments: totalComments,
    tags: totalTags
  }
}

export {
  getUsers,
  getUserById,
  updateUser,
  getPosts,
  getPostById,
  deletePost,
  deleteComment,
  getTags,
  createTag,
  updateTag,
  deleteTag,
  getStats
}