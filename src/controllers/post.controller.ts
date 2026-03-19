import type { Request, Response } from "express"
import * as postService from "../services/post.service.js"
import * as postValidation from "../validations/post.validation.js"

const getTrendingPosts = async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1
  const limit = Number(req.query.limit) || 10

  const posts = await postService.getTrendingPosts(page, limit)
  res.status(200).json({ posts })
}

const createPost = async (req: Request, res: Response) => {
  const data = postValidation.createPostSchema.parse(req.body)
  const userId = req.user!.userId

  const post = await postService.createPost(data, userId)
  res.status(201).json({ post, message: "Post created successfully" })
}

const getFeed = async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1
  const limit = Number(req.query.limit) || 10
  const userId = req.user!.userId

  const posts = await postService.getFeed(userId, page, limit)
  res.status(200).json({ posts })
}

const getDrafts = async (req: Request, res: Response) => {
  const userId = req.user!.userId
  const drafts = await postService.getDrafts(userId)

  res.status(200).json({ drafts })
}

const getSingleDraft = async (req: Request, res: Response) => {
  const userId = req.user!.userId
  const postSlug = req.params.postSlug as string

  const draft = await postService.getSingleDraft(userId, postSlug)
  res.status(200).json({ draft })
}

const getSinglePost = async (req: Request, res: Response) => {
  const postSlug = req.params.postSlug as string
  const post = await postService.getSinglePost(postSlug)

  res.status(200).json({ post })
}

const updatePost = async (req: Request, res: Response) => {
  const data = postValidation.updatePostSchema.parse(req.body)
  const postSlug = req.params.postSlug as string
  const userId = req.user!.userId

  const post = await postService.updatePost(data, postSlug, userId)
  res.status(200).json({ post, message: "Post updated successfully" })
}

const deletePost = async (req: Request, res: Response) => {
  const postSlug = req.params.postSlug as string
  const userId = req.user!.userId

  await postService.deletePost(postSlug, userId)
  res.status(204).send()
}

const likePost = async (req: Request, res: Response) => {
  const postSlug = req.params.postSlug as string
  const userId = req.user!.userId
  await postService.likePost(postSlug, userId)

  res.status(200).json({ message: "Post liked successfully" })
}

const unLikePost = async (req: Request, res: Response) => {
  const postSlug = req.params.postSlug as string
  const userId = req.user!.userId

  await postService.unLikePost(postSlug, userId)

  res.status(200).json({ message: "Post unliked successfully" })
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
  unLikePost
}