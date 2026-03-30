import type { Request, Response } from "express"
import * as tagService from "../services/tag.service.js"

const getPopularTags = async (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 10, 50)
  const { tags } = await tagService.getPopularTags(limit)
  res.status(200).json({ tags })
}

const getTagWithPosts = async (req: Request, res: Response) => {
  const tagSlug = req.params.tagSlug as string
  const page = Number(req.query.page) || 1
  const limit = Number(req.query.limit) || 10
  const { tag, posts, hasMore } = await tagService.getTagWithPosts(tagSlug, page, limit)
  res.status(200).json({ tag, posts, hasMore })
}

export {
  getPopularTags,
  getTagWithPosts
}