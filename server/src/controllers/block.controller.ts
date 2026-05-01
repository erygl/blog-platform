import type { Request, Response } from "express"
import * as blockService from "../services/block.service.js"

const blockUser = async (req: Request, res: Response) => {
  const blockerId = req.user!.userId
  const username = req.params.username as string
  await blockService.blockUser(blockerId, username)
  res.status(200).json({ message: `${username} blocked successfully` })
}

const unblockUser = async (req: Request, res: Response) => {
  const blockerId = req.user!.userId
  const username = req.params.username as string
  await blockService.unblockUser(blockerId, username)
  res.status(200).json({ message: `${username} unblocked successfully` })
}

const getBlockList = async (req: Request, res: Response) => {
  const userId = req.user!.userId
  const cursor = req.query.cursor as string | undefined
  const limit = Math.min(Number(req.query.limit) || 10, 50)
  const { users, hasMore, nextCursor } = await blockService.getBlockList(userId, cursor, limit)
  res.status(200).json({ users, hasMore, nextCursor })
}

export { blockUser, unblockUser, getBlockList }
