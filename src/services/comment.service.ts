import Post from "../models/Post.js"
import Comment from "../models/Comment.js"
import { BadRequestError, ConflictError, NotFoundError } from "../errors/index.js"
import Like from "../models/Like.js"
import mongoose, { mongo, Types } from "mongoose"
import { decode, paginate } from "../utils/cursor.js"
import notificationEmitter from "../config/notificationEmitter.js"

const getPostComments = async (
  postSlug: string,
  cursor: string | undefined,
  limit: number) => {
  const post = await Post.findOne({ slug: postSlug, status: "published" })
    .select("_id")
    .lean()
  if (!post) throw new NotFoundError("Post not found")

  const cursorFilter = cursor ? (() => {
    const { createdAt, id } = decode<{ createdAt: string, id: string }>(cursor)
    return {
      $or: [
        { createdAt: { $lt: new Date(createdAt) } },
        { createdAt: new Date(createdAt), _id: { $lt: new Types.ObjectId(id) } }
      ]
    }
  })() : {}

  const comments = await Comment.find(
    { post: post._id, parentComment: null, ...cursorFilter }
  )
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .select("-post")
    .populate("author", "-_id username name avatar")
    .lean()

  const { data, hasMore, nextCursor } = paginate(
    comments,
    limit,
    last => (
      { createdAt: last.createdAt.toISOString(), id: last._id.toString() }
    )
  )
  return { comments: data, hasMore, nextCursor }
}

const addComment = async (content: string, userId: string, postSlug: string) => {
  const session = await mongoose.startSession()
  let transaction
  try {
    transaction = await session.withTransaction(async () => {
      const commentedPost = await Post.findOne({ slug: postSlug, status: "published" })
        .select("_id author")
        .lean()
      if (!commentedPost) throw new NotFoundError("Post not found")

      const comment = await Comment.create({
        post: commentedPost._id,
        author: userId,
        content: content
      })

      await Post.findByIdAndUpdate(
        commentedPost._id,
        { $inc: { commentsCount: 1 }, $set: { lastActivityAt: new Date() } }
      )
      const { post, author, ...rest } = comment.toObject()
      return {
        commentData: rest,
        postAuthorId: commentedPost.author.toString(),
        postId: commentedPost._id.toString()
      }
    })
  } finally {
    await session.endSession()
  }

  notificationEmitter.emit("notification", {
    recipientId: transaction.postAuthorId,
    senderId: userId,
    type: "post_comment",
    postId: transaction.postId,
    commentId: transaction.commentData._id.toString()
  })

  return transaction.commentData
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
  let transaction
  try {
    transaction = await session.withTransaction(async () => {
      const comment = await Comment.findOne({ _id: commentId })
        .select("_id post author")
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
      return {
        authorId: comment.author.toString(),
        postId: comment.post._id.toString()
      }
    })
  } finally {
    await session.endSession()
  }

  notificationEmitter.emit("notification", {
    recipientId: transaction.authorId,
    senderId: userId,
    type: "comment_like",
    postId: transaction.postId,
    commentId: commentId,
  })
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
  cursor: string | undefined,
  limit: number
) => {
  const post = await Post.findOne({ slug: postSlug, status: "published" })
    .select("_id")
    .lean()
  if (!post) throw new NotFoundError("Post not found")

  const comment = await Comment.findOne({ _id: commentId, post: post._id })
    .select("_id")
    .lean()
  if (!comment) throw new NotFoundError("Comment not found")

  const cursorFilter = cursor
    ? { _id: { $lt: new Types.ObjectId(decode<{ id: string }>(cursor).id) } }
    : {}

  const likes = await Like.find({ comment: comment._id, type: "comment", ...cursorFilter })
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

const getCommentReplies = async (
  postSlug: string,
  commentId: string,
  cursor: string | undefined,
  limit: number
) => {
  const post = await Post.findOne({ slug: postSlug, status: "published" })
    .select("_id")
    .lean()
  if (!post) throw new NotFoundError("Post not found")

  const comment = await Comment.findOne(
    { _id: commentId, post: post._id, parentComment: null }
  )
    .select("_id")
    .lean()
  if (!comment) throw new NotFoundError("Comment not found")

  const cursorFilter = cursor ? (() => {
    const { createdAt, id } = decode<{ createdAt: string, id: string }>(cursor)
    return {
      $or: [
        { createdAt: { $gt: new Date(createdAt) } },
        { createdAt: new Date(createdAt), _id: { $gt: new Types.ObjectId(id) } }
      ]
    }
  })() : {}

  const replies = await Comment.find({ post: post._id, parentComment: comment._id, ...cursorFilter })
    .sort({ createdAt: 1, _id: 1 })
    .limit(limit + 1)
    .select("-post -repliesCount")
    .populate("author", "-_id username name avatar")
    .lean()

  const { data, hasMore, nextCursor } = paginate(
    replies,
    limit,
    last => (
      { createdAt: last.createdAt.toISOString(), id: last._id.toString() }
    )
  )
  return { replies: data, hasMore, nextCursor }
}

const addReply = async (
  content: string,
  userId: string,
  postSlug: string,
  commentId: string
) => {
  const session = await mongoose.startSession()
  let transaction
  try {
    transaction = await session.withTransaction(async () => {
      const comment = await Comment.findOne({ _id: commentId })
        .select("_id post author parentComment")
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
      await Post.findByIdAndUpdate(comment.post, { $inc: { commentsCount: 1 }, $set: { lastActivityAt: new Date() } })

      const { post, author, repliesCount, ...rest } = reply.toObject()
      return {
        replyData: rest,
        authorId: comment.author.toString(),
        postId: comment.post._id.toString()
      }
    })
  } finally {
    await session.endSession()
  }

  notificationEmitter.emit("notification", {
    recipientId: transaction.authorId,
    senderId: userId,
    type: "comment_reply",
    postId: transaction.postId,
    commentId: transaction.replyData._id.toString()
  })

  return transaction.replyData
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