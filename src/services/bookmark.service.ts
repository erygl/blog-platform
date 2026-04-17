import { mongo } from "mongoose"
import { ConflictError, NotFoundError } from "../errors/index.js"
import Bookmark from "../models/Bookmark.js"
import Post from "../models/Post.js"

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

const getBookmarks = async (userId: string, page: number, limit: number) => {
  const skip = (page - 1) * limit
  const bookmarks = await Bookmark.find({ user: userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit + 1)
    .select("-_id post")
    .populate({
      path: "post",
      select: "-_id title slug excerpt author coverImage likesCount commentsCount viewsCount publishedAt",
      populate: {
        path: "author",
        select: "-_id username name avatar"
      }
    })
    .lean()

  const filteredBookmarks = bookmarks.map(b => b.post).filter(b => b !== null)

  const hasMore = filteredBookmarks.length > limit
  return { bookmarks: filteredBookmarks.slice(0, limit), hasMore }
}

export {
  addBookmark,
  removeBookmark,
  getBookmarks
}