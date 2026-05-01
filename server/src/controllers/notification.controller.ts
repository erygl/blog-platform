import type { Request, Response } from "express"
import * as notificationService from "../services/notification.service.js"

const getNotifications = async (req: Request, res: Response) => {
  const userId = req.user!.userId
  const cursor = req.query.cursor as string | undefined
  const limit = Math.min(Number(req.query.limit) || 10, 50)
  const { data, hasMore, nextCursor } = await notificationService.getNotifications(userId, cursor, limit)
  res.status(200).json({ data, hasMore, nextCursor })
}

const markAsRead = async (req: Request, res: Response) => {
  const notificationId = req.params.notificationId as string
  const userId = req.user!.userId
  await notificationService.markAsRead(notificationId, userId)
  res.status(204).send()
}

const markAllAsRead = async (req: Request, res: Response) => {
  const userId = req.user!.userId
  await notificationService.markAllAsRead(userId)
  res.status(204).send()
}

const getUnreadCount = async (req: Request, res: Response) => {
  const userId = req.user!.userId
  const count = await notificationService.getUnreadCount(userId)
  res.status(200).json({ count })
}

const streamNotifications = (req: Request, res: Response) => {
  const userId = req.user!.userId
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive"
  })
  res.flushHeaders()
  notificationService.sseClients.set(userId, res)
  res.on("close", () => {
    notificationService.sseClients.delete(userId)
  })
}

export {
  getNotifications,
  markAsRead,
  markAllAsRead,
  streamNotifications,
  getUnreadCount
}