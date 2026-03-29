import type { Request, Response } from "express"
import * as commentService from "../services/comment.service.js"
import * as commentValidation from "../validations/comment.validation.js"
const getPostComments = async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1
  const limit = Number(req.query.limit) || 10
  const postSlug = req.params.postSlug as string
  const { comments, hasMore } = await commentService.getPostComments(postSlug, page, limit)
  res.status(200).json({ comments, hasMore })
}

const addComment = async (req: Request, res: Response) => {
  const { content } = commentValidation.commentSchema.parse(req.body)
  const userId = req.user!.userId
  const postSlug = req.params.postSlug as string
  const comment = await commentService.addComment(content, userId, postSlug)
  res.status(201).json({ comment, message: "Comment created successfully" })
}

const editComment = async (req: Request, res: Response) => {
  const { content } = commentValidation.commentSchema.parse(req.body)
  const userId = req.user!.userId
  const postSlug = req.params.postSlug as string
  const commentId = req.params.commentId as string
  const comment = await commentService.editComment(content, userId, postSlug, commentId)
  res.status(200).json({ comment, message: "Comment updated sucessfully" })
}

const deleteComment = async (req: Request, res: Response) => {
  const userId = req.user!.userId
  const postSlug = req.params.postSlug as string
  const commentId = req.params.commentId as string
  await commentService.deleteComment(userId, postSlug, commentId)
  res.status(204).send()
}

const likeComment = async (req: Request, res: Response) => {
  const userId = req.user!.userId
  const postSlug = req.params.postSlug as string
  const commentId = req.params.commentId as string
  await commentService.likeComment(userId, postSlug, commentId)
  res.status(200).json({ message: "Comment liked successfully" })
}

const unlikeComment = async (req: Request, res: Response) => {
  const userId = req.user!.userId
  const postSlug = req.params.postSlug as string
  const commentId = req.params.commentId as string
  await commentService.unlikeComment(userId, postSlug, commentId)
  res.status(200).json({ message: "Comment unliked successfully" })
}

const getCommentLikes = async (req: Request, res: Response) => {
  const postSlug = req.params.postSlug as string
  const commentId = req.params.commentId as string
  const page = Number(req.query.page) || 1
  const limit = Number(req.query.limit) || 10
  const { likes, hasMore } = await commentService.getCommentLikes(postSlug, commentId, page, limit)
  res.status(200).json({ likes, hasMore })
}


const getCommentReplies = async (req: Request, res: Response) => {
  const postSlug = req.params.postSlug as string
  const commentId = req.params.commentId as string
  const page = Number(req.query.page) || 1
  const limit = Number(req.query.limit) || 10
  const { replies, hasMore } = await commentService.getCommentReplies(postSlug, commentId, page, limit)
  res.status(200).json({ replies, hasMore })
}

const addReply = async (req: Request, res: Response) => {
  const { content } = commentValidation.commentSchema.parse(req.body)
  const userId = req.user!.userId
  const postSlug = req.params.postSlug as string
  const commentId = req.params.commentId as string
  const reply = await commentService.addReply(content, userId, postSlug, commentId)
  res.status(201).json({ reply, message: "Reply created successfully" })
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