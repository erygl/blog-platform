import type { Response } from "express"
import Notification from "../models/Notification.js"
import notificationEmitter from "../config/notificationEmitter.js"
import { Types } from "mongoose"
import { decode, paginate } from "../utils/cursor.js"
import { NotFoundError } from "../errors/index.js"

export const sseClients = new Map<string, Response>()

export const initSSE = () => {
  notificationEmitter.on("notification", async (payload) => {
    try {
      if (payload.recipientId === payload.senderId) return
      const notification = await Notification.create({
        recipient: payload.recipientId,
        sender: payload.senderId,
        type: payload.type,
        post: payload.postId,
        comment: payload.commentId
      })

      await notification.populate([
        { path: "sender", select: "-_id username avatar" },
        { path: "post", select: "-_id title coverImage slug" },
        { path: "comment", select: "content" }
      ])

      const client = sseClients.get(payload.recipientId)
      if (client) {
        const { recipient, ...notificationData } = notification.toObject()
        client.write(`data: ${JSON.stringify(notificationData)}\n\n`)
      }
    } catch (err) {
      console.error("Notification listener error:", err)
    }
  })
}

const getNotifications = async (
  userId: string,
  cursor: string | undefined,
  limit: number
) => {
  const cursorFilter = cursor
    ? { _id: { $lt: new Types.ObjectId(decode<{ id: string }>(cursor).id) } }
    : {}

  const notifications = await Notification.find(
    { recipient: userId, ...cursorFilter }
  )
    .sort({ _id: -1 })
    .limit(limit + 1)
    .select("sender type post comment read")
    .populate("sender", "-_id username avatar")
    .populate("post", "-_id title coverImage slug")
    .populate("comment", "content")
    .lean()

  const { data, hasMore, nextCursor } = paginate(
    notifications,
    limit,
    last => ({ id: last._id.toString() })
  )

  return { data, hasMore, nextCursor }
}

const markAsRead = async (
  notificationId: string,
  userId: string
): Promise<void> => {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, recipient: userId },
    { read: true }
  )
  if (!notification) throw new NotFoundError("Notification does not exist")
}

const markAllAsRead = async (userId: string) => {
  await Notification.updateMany(
    { read: false, recipient: userId },
    { read: true }
  )
}

const getUnreadCount = async (userId: string): Promise<number> => {
  return Notification.countDocuments({ recipient: userId, read: false })
}

export {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount
}