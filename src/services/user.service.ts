import User from "../models/User.js"
import Post from "../models/Post.js"
import Comment from "../models/Comment.js"
import { NotFoundError, UnauthorizedError, BadRequestError, ConflictError } from "../errors/index.js"
import bcrypt from "bcryptjs"
import { sendVerificationEmail } from "../utils/email.js"
import { createVerificationToken } from "../utils/token.js"
import Like from "../models/Like.js"
import mongoose, { mongo, Types } from "mongoose"
import Follow from "../models/Follow.js"
import Tag from "../models/Tag.js"

const getMyProfile = async (userId: string) => {
  const user = await User.findById(userId)
    .select("-_id -createdAt -updatedAt")
    .lean()
  if (!user) throw new NotFoundError("User not found")

  const totalPosts = await Post.countDocuments({ author: userId, status: "published" })

  return { ...user, totalPosts }
}

const updateProfile = async (
  userId: string,
  data: { username?: string, name?: string, bio?: string, avatar?: string }
) => {
  const user = await User.findByIdAndUpdate(userId, data, { returnDocument: "after" })
  if (!user) throw new NotFoundError("User not found")
  return user
}

const deleteMyProfile = async (userId: string): Promise<void> => {
  const session = await mongoose.startSession()
  try {
    await session.withTransaction(async () => {
      const user = await User.findById(userId).lean()
      if (!user) throw new NotFoundError("User not found")

      const authorPosts = await Post.find({ author: userId })
        .select("_id tags status")
        .lean()
      const postIds = authorPosts.map(p => p._id)

      // delete comments on all of the user's own posts
      await Comment.deleteMany({ post: { $in: postIds } })

      // decrease postCount for tags.
      const allTagIds = authorPosts
        .filter(p => p.status === "published" && p.tags.length > 0)
        .flatMap(p => p.tags)
      if (allTagIds.length > 0) {
        const tagCounts = allTagIds.reduce((acc, tagId) => {
          const key = tagId.toString()
          acc[key] = (acc[key] ?? 0) + 1
          return acc
        }, {} as Record<string, number>)
        await Tag.bulkWrite(
          Object.entries(tagCounts).map(([tagId, count]) => ({
            updateOne: {
              filter: { _id: tagId },
              update: { $inc: { postCount: -count } }
            }
          }))
        )
      }

      // delete user's posts
      await Post.deleteMany({ _id: { $in: postIds } })

      const userLikes = await Like.find({ user: userId }).lean()
      const likedPostIds = userLikes
        .filter(l => l.type === "post" && !postIds.some(id => id.equals(l.post)))
        .map(l => l.post)
      const likedCommentIds = userLikes
        .filter(l => l.type === "comment")
        .map(l => l.comment)

      // decrease likesCount on all posts and comments that user previously liked
      await Post.updateMany({ _id: { $in: likedPostIds } }, { $inc: { likesCount: -1 } })
      await Comment.updateMany({ _id: { $in: likedCommentIds } }, { $inc: { likesCount: -1 } })

      // remove all likes that belongs to user and user's posts 
      await Like.deleteMany({ $or: [{ post: { $in: postIds } }, { user: userId }] })

      // fetch all user's comments on other users' posts in one query
      const userComments = await Comment.find({ post: { $nin: postIds }, author: userId })
        .select("post parentComment")
        .lean()
      const userCommentIds = userComments.map(c => c._id)

      if (userComments.length > 0) {
        // decrease commentsCount on all posts that user commented on
        const countPerPost = userComments.reduce((acc, comment) => {
          const postId = comment.post.toString()
          acc[postId] = (acc[postId] ?? 0) + 1
          return acc
        }, {} as Record<string, number>)
        await Post.bulkWrite(
          Object.entries(countPerPost).map(([postId, count]) => ({
            updateOne: {
              filter: { _id: postId },
              update: { $inc: { commentsCount: -count } }
            }
          }))
        )

        // decrease repliesCount on parent comments that user replied to
        const replies = userComments.filter(c => c.parentComment != null)
        const countPerParent = replies.reduce((acc, reply) => {
          const key = reply.parentComment!.toString()
          acc[key] = (acc[key] ?? 0) + 1
          return acc
        }, {} as Record<string, number>)
        if (Object.keys(countPerParent).length > 0) {
          await Comment.bulkWrite(
            Object.entries(countPerParent).map(([parentId, count]) => ({
              updateOne: {
                filter: { _id: parentId },
                update: { $inc: { repliesCount: -count } }
              }
            }))
          )
        }

        // handle orphaned replies from other users to this user's comments
        const orphanedReplies = await Comment.find({ parentComment: { $in: userCommentIds } })
          .select("post")
          .lean()
        if (orphanedReplies.length > 0) {
          const orphanCountPerPost = orphanedReplies.reduce((acc, reply) => {
            const postId = reply.post.toString()
            acc[postId] = (acc[postId] ?? 0) + 1
            return acc
          }, {} as Record<string, number>)
          await Post.bulkWrite(
            Object.entries(orphanCountPerPost).map(([postId, count]) => ({
              updateOne: {
                filter: { _id: postId },
                update: { $inc: { commentsCount: -count } }
              }
            }))
          )
        }
        await Like.deleteMany({ comment: { $in: userCommentIds } })
        await Comment.deleteMany({ parentComment: { $in: userCommentIds } })
      }

      // delete all comments that belongs to user
      await Comment.deleteMany({ author: userId })

      const follows = await Follow.find(
        { $or: [{ follower: userId }, { following: userId }] }
      ).lean()

      const followerIds = follows
        .filter(f => f.following.toString() === userId)
        .map(f => f.follower)
      const followingIds = follows
        .filter(f => f.follower.toString() === userId)
        .map(f => f.following)

      // decrement followersCount and followingCount for all users who followed 
      // or followed by deleted user
      await User.bulkWrite([
        ...followerIds.map(id => ({
          updateOne: {
            filter: { _id: id }, update: { $inc: { followingCount: -1 } }
          }
        })),
        ...followingIds.map(id => ({
          updateOne: {
            filter: { _id: id }, update: { $inc: { followersCount: -1 } }
          }
        }))
      ])

      // remove all follower and following relationships of the deleted user
      await Follow.deleteMany({ $or: [{ follower: userId }, { following: userId }] })

      // delete user in the end
      await User.deleteOne({ _id: userId })
    })
  } finally {
    await session.endSession()
  }
}

