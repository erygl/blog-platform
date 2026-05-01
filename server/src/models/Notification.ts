import { Schema, Types, model } from "mongoose"

interface INotification {
  recipient: Types.ObjectId,
  sender: Types.ObjectId,
  type: "post_like" | "post_comment" | "comment_like" | "comment_reply" | "follow",
  post?: Types.ObjectId,
  comment?: Types.ObjectId,
  read: boolean
}

const notificationSchema = new Schema<INotification>({
  recipient: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  sender: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  type: {
    type: String,
    enum: {
      values: ["post_like", "post_comment", "comment_like", "comment_reply", "follow"],
      message: `Type must be "post_like", "post_comment", "comment_like", "comment_reply", "follow"`
    },
    required: true
  },
  post: {
    type: Schema.Types.ObjectId,
    ref: "Post",
  },
  comment: {
    type: Schema.Types.ObjectId,
    ref: "Comment",
  },
  read: {
    type: Boolean,
    default: false
  }
}, { timestamps: true, versionKey: false })

notificationSchema.index({ recipient: 1, _id: -1 })

const Notification = model<INotification>("Notification", notificationSchema)

export default Notification