export type NotificationEventPayload = {
  recipientId: string,
  senderId: string,
  type: "post_like" | "post_comment" | "comment_like" | "comment_reply" | "follow",
  postId?: string,
  commentId?: string
}