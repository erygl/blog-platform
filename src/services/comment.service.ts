import Post from "../models/Post.js"
import Comment from "../models/Comment.js"
import { BadRequestError, ConflictError, NotFoundError } from "../errors/index.js"
import Like from "../models/Like.js"
import mongoose, { mongo } from "mongoose"

const getPostComments = async (postSlug: string, page: number, limit: number) => {
  const post = await Post.findOne({ slug: postSlug, status: "published" })
    .select("_id")
    .lean()
  if (!post) throw new NotFoundError("Post not found")

  const skip = (page - 1) * limit
  const comments = await Comment.find({ post: post._id, parentComment: null })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit + 1)
    .select("-post")
    .populate("author", "-_id username name avatar")
    .lean()

  const hasMore = comments.length > limit
  return { comments: comments.slice(0, limit), hasMore }
}

const addComment = async (content: string, userId: string, postSlug: string) => {
  const session = await mongoose.startSession()
  try {
    return await session.withTransaction(async () => {
      const commentedPost = await Post.findOne({ slug: postSlug, status: "published" })
        .select("_id")
        .lean()
      if (!commentedPost) throw new NotFoundError("Post not found")

      const comment = await Comment.create({
        post: commentedPost._id,
        author: userId,
        content: content
      })

      await Post.findByIdAndUpdate(commentedPost._id, { $inc: { commentsCount: 1 } })
      const { post, author, ...rest } = comment.toObject()
      return rest
    })
  } finally {
    await session.endSession()
  }
}

const editComment = async (
  content: string,
  userId: string,
  postSlug: string,
  commentId: string
) => {
  const commentedPost = await Post.findOne({ slug: postSlug, status: "published" })
    .select("_id")
    .lean()
  if (!commentedPost) throw new NotFoundError("Post not found")

  const comment = await Comment.findOneAndUpdate(
    { _id: commentId, post: commentedPost._id, author: userId },
    { content, isEdited: true },
    { returnDocument: "after" }
  )
  if (!comment) throw new NotFoundError("Comment not found")

  const { post, author, ...rest } = comment.toObject()
  return rest
}

const deleteComment = async (
  userId: string,
  postSlug: string,
  commentId: string
): Promise<void> => {
  const session = await mongoose.startSession()
  try {
    await session.withTransaction(async () => {
      const post = await Post.findOne({ slug: postSlug, status: "published" })
        .select("_id")
        .lean()
      if (!post) throw new NotFoundError("Post not found")

      const comment = await Comment.findOneAndDelete(
        { _id: commentId, post: post._id, author: userId }
      )
      if (!comment) throw new NotFoundError("Comment not found")

      const replies = await Comment.find({ parentComment: comment._id })
        .select("_id")
        .lean()
      const replyIds = replies.map(r => r._id)

      await Like.deleteMany({ comment: { $in: [comment._id, ...replyIds] } })
      await Comment.deleteMany({ parentComment: comment._id })
      await Post.findByIdAndUpdate(
        post._id,
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

const likeComment = async (
  userId: string,
  postSlug: string,
  commentId: string
): Promise<void> => {
  const session = await mongoose.startSession()
  try {
    await session.withTransaction(async () => {
      const comment = await Comment.findOne({ _id: commentId })
        .select("_id")
        .populate({ path: "post", match: { slug: postSlug, status: "published" } })
        .lean()
      if (!comment || !comment.post) throw new NotFoundError("Comment not found")

      try {
        await Like.create({ user: userId, comment: commentId, type: "comment" })
      } catch (error) {
        if (error instanceof mongo.MongoServerError && error.code === 11000) {
          throw new ConflictError("Comment already liked")
        }
        throw error
      }

      await Comment.findByIdAndUpdate(commentId, { $inc: { likesCount: 1 } })
    })
  } finally {
    await session.endSession()
  }
}

const unlikeComment = async (
  userId: string,
  postSlug: string,
  commentId: string
): Promise<void> => {
  const session = await mongoose.startSession()
  try {
    await session.withTransaction(async () => {
      const comment = await Comment.findOne({ _id: commentId })
        .select("_id")
        .populate({ path: "post", match: { slug: postSlug, status: "published" } })
        .lean()
      if (!comment || !comment.post) throw new NotFoundError("Comment not found")

      const unlike = await Like.findOneAndDelete(
        { user: userId, comment: comment._id, type: "comment" }
      )
      if (!unlike) throw new ConflictError("Comment not liked")
      await Comment.findByIdAndUpdate(commentId, { $inc: { likesCount: -1 } })
    })
  } finally {
    await session.endSession()
  }
}

const getCommentLikes = async (
  postSlug: string,
  commentId: string,
  page: number,
  limit: number
) => {
  const post = await Post.findOne({ slug: postSlug, status: "published" })
    .select("_id")
    .lean()
  if (!post) throw new NotFoundError("Post not found")

  const skip = (page - 1) * limit
  const comment = await Comment.findOne({ _id: commentId, post: post._id })
    .select("_id likesCount")
    .lean()
  if (!comment) throw new NotFoundError("Comment not found")

  const likes = await Like.find({ comment: comment._id, type: "comment" })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select("-_id user")
    .populate("user", "-_id username name avatar bio")
    .lean()

  const hasMore = skip + limit < comment.likesCount
  return { likes: likes.map(l => l.user), hasMore }
}

const getCommentReplies = async (
  postSlug: string,
  commentId: string,
  page: number,
  limit: number
) => {
  const post = await Post.findOne({ slug: postSlug, status: "published" })
    .select("_id")
    .lean()
  if (!post) throw new NotFoundError("Post not found")

  const comment = await Comment.findOne(
    { _id: commentId, post: post._id, parentComment: null }
  )
    .select("_id repliesCount")
    .lean()
  if (!comment) throw new NotFoundError("Comment not found")

  const skip = (page - 1) * limit
  const replies = await Comment.find({ post: post._id, parentComment: comment._id })
    .sort({ createdAt: 1 })
    .skip(skip)
    .limit(limit + 1)
    .select("-post -repliesCount")
    .populate("author", "-_id username name avatar")
    .lean()

  const hasMore = replies.length > limit
  return { replies: replies.slice(0, limit), hasMore }
}

const addReply = async (
  content: string,
  userId: string,
  postSlug: string,
  commentId: string
) => {
  const session = await mongoose.startSession()
  try {
    return await session.withTransaction(async () => {
      const comment = await Comment.findOne({ _id: commentId })
        .select("_id parentComment")
        .populate(
          {
            path: "post",
            match: { slug: postSlug, status: "published" },
            select: "_id"
          })
        .lean()
      if (!comment || !comment.post) throw new NotFoundError("Comment not found")
      if (comment.parentComment) throw new BadRequestError("Cannot reply to a reply")

      const reply = await Comment.create({
        post: comment.post,
        author: userId,
        content: content,
        parentComment: comment._id
      })

      await Comment.findByIdAndUpdate(comment._id, { $inc: { repliesCount: 1 } })
      await Post.findByIdAndUpdate(comment.post, { $inc: { commentsCount: 1 } })

      const { post, author, repliesCount, ...rest } = reply.toObject()
      return rest
    })
  } finally {
    await session.endSession()
  }
}

export {
  getPostComments,
  addComment,
  editComment,
  deleteComment,
  likeComment,
  unlikeComment,
  getCommentLikes,
  getCommentReplies,
  addReply
}