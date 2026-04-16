import type { Request, Response } from "express"
import * as adminService from "../services/admin.service.js"
import * as adminValidation from "../validations/admin.validation.js"
import { deleteMyProfile } from "../services/user.service.js"

const getUsers = async (req: Request, res: Response) => {
  const query = adminValidation.getUsersSchema.parse(req.query)
  const { users, hasMore } = await adminService.getUsers(query)
  res.status(200).json({ users, hasMore })
}

const getSingleUser = async (req: Request, res: Response) => {
  const userId = req.params.userId as string
  const user = await adminService.getUserById(userId)
  res.status(200).json({ user })
}

const forceUpdateUser = async (req: Request, res: Response) => {
  const userId = req.params.userId as string
  const data = adminValidation.updateUserSchema.parse(req.body ?? {})
  await adminService.updateUser(userId, data)
  res.status(200).json({ message: "User updated successfully" })
}

const forceDeleteUser = async (req: Request, res: Response) => {
  const userId = req.params.userId as string
  await deleteMyProfile(userId)
  res.status(204).send()
}

const getPosts = async (req: Request, res: Response) => {
  const query = adminValidation.getPostsSchema.parse(req.query)
  const { posts, hasMore } = await adminService.getPosts(query)
  res.status(200).json({ posts, hasMore })
}

const getSinglePost = async (req: Request, res: Response) => {
  const postId = req.params.postId as string
  const post = await adminService.getPostById(postId)
  res.status(200).json({ post })
}

const forceDeletePost = async (req: Request, res: Response) => {
  const postId = req.params.postId as string
  await adminService.deletePost(postId)
  res.status(204).send()
}

const forceDeleteComment = async (req: Request, res: Response) => {
  const commentId = req.params.commentId as string
  await adminService.deleteComment(commentId)
  res.status(204).send()
}

const getTags = async (req: Request, res: Response) => {
  const query = adminValidation.getTagsSchema.parse(req.query)
  const { tags, hasMore } = await adminService.getTags(query)
  res.status(200).json({ tags, hasMore })
}

const createTag = async (req: Request, res: Response) => {
  const { name } = adminValidation.createTagSchema.parse(req.body)
  const tag = await adminService.createTag(name)
  res.status(201).json({ tag })
}

const updateTag = async (req: Request, res: Response) => {
  const tagId = req.params.tagId as string
  const { name } = adminValidation.updateTagSchema.parse(req.body)
  const tag = await adminService.updateTag(tagId, name)
  res.status(200).json({ tag })
}

const deleteTag = async (req: Request, res: Response) => {
  const tagId = req.params.tagId as string
  await adminService.deleteTag(tagId)
  res.status(204).send()
}

const getStats = async (req: Request, res: Response) => {
  const { startDate, endDate } = adminValidation.getStatsSchema.parse(req.query)
  const stats = await adminService.getStats(startDate, endDate)
  res.status(200).json({ stats })
}

export {
  getUsers,
  getSingleUser,
  forceUpdateUser,
  forceDeleteUser,
  getPosts,
  getSinglePost,
  forceDeletePost,
  forceDeleteComment,
  getTags,
  createTag,
  updateTag,
  deleteTag,
  getStats
}