const getLikedPosts = async (userId: string, page: number, limit: number) => {
  const skip = (page - 1) * limit
  const likes = await Like.find({ user: userId, type: "post" })
    .sort("-createdAt")
    .skip(skip)
    .limit(limit + 1)
    .select("post")
    .lean()

  const hasMore = likes.length > limit
  const slicedPostIds = likes
    .slice(0, limit)
    .map(l => l.post)
    .filter((id): id is Types.ObjectId => id != null)

  const postsData = await Post.find({ _id: { $in: slicedPostIds }, status: "published" })
    .select("title author coverImage excerpt slug likesCount commentsCount publishedAt")
    .populate("author", "-_id username name avatar")
    .lean()

  const posts = slicedPostIds.map(id => {
    const post = postsData
      .find(post => post._id.toString() === id.toString())
    if (!post) return null
    const { _id, ...rest } = post
    return rest
  }).filter(Boolean)

  return { posts, hasMore }
}

const updateEmail = async (
  userId: string,
  email: string,
  password: string
): Promise<void> => {
  const user = await User.findById(userId).select("+password")
  if (!user) throw new NotFoundError("User not found")

  const isPasswordValid = await bcrypt.compare(password, user.password)
  if (!isPasswordValid) throw new UnauthorizedError("Invalid password")

  if (user.email === email)
    throw new BadRequestError("New email must be different from current email")

  user.email = email
  user.isVerified = false
  await user.save()

  const token = createVerificationToken(userId)
  await sendVerificationEmail(user.email, token)
}

const updatePassword = async (
  userId: string,
  oldPassword: string,
  newPassword: string
): Promise<void> => {
  const user = await User.findById(userId).select("+password")
  if (!user) throw new NotFoundError("User not found")

  const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password)
  if (!isOldPasswordValid) throw new UnauthorizedError("Invalid old password")

  if (oldPassword === newPassword)
    throw new BadRequestError("New password can not be the same with old password")

  const hashedNewPassword = await bcrypt.hash(newPassword, 10)
  user.password = hashedNewPassword
  user.refreshToken = null
  await user.save()
}

