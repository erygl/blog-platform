import { mongo, Types } from "mongoose"
import { ConflictError, NotFoundError } from "../errors/index.js"
import Bookmark from "../models/Bookmark.js"
import Post from "../models/Post.js"
import { decode, encode } from "../utils/cursor.js"

const addBookmark = async (postSlug: string, userId: string): Promise<void> => {
  const post = await Post.findOne({ slug: postSlug, status: "published" })
    .select("_id")
    .lean()
  if (!post) throw new NotFoundError("Post not found")

  try {
    await Bookmark.create({ user: userId, post: post._id })
  } catch (error) {
    if (error instanceof mongo.MongoServerError && error.code === 11000) {
      throw new ConflictError("Post already bookmarked")
    }
    throw error
  }
}

const removeBookmark = async (postSlug: string, userId: string): Promise<void> => {
  const post = await Post.findOne({ slug: postSlug })
    .select("_id")
    .lean()
  if (!post) throw new NotFoundError("Post not found")

  const unBookmark = await Bookmark.findOneAndDelete({ user: userId, post: post._id })
  if (!unBookmark) throw new NotFoundError("Bookmark not found")
}

const getBookmarks = async (userId: string, cursor: string | undefined, limit: number) => {
  const cursorFilter = cursor
    ? { _id: { $lt: new Types.ObjectId(decode<{ id: string }>(cursor).id) } }
    : {}

  const bookmarks = await Bookmark.find({ user: userId, ...cursorFilter })
    .sort({ _id: -1 })
    .limit(limit + 1)
    .select("post")
    .populate({
      path: "post",
      match: { status: "published" },
      select: "-_id title slug excerpt author coverImage likesCount commentsCount viewsCount publishedAt",
      populate: {
        path: "author",
        select: "-_id username name avatar"
      }
    })
    .lean()

  const hasMore = bookmarks.length > limit
  const sliced = bookmarks.slice(0, limit)
  const filteredBookmarks = sliced.map(b => b.post).filter(b => b !== null)
  const last = sliced[sliced.length - 1]
  const nextCursor = hasMore ? encode({ id: last._id.toString() }) : undefined
  return { bookmarks: filteredBookmarks, hasMore, nextCursor }
}

export {
  addBookmark,
  removeBookmark,
  getBookmarks
}