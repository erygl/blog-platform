import { Schema, model, Types } from "mongoose"

interface ILike {
  user: Types.ObjectId,
  post?: Types.ObjectId,
  comment?: Types.ObjectId,
  type: "post" | "comment"
}

const likeSchema = new Schema<ILike>({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  post: {
    type: Schema.Types.ObjectId,
    ref: "Post"
  },
  comment: {
    type: Schema.Types.ObjectId,
    ref: "Comment"
  },
  type: {
    type: String,
    enum: ["post", "comment"],
    required: true
  }
}, { timestamps: true, versionKey: false })

likeSchema.index({ user: 1, post: 1 }, { unique: true, partialFilterExpression: { post: { $exists: true } } })
likeSchema.index({ user: 1, comment: 1 }, { unique: true, partialFilterExpression: { comment: { $exists: true } } })
likeSchema.index({ post: 1 })
likeSchema.index({ comment: 1 })

const Like = model<ILike>("Like", likeSchema)

export default Like