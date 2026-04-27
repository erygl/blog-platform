import Post from "../models/Post.js";
import Tag from "../models/Tag.js";
import Comment from "../models/Comment.js";
import { generateSlug } from "../utils/slug.js";
import { ConflictError, NotFoundError } from "../errors/index.js";
import Like from "../models/Like.js";
import mongoose, { mongo, Types } from "mongoose";
import Follow from "../models/Follow.js"
import { assertNotBlocked, getBlockedIds } from "./block.service.js"
import { calcTrendingScore } from "../jobs/trendingScore.job.js"
import { estimatedReadTime } from "../utils/readTime.js";
import { decode, paginate } from "../utils/cursor.js";
import notificationEmitter from "../config/notificationEmitter.js";

const normalizeTagName = (name: string) =>
  name.replace(/\s+/g, " ").trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase())

const resolveTagIds = async (tagNames: string[]) => {
  if (tagNames.length === 0) return []
  const normalized = tagNames.map(normalizeTagName)
  await Tag.bulkWrite(
    normalized.map(name => ({
      updateOne: {
        filter: { name },
        update: { $setOnInsert: { name, slug: generateSlug(name) } },
        upsert: true
      }
    }))
  )

  const tags = await Tag.find({ name: { $in: normalized } })
    .select("_id name")
    .lean()

  return normalized.map(name => tags.find(t => t.name === name)!._id)
}

const getTrendingPosts = async (cursor: string | undefined, limit: number, userId?: string) => {
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
  const authorFilter = blockedIds.length > 0 ? { author: { $nin: blockedIds } } : {}

  const posts = await Post.find(
    { status: "published", ...cursorFilter, ...authorFilter }
  )
    .sort({ trendingScore: -1, _id: -1 })
    .limit(limit + 1)
    .select("title slug excerpt author coverImage likesCount commentsCount viewsCount publishedAt trendingScore")
    .populate("author", "username name avatar")
    .lean()

  const { data, hasMore, nextCursor } = paginate(
    posts,
    limit,
    last => ({ score: last.trendingScore, id: last._id.toString() })
  )
  const sliced = data.map(({ _id, trendingScore, ...rest }) => rest)
  return { posts: sliced, hasMore, nextCursor }
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
  const readingTime = estimatedReadTime(data.content)

  const session = await mongoose.startSession()
  try {
    return await session.withTransaction(async () => {
      const tagIds = await resolveTagIds(data.tags ?? [])

      const publishedAt = data.status === "published" ? new Date() : null
      const post = await Post.create({
        ...data,
        author: userId,
        slug,
        excerpt,
        readingTime,
        tags: tagIds,
        publishedAt,
        ...(publishedAt && {
          trendingScore: calcTrendingScore(
            { likesCount: 0, commentsCount: 0, viewsCount: 0, publishedAt }
          )
        })
      })

      if (data.status === "published") {
        await Tag.updateMany({ _id: { $in: tagIds } }, { $inc: { postCount: 1 } })
      }

      return post
    })
  } finally {
    await session.endSession()
  }

}

const getFeed = async (
  userId: string,
  cursor: string | undefined,
  limit: number
) => {
  const cursorFilter = cursor ? (() => {
    const { publishedAt, id } = decode<{ publishedAt: string, id: string }>(cursor)
    return {
      $or: [
        { publishedAt: { $lt: new Date(publishedAt) } },
        { publishedAt: new Date(publishedAt), _id: { $lt: new Types.ObjectId(id) } }
      ]
    }
  })() : {}

  const followedUsers = await Follow.find({ follower: userId }).select("following").lean()
  const followedUserIds = followedUsers.map(f => f.following)
  const posts = await Post.find(
    { author: { $in: followedUserIds }, status: "published", ...cursorFilter }
  )
    .sort({ publishedAt: -1, _id: -1 })
    .limit(limit + 1)
    .select("title slug excerpt author coverImage likesCount commentsCount viewsCount publishedAt")
    .populate("author", "-_id username name avatar")
    .lean()

  const { data, hasMore, nextCursor } = paginate(
    posts,
    limit,
    last => (
      { publishedAt: last.publishedAt!.toISOString(), id: last._id.toString() }
    )
  )
  const sliced = data.map(({ _id, ...rest }) => rest)
  return { posts: sliced, hasMore, nextCursor }
}

const getDrafts = async (
  userId: string,
  cursor: string | undefined,
  limit: number
) => {
  const cursorFilter = cursor
    ? { _id: { $lt: new Types.ObjectId(decode<{ id: string }>(cursor).id) } }
    : {}

  const drafts = await Post.find({ author: userId, status: "draft", ...cursorFilter })
    .sort({ _id: -1 })
    .limit(limit + 1)
    .select("title slug excerpt updatedAt")
    .lean()

  const { data, hasMore, nextCursor } = paginate(
    drafts,
    limit,
    last => ({ id: last._id.toString() })
  )
  const result = data.map(({ _id, ...rest }) => rest)
  return { drafts: result, hasMore, nextCursor }
}

const getSingleDraft = async (userId: string, postSlug: string) => {
  const draft = await Post.findOne({
    author: userId,
    slug: postSlug,
    status: "draft"
  })
    .select("-excerpt -trendingScore")
    .populate("author", "-_id username name avatar")
    .populate("tags", "-_id name slug")
    .lean()

  if (!draft) throw new NotFoundError("Draft not found")
  return draft
}

