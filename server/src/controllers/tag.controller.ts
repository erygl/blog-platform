import type { Request, Response } from "express"
import * as tagService from "../services/tag.service.js"

const getPopularTags = async (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 10, 50)
  const { tags } = await tagService.getPopularTags(limit)
  res.status(200).json({ tags })
}

const getTagWithPosts = async (req: Request, res: Response) => {
  const tagSlug = req.params.tagSlug as string
  const cursor = req.query.cursor as string | undefined
  const limit = Number(req.query.limit) || 10
  const { tag, posts, hasMore, nextCursor } = await tagService.getTagWithPosts(tagSlug, cursor, limit, req.user?.userId)
  res.status(200).json({ tag, posts, hasMore, nextCursor })
}

export {
  getPopularTags,
  getTagWithPosts
}