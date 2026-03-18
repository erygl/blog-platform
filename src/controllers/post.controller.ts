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

export {
  getTrendingPosts,
  createPost,
  getFeed,
  getDrafts
}