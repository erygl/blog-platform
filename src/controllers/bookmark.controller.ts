import type { Request, Response } from "express"
import * as bookmarkService from "../services/bookmark.service.js"

const addBookmark = async (req: Request, res: Response) => {
  const postSlug = req.params.postSlug as string
  const userId = req.user!.userId
  await bookmarkService.addBookmark(postSlug, userId)
  res.status(201).json({ message: "Post added to bookmarks successfully" })
}

const removeBookmark = async (req: Request, res: Response) => {
  const postSlug = req.params.postSlug as string
  const userId = req.user!.userId
  await bookmarkService.removeBookmark(postSlug, userId)
  res.status(204).send()
}

const getBookmarks = async (req: Request, res: Response) => {
  const userId = req.user!.userId
  const cursor = req.query.cursor as string | undefined
  const limit = Number(req.query.limit) || 10
  const { bookmarks, hasMore, nextCursor } = await bookmarkService.getBookmarks(userId, cursor, limit)
  res.status(200).json({ bookmarks, hasMore, nextCursor })
}

export {
  addBookmark,
  removeBookmark,
  getBookmarks
}