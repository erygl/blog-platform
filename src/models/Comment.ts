import { Schema, model, Types } from "mongoose"

interface IComment {
  post: Types.ObjectId,
  author: Types.ObjectId,
  content: string,
  likesCount: number,
  parentComment: Types.ObjectId | null
}

const CommentSchema = new Schema<IComment>({
  post: {
    type: Schema.Types.ObjectId,
    ref: "Post",
    required: true
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  content: {
    type: String,
    required: true
  },
  likesCount: {
    type: Number,
    default: 0
  },
  parentComment: {
    type: Schema.Types.ObjectId,
    ref: "Comment",
    default: null
  }
}, { timestamps: true })

const Comment = model<IComment>("Comment", CommentSchema)

export default Comment