const getPublicProfile = async (username: string) => {
  const user = await User.findOne({ username: username })
    .select("_id username name avatar bio followersCount followingCount")
    .lean()
  if (!user) throw new NotFoundError("User not found")

  const totalPosts = await Post.countDocuments({ author: user._id, status: "published" })
  const { _id, ...rest } = user
  return { ...rest, totalPosts }
}

const getPostsByUsername = async (
  username: string,
  page: number,
  limit: number
) => {
  const skip = (page - 1) * limit
  const user = await User.findOne({ username: username }).select("_id").lean()
  if (!user) throw new NotFoundError("User not found")

  const posts = await Post.find({ author: user._id, status: "published" })
    .sort("-publishedAt")
    .skip(skip)
    .limit(limit)
    .select("-_id title coverImage excerpt slug likesCount commentsCount publishedAt")
    .lean()


  const total = await Post.countDocuments({ author: user._id, status: "published" })
  const hasMore = total > page * limit
  return { posts, hasMore, total }
}

const followUser = async (userId: string, username: string): Promise<void> => {
  const session = await mongoose.startSession()
  try {
    await session.withTransaction(async () => {
      const user = await User.findOne({ username: username })
        .select("_id")
        .lean()

      if (!user) throw new NotFoundError("User not found")
      if (user._id.toString() === userId)
        throw new BadRequestError("Cannot follow yourself")

      try {
        await Follow.create({ follower: userId, following: user._id })
      } catch (error) {
        if (error instanceof mongo.MongoServerError && error.code === 11000) {
          throw new ConflictError("Already following this user")
        }
        throw error
      }

      await User.bulkWrite([
        {
          updateOne: {
            filter: { _id: userId },
            update: { $inc: { followingCount: 1 } }
          }
        }, {
          updateOne: {
            filter: { _id: user._id },
            update: { $inc: { followersCount: 1 } }
          }
        }
      ])
    })
  } finally {
    await session.endSession()
  }
}

const unfollowUser = async (userId: string, username: string): Promise<void> => {
  const session = await mongoose.startSession()
  try {
    await session.withTransaction(async () => {
      const user = await User.findOne({ username: username })
        .select("_id")
        .lean()

      if (!user) throw new NotFoundError("User not found")
      if (user._id.toString() === userId)
        throw new BadRequestError("Cannot unfollow yourself")

      const unfollow = await Follow.findOneAndDelete(
        { follower: userId, following: user._id }
      )
      if (!unfollow) throw new BadRequestError("You are not following this user")
      await User.bulkWrite([
        {
          updateOne: {
            filter: { _id: userId },
            update: { $inc: { followingCount: -1 } }
          }
        }, {
          updateOne: {
            filter: { _id: user._id },
            update: { $inc: { followersCount: -1 } }
          }
        }
      ])
    })
  } finally {
    await session.endSession()
  }
}

const getFollowersList = async (username: string, page: number, limit: number) => {
  const skip = (page - 1) * limit
  const user = await User.findOne({ username: username })
    .select("_id")
    .lean()
  if (!user) throw new NotFoundError("User not found")

  let followers = await Follow.find({ following: user._id })
    .skip(skip)
    .limit(limit + 1)
    .select("-_id follower")
    .populate("follower", "-_id username name avatar")
    .lean()

  const hasMore = followers.length > limit
  const sliced = followers.slice(0, limit).map(f => f.follower)
  return { followers: sliced, hasMore }
}

const getFollowingList = async (username: string, page: number, limit: number) => {
  const skip = (page - 1) * limit
  const user = await User.findOne({ username: username })
    .select("_id")
    .lean()
  if (!user) throw new NotFoundError("User not found")

  const following = await Follow.find({ follower: user._id })
    .skip(skip)
    .limit(limit + 1)
    .select("-_id following")
    .populate("following", "-_id username name avatar")
    .lean()

  const hasMore = following.length > limit
  const sliced = following.slice(0, limit).map(f => f.following)
  return { following: sliced, hasMore }
}

export {
  getMyProfile,
  updateProfile,
  deleteMyProfile,
  getLikedPosts,
  updateEmail,
  updatePassword,
  getPublicProfile,
  getPostsByUsername,
  followUser,
  unfollowUser,
  getFollowersList,
  getFollowingList
}