const getSinglePost = async (postSlug: string, viewerId?: string) => {
  const post = await Post.findOneAndUpdate(
    { slug: postSlug, status: "published" },
    { $inc: { viewsCount: 1 } },
    { returnDocument: "after" }
  )
    .select("-_id -status -excerpt -trendingScore -createdAt -updatedAt")
    .populate("author", "_id username name avatar")
    .populate("tags", "-_id name slug")
    .lean()

  if (!post) throw new NotFoundError("Post not found")

  const author = post.author as unknown as {
    _id: Types.ObjectId; username: string; name: string; avatar: string
  }
  if (viewerId) await assertNotBlocked(viewerId, author._id.toString())

  const { _id, ...authorWithout } = author
  return { ...post, author: authorWithout }
}

const updatePost = async (
  data: {
    title?: string,
    content?: string,
    status?: "draft" | "published",
    coverImage?: string,
    tags?: string[]
  },
  postSlug: string,
  userId: string
) => {

  const readingTime = data.content ? estimatedReadTime(data.content) : undefined

  const session = await mongoose.startSession()
  try {
    return await session.withTransaction(async () => {
      const post = await Post.findOne({ slug: postSlug }).lean()
      if (!post || post.author.toString() !== userId)
        throw new NotFoundError("Post not found")

      let tagIds;
      if (data.tags) {
        tagIds = await resolveTagIds(data.tags)
      }

      const isPublishing = !post.publishedAt && data.status === "published"
      const publishedAt = isPublishing ? new Date() : post.publishedAt
      const updatedPost = await Post.findOneAndUpdate(
        { slug: postSlug },
        {
          ...data,
          excerpt: data.content ? data.content.slice(0, 100).trimEnd() : post.excerpt,
          ...(readingTime !== undefined && { readingTime }),
          tags: tagIds ?? post.tags,
          publishedAt,
          ...(isPublishing && {
            trendingScore: calcTrendingScore(
              { likesCount: 0, commentsCount: 0, viewsCount: 0, publishedAt: publishedAt! }
            )
          })
        },
        { returnDocument: "after" }
      )
      // update postCounts based on post status
      const newStatus = data.status ?? post.status
      const newTagIds = tagIds ?? post.tags
      const currentlyCounted = post.status === "published" ? post.tags : []
      const newCounted = newStatus === "published" ? newTagIds : []
      await Tag.bulkWrite([
        {
          updateMany: {
            filter: { _id: { $in: currentlyCounted, $nin: newCounted } },
            update: { $inc: { postCount: -1 } }
          }
        }, {
          updateMany: {
            filter: { _id: { $in: newCounted, $nin: currentlyCounted } },
            update: { $inc: { postCount: 1 } }
          }
        }
      ])

      return updatedPost
    })
  } finally {
    await session.endSession()
  }
}

const deletePost = async (postSlug: string, userId: string): Promise<void> => {
  const session = await mongoose.startSession()
  try {
    await session.withTransaction(async () => {
      const post = await Post.findOneAndDelete({ slug: postSlug, author: userId })
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

const likePost = async (postSlug: string, userId: string): Promise<void> => {
  const session = await mongoose.startSession()
  let transaction
  try {
    transaction = await session.withTransaction(async () => {
      const post = await Post.findOne({ slug: postSlug, status: "published" })
        .select("_id author").lean()
      if (!post) throw new NotFoundError("Post not found")

      try {
        await Like.create({ user: userId, post: post._id, type: "post" })
      } catch (error) {
        if (error instanceof mongo.MongoServerError && error.code === 11000) {
          throw new ConflictError("Post already liked")
        }
        throw error
      }
      await Post.findByIdAndUpdate(post._id, {
        $inc: { likesCount: 1 }, $set: { lastActivityAt: new Date() }
      })
      return {
        recipientId: post.author.toString(),
        postId: post._id.toString()
      }
    })
  } finally {
    await session.endSession()
  }

  notificationEmitter.emit("notification", {
    recipientId: transaction.recipientId,
    senderId: userId,
    type: "post_like",
    postId: transaction.postId
  })
}

const unlikePost = async (postSlug: string, userId: string): Promise<void> => {
  const session = await mongoose.startSession()
  try {
    await session.withTransaction(async () => {
      const post = await Post.findOne({ slug: postSlug, status: "published" })
        .select("_id").lean()
      if (!post) throw new NotFoundError("Post not found")

      const unlike = await Like.findOneAndDelete({ user: userId, post: post._id, type: "post" })
      if (!unlike) throw new ConflictError("Post not liked")
      await Post.findByIdAndUpdate(post._id, { $inc: { likesCount: -1 } })
    })
  } finally {
    await session.endSession()
  }
}

const getPostLikes = async (
  postSlug: string,
  cursor: string | undefined,
  limit: number
) => {
  const post = await Post.findOne({ slug: postSlug, status: "published" })
    .select("_id")
    .lean()

  if (!post) throw new NotFoundError("Post not found")

  const cursorFilter = cursor
    ? { _id: { $lt: new Types.ObjectId(decode<{ id: string }>(cursor).id) } }
    : {}

  const likes = await Like.find({ post: post._id, ...cursorFilter })
    .sort({ _id: -1 })
    .limit(limit + 1)
    .select("user")
    .populate({
      path: "user",
      match: { isBanned: false },
      select: "-_id username name avatar bio"
    })
    .lean()

  const { data, hasMore, nextCursor } = paginate(
    likes,
    limit,
    last => ({ id: last._id.toString() })
  )
  const mappedLikes = data.map(l => l.user).filter(Boolean)
  return { likes: mappedLikes, hasMore, nextCursor }
}

export {
  getTrendingPosts,
  createPost,
  getFeed,
  getDrafts,
  getSingleDraft,
  getSinglePost,
  updatePost,
  deletePost,
  likePost,
  unlikePost,
  getPostLikes
}