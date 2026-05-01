import { Types } from "mongoose"
import Notification from "../../src/models/Notification.js"
import { app, request } from "./auth.helper.js"

type NotificationType = "post_like" | "post_comment" | "comment_like" | "comment_reply" | "follow"

export async function createNotification(
  recipientId: string,
  senderId: string,
  type: NotificationType,
  overrides: Record<string, unknown> = {}
) {
  return Notification.create({
    recipient: new Types.ObjectId(recipientId),
    sender: new Types.ObjectId(senderId),
    type,
    read: false,
    ...overrides
  })
}

export async function getUnreadCount(accessToken: string): Promise<number> {
  const res = await request(app)
    .get("/api/notifications/unread-count")
    .set("Authorization", `Bearer ${accessToken}`)
  return res.body.count as number
}
