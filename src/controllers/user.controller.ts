import type { Request, Response } from "express";
import * as userService from "../services/user.service.js"
import * as userValidation from "../validations/user.validation.js"

const getMyProfile = async (req: Request, res: Response) => {
  const userId = req.user!.userId
  const user = await userService.getMyProfile(userId)
  res.status(200).json({ user })
}

const updateProfile = async (req: Request, res: Response) => {
  const data = userValidation.updateProfileSchema.parse(req.body)
  const userId = req.user!.userId
  const user = await userService.updateProfile(userId, data)
  res.status(200).json({
    user: {
      username: user.username,
      name: user.name,
      bio: user.bio,
      avatar: user.avatar
    }
  })
}

const deleteMyProfile = async (req: Request, res: Response) => {
  const userId = req.user!.userId
  await userService.deleteMyProfile(userId)
  res.status(204).send()
}

const getLikedPosts = async (req: Request, res: Response) => {
  const userId = req.user!.userId
  const page = Number(req.query.page) || 1
  const limit = Number(req.query.limit) || 10
  const { posts, hasMore } = await userService.getLikedPosts(userId, page, limit)
  res.status(200).json({ posts, hasMore })
}

const updateEmail = async (req: Request, res: Response) => {
  const { email, password } = userValidation.updateEmailSchema.parse(req.body)
  const userId = req.user!.userId
  await userService.updateEmail(userId, email, password)
  res.status(200).json({ message: "Verification email sent to your new address" })
}

const updatePassword = async (req: Request, res: Response) => {
  const { oldPassword, newPassword } = userValidation.updatePasswordSchema.parse(req.body)
  const userId = req.user!.userId
  await userService.updatePassword(userId, oldPassword, newPassword)
  res.status(200).json({ message: "Password changed successfully" })
}

const getPublicProfile = async (req: Request, res: Response) => {
  const username = req.params.username as string
  const user = await userService.getPublicProfile(username)
  res.status(200).json({ user })
}

const getPostsByUsername = async (req: Request, res: Response) => {
  const username = req.params.username as string
  const page = Number(req.query.page) || 1
  const limit = Number(req.query.limit) || 10
  const { posts, hasMore, total } = await userService.getPostsByUsername(username, page, limit)
  res.status(200).json({ posts, hasMore, total })
}

const followUser = async (req: Request, res: Response) => {
  const userId = req.user!.userId
  const username = req.params.username as string
  await userService.followUser(userId, username)
  res.status(200).json({ message: `${username} followed successfully` })
}

const unfollowUser = async (req: Request, res: Response) => {
  const userId = req.user!.userId
  const username = req.params.username as string
  await userService.unfollowUser(userId, username)
  res.status(200).json({ message: `${username} unfollowed successfully` })
}

const getFollowersList = async (req: Request, res: Response) => {
  const username = req.params.username as string
  const page = Number(req.query.page) || 1
  const limit = Number(req.query.limit) || 10
  const { followers, hasMore } = await userService.getFollowersList(username, page, limit)
  res.status(200).json({ followers, hasMore })
}

const getFollowingList = async (req: Request, res: Response) => {
  const username = req.params.username as string
  const page = Number(req.query.page) || 1
  const limit = Number(req.query.limit) || 10
  const { following, hasMore } = await userService.getFollowingList(username, page, limit)
  res.status(200).json({ following, hasMore })
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