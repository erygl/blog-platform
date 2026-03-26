import User from "../models/User.js"
import Post from "../models/Post.js"
import Comment from "../models/Comment.js"
import { NotFoundError, UnauthorizedError, BadRequestError } from "../errors/index.js"
import bcrypt from "bcryptjs"
import { sendVerificationEmail } from "../utils/email.js"
import { createVerificationToken } from "../utils/token.js"
import Like from "../models/Like.js"
import { Types } from "mongoose"
import Follow from "../models/Follow.js"

const getMyProfile = async (userId: string) => {
  const user = await User.findById(userId)
    .select("-_id -createdAt -updatedAt")
    .lean()
  if (!user) throw new NotFoundError("User not found")

  const totalPosts = await Post.countDocuments({ author: userId, status: "published" })

  return {
    user: {
      ...user,
      totalPosts
    },
  }
}

const updateProfile = async (
  userId: string,
  data: { username?: string, bio?: string, avatar?: string }
) => {
  const user = await User.findByIdAndUpdate(userId, data, { returnDocument: "after" })
  if (!user) throw new NotFoundError("User not found")
  return user
}

const deleteMyProfile = async (userId: string): Promise<void> => {
  const user = await User.findById(userId)
  if (!user) throw new NotFoundError("User not found")

  const posts = await Post.find({ author: userId }).select("_id").lean()
  const postIds = posts.map(p => p._id)

  // delete comments and likes on all of the user's own posts
  await Promise.all([
    Comment.deleteMany({ post: { $in: postIds } }),
    Like.deleteMany({ post: { $in: postIds } })
  ])

  // delete user's posts
  await Post.deleteMany({ _id: { $in: postIds } })

  // decrease likesCount on all posts that user previously liked
  const likedPosts = await Like.find({ user: userId, post: { $nin: postIds } })
    .select("post")
    .lean()
  const likedPostIds = likedPosts.map(l => l.post)
  await Post.updateMany({ _id: { $in: likedPostIds } }, { $inc: { likesCount: -1 } })

  // decrease likesCount on all comments that user previously liked
  const likedComments = await Like.find({ user: userId, type: "comment" })
    .select("comment")
    .lean()
  const likedCommentIds = likedComments.map(l => l.comment)
  await Comment.updateMany({ _id: { $in: likedCommentIds } }, { $inc: { likesCount: -1 } })

  // remove all likes that belongs to user 
  await Like.deleteMany({ user: userId })

  // decrease commentsCount on all posts that user previously replied
  const comments = await Comment.find({ author: userId, post: { $nin: postIds } })
    .select("post")
    .lean()
  const countPerPost = comments.reduce((acc, comment) => {
    const postId = comment.post.toString()
    acc[postId] = (acc[postId] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)
  if (Object.keys(countPerPost).length > 0) {
    await Post.bulkWrite(
      Object.entries(countPerPost).map(([postId, count]) => ({
        updateOne: {
          filter: { _id: postId },
          update: { $inc: { commentsCount: -count } }
        }
      }))
    )
  }

  // delete all comments that belongs to user
  await Comment.deleteMany({ author: userId })

  // decrement followingCount for all users who followed the deleted user
  const followers = await Follow.find({ following: userId })
    .select("follower")
    .lean()
  const followerIds = followers.map(f => f.follower)
  await User.updateMany({ _id: { $in: followerIds } }, { $inc: { followingCount: -1 } })

  // remove all followers of the deleted user
  await Follow.deleteMany({ following: userId })

  // decrement followersCount for all users who are followed by the deleted user                                              
  const following = await Follow.find({ follower: userId })
    .select("following")
    .lean()
  const followingIds = following.map(f => f.following)
  await User.updateMany({ _id: { $in: followingIds } }, { $inc: { followersCount: -1 } })

  // remove all following relationships of the deleted user
  await Follow.deleteMany({ follower: userId })

  // delete user in the end
  await user.deleteOne()
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
    .populate("author", "-_id username avatar")
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
    .select("-_id username avatar bio followersCount followingCount")
    .lean()
  if (!user) throw new NotFoundError("User not found")
  return user
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

export {
  getMyProfile,
  updateProfile,
  deleteMyProfile,
  getLikedPosts,
  updateEmail,
  updatePassword,
  getPublicProfile,
  getPostsByUsername
}