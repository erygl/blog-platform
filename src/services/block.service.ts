import Block from "../models/Block.js"
import User from "../models/User.js"
import Follow from "../models/Follow.js"
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

      const removedFollow = await Follow.findOneAndDelete(
        { follower: blockerId, following: blockedUser._id }
      )
      const removedFollowing = await Follow.findOneAndDelete(
        { follower: blockedUser._id, following: blockerId }
      )

      const bulkOps: Parameters<typeof User.bulkWrite>[0] = []
      if (removedFollow) {
        bulkOps.push({
          updateOne: {
            filter:
              { _id: blockerId }, update: { $inc: { followingCount: -1 } }
          }
        }, {
          updateOne: {
            filter:
              { _id: blockedUser._id }, update: { $inc: { followersCount: -1 } }
          }
        })
      }
      if (removedFollowing) {
        bulkOps.push({
          updateOne: {
            filter:
              { _id: blockedUser._id }, update: { $inc: { followingCount: -1 } }
          }
        }, {
          updateOne: {
            filter: { _id: blockerId }, update: { $inc: { followersCount: -1 } }
          }
        })
      }
      if (bulkOps.length > 0) await User.bulkWrite(bulkOps)
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
