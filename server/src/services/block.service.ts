import Block from "../models/Block.js"
import User from "../models/User.js"
import Follow from "../models/Follow.js"
import Post from "../models/Post.js"
import Comment from "../models/Comment.js"
import Like from "../models/Like.js"
import Bookmark from "../models/Bookmark.js"
import { BadRequestError, ConflictError, NotFoundError } from "../errors/index.js"
import { startSession, mongo, Types } from "mongoose"
import { decode, paginate } from "../utils/cursor.js"

const assertNotBlocked = async (
  viewerId: string,
  targetId: string
): Promise<void> => {
  const block = await Block.exists({
    $or: [
      { blocker: viewerId, blocked: targetId },
      { blocker: targetId, blocked: viewerId }
    ]
  })
  if (block) throw new NotFoundError("User not found")
}

const getBlockedIds = async (userId: string): Promise<Types.ObjectId[]> => {
  const blocks = await Block.find({
    $or: [{ blocker: userId }, { blocked: userId }]
  }).select("blocker blocked").lean()

  return blocks.map(b =>
    b.blocker.toString() === userId ? b.blocked : b.blocker
  )
}

const blockUser = async (
  blockerId: string,
  blockedUsername: string
): Promise<void> => {
  const session = await startSession()
  try {
    await session.withTransaction(async () => {
      const blockedUser = await User.findOne({ username: blockedUsername })
        .select("_id")
        .lean()
      if (!blockedUser) throw new NotFoundError("User not found")
      if (blockedUser._id.toString() === blockerId)
        throw new BadRequestError("Cannot block yourself")

      const blockCount = await Block.countDocuments({ blocker: blockerId })
      if (blockCount >= 500) throw new BadRequestError("Block limit of 500 reached")

      try {
        await Block.create({ blocker: blockerId, blocked: blockedUser._id })
      } catch (error) {
        if (error instanceof mongo.MongoServerError && error.code === 11000) {
          throw new ConflictError("User is already blocked")
        }
        throw error
      }

      const blockerObjId = new Types.ObjectId(blockerId)
      const blockedId = blockedUser._id

      const removedFollow = await Follow.findOneAndDelete(
        { follower: blockerId, following: blockedId }
      )
      const removedFollowing = await Follow.findOneAndDelete(
        { follower: blockedId, following: blockerId }
      )

      const userBulkOps: Parameters<typeof User.bulkWrite>[0] = []
      if (removedFollow) {
        userBulkOps.push(
          { updateOne: { filter: { _id: blockerId }, update: { $inc: { followingCount: -1 } } } },
          { updateOne: { filter: { _id: blockedId }, update: { $inc: { followersCount: -1 } } } }
        )
      }
      if (removedFollowing) {
        userBulkOps.push(
          { updateOne: { filter: { _id: blockedId }, update: { $inc: { followingCount: -1 } } } },
          { updateOne: { filter: { _id: blockerObjId }, update: { $inc: { followersCount: -1 } } } }
        )
      }
      if (userBulkOps.length > 0) await User.bulkWrite(userBulkOps)

      // Collect post/comment IDs for both users
      const blockerPostIds = await Post.distinct("_id", { author: blockerId }) as Types.ObjectId[]
      const blockedPostIds = await Post.distinct("_id", { author: blockedId }) as Types.ObjectId[]
      const blockerCommentIds = await Comment.distinct("_id", { author: blockerId }) as Types.ObjectId[]
      const blockedCommentIds = await Comment.distinct("_id", { author: blockedId }) as Types.ObjectId[]

      // All counter changes accumulate here
      const postDeltas = new Map<string, { likesCount?: number; commentsCount?: number }>()
      const commentDeltas = new Map<string, { likesCount?: number; repliesCount?: number }>()

      const incPost = (id: string, field: "likesCount" | "commentsCount") => {
        const e = postDeltas.get(id) ?? {}
        postDeltas.set(id, { ...e, [field]: (e[field] ?? 0) - 1 })
      }
      const incComment = (id: string, field: "likesCount" | "repliesCount") => {
        const e = commentDeltas.get(id) ?? {}
        commentDeltas.set(id, { ...e, [field]: (e[field] ?? 0) - 1 })
      }

      // Post likes (both directions)
      if (blockedPostIds.length > 0) {
        const likes = await Like.find(
          { user: blockerObjId, type: "post", post: { $in: blockedPostIds } }
        ).select("post").lean()
        if (likes.length > 0) {
          for (const l of likes) incPost(l.post!.toString(), "likesCount")
          await Like.deleteMany({ user: blockerObjId, type: "post", post: { $in: blockedPostIds } })
        }
      }

      if (blockerPostIds.length > 0) {
        const likes = await Like.find(
          { user: blockedId, type: "post", post: { $in: blockerPostIds } }
        ).select("post").lean()
        if (likes.length > 0) {
          for (const l of likes) incPost(l.post!.toString(), "likesCount")
          await Like.deleteMany({ user: blockedId, type: "post", post: { $in: blockerPostIds } })
        }
      }

      // Comment likes (both directions)
      if (blockedCommentIds.length > 0) {
        const likes = await Like.find(
          { user: blockerObjId, type: "comment", comment: { $in: blockedCommentIds } }
        ).select("comment").lean()
        if (likes.length > 0) {
          for (const l of likes) incComment(l.comment!.toString(), "likesCount")
          await Like.deleteMany({ user: blockerObjId, type: "comment", comment: { $in: blockedCommentIds } })
        }
      }

      if (blockerCommentIds.length > 0) {
        const likes = await Like.find(
          { user: blockedId, type: "comment", comment: { $in: blockerCommentIds } }
        ).select("comment").lean()
        if (likes.length > 0) {
          for (const l of likes) incComment(l.comment!.toString(), "likesCount")
          await Like.deleteMany({ user: blockedId, type: "comment", comment: { $in: blockerCommentIds } })
        }
      }

      // Comments (top-level + replies) by blocker on blocked's posts
      if (blockedPostIds.length > 0) {
        const comments = await Comment.find(
          { author: blockerObjId, post: { $in: blockedPostIds } }
        ).select("_id parentComment post").lean()
        if (comments.length > 0) {
          const ids = comments.map(c => c._id)
          for (const c of comments) {
            incPost(c.post.toString(), "commentsCount")
            if (c.parentComment) incComment(c.parentComment.toString(), "repliesCount")
          }
          await Like.deleteMany({ comment: { $in: ids } })
          await Comment.deleteMany({ _id: { $in: ids } })
        }
      }

      // Comments (top-level + replies) by blocked on blocker's posts
      if (blockerPostIds.length > 0) {
        const comments = await Comment.find(
          { author: blockedId, post: { $in: blockerPostIds } }
        ).select("_id parentComment post").lean()
        if (comments.length > 0) {
          const ids = comments.map(c => c._id)
          for (const c of comments) {
            incPost(c.post.toString(), "commentsCount")
            if (c.parentComment) incComment(c.parentComment.toString(), "repliesCount")
          }
          await Like.deleteMany({ comment: { $in: ids } })
          await Comment.deleteMany({ _id: { $in: ids } })
        }
      }

      // Blocker's replies on blocked's comments on third-party posts
      if (blockedCommentIds.length > 0) {
        const replies = await Comment.find({
          author: blockerObjId,
          parentComment: { $in: blockedCommentIds },
          post: { $nin: blockedPostIds }
        }).select("_id parentComment post").lean()
        if (replies.length > 0) {
          const ids = replies.map(r => r._id)
          for (const r of replies) {
            incPost(r.post.toString(), "commentsCount")
            incComment(r.parentComment!.toString(), "repliesCount")
          }
          await Like.deleteMany({ comment: { $in: ids } })
          await Comment.deleteMany({ _id: { $in: ids } })
        }
      }

      // Blocked's replies on blocker's comments on third-party posts
      if (blockerCommentIds.length > 0) {
        const replies = await Comment.find({
          author: blockedId,
          parentComment: { $in: blockerCommentIds },
          post: { $nin: blockerPostIds }
        }).select("_id parentComment post").lean()
        if (replies.length > 0) {
          const ids = replies.map(r => r._id)
          for (const r of replies) {
            incPost(r.post.toString(), "commentsCount")
            incComment(r.parentComment!.toString(), "repliesCount")
          }
          await Like.deleteMany({ comment: { $in: ids } })
          await Comment.deleteMany({ _id: { $in: ids } })
        }
      }

      // Bookmarks of each other's posts
      if (blockedPostIds.length > 0)
        await Bookmark.deleteMany({ user: blockerObjId, post: { $in: blockedPostIds } })
      if (blockerPostIds.length > 0)
        await Bookmark.deleteMany({ user: blockedId, post: { $in: blockerPostIds } })

      // Flush all accumulated counter deltas
      if (postDeltas.size > 0) {
        await Post.bulkWrite(
          [...postDeltas.entries()].map(([id, deltas]) => ({
            updateOne: { filter: { _id: new Types.ObjectId(id) }, update: { $inc: deltas } }
          }))
        )
      }
      if (commentDeltas.size > 0) {
        await Comment.bulkWrite(
          [...commentDeltas.entries()].map(([id, deltas]) => ({
            updateOne: { filter: { _id: new Types.ObjectId(id) }, update: { $inc: deltas } }
          }))
        )
      }
    })
  } finally {
    await session.endSession()
  }
}

const unblockUser = async (
  blockerId: string,
  blockedUsername: string
): Promise<void> => {
  const blockedUser = await User.findOne({ username: blockedUsername })
    .select("_id")
    .lean()
  if (!blockedUser) throw new NotFoundError("User not found")

  const block = await Block.findOneAndDelete(
    { blocker: blockerId, blocked: blockedUser._id }
  )
  if (!block) throw new NotFoundError("Block not found")
}

const getBlockList = async (
  userId: string,
  cursor: string | undefined,
  limit: number
) => {
  const cursorFilter = cursor
    ? { _id: { $lt: new Types.ObjectId(decode<{ id: string }>(cursor).id) } }
    : {}

  const blocks = await Block.find({ blocker: userId, ...cursorFilter })
    .sort({ _id: -1 })
    .limit(limit + 1)
    .populate("blocked", "-_id username name avatar")
    .lean()

  const { data, hasMore, nextCursor } = paginate(
    blocks,
    limit,
    last => ({ id: last._id.toString() })
  )
  const users = data.map(b => b.blocked)
  return { users, hasMore, nextCursor }
}

export {
  getBlockedIds,
  assertNotBlocked,
  blockUser,
  unblockUser,
  getBlockList
}
