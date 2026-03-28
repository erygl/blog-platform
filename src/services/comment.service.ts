import Post from "../models/Post.js"
import Comment from "../models/Comment.js"
import { NotFoundError } from "../errors/index.js"
import Like from "../models/Like.js"

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
    .populate("author", "-_id username avatar")
    .lean()

  const hasMore = comments.length > limit
  return { comments, hasMore }
}

const addComment = async (content: string, userId: string, postSlug: string) => {
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

  await Promise.all([
    Like.deleteMany({ comment: { $in: [comment._id, ...replyIds] } }),
    Comment.deleteMany({ parentComment: comment._id }),
    Post.findByIdAndUpdate(
      post._id,
      { $inc: { commentsCount: -(1 + replies.length) } }
    ),
    ...comment.parentComment
      ? [Comment.findByIdAndUpdate(comment.parentComment,
        { $inc: { repliesCount: -1 } })]
      : []
  ])
}

export {
  getPostComments,
  addComment,
  editComment,
  deleteComment
}