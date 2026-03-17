import { Schema, model, Types } from "mongoose"

interface IComment {
  post: Types.ObjectId,
  author: Types.ObjectId,
  content: string,
  likes: Types.ObjectId[],
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
  likes: {
    type: [{
      type: Schema.Types.ObjectId,
      ref: "User"
    }],
    default: []
  },
  parentComment: {
    type: Schema.Types.ObjectId,
    ref: "Comment",
    default: null
  }
}, { timestamps: true })

const Comment = model<IComment>("Comment", CommentSchema)

export default Comment