import { Schema, Types, model } from "mongoose"

interface IBookmark {
  user: Types.ObjectId,
  post: Types.ObjectId
}

const bookmarkSchema = new Schema<IBookmark>({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  post: {
    type: Schema.Types.ObjectId,
    ref: "Post",
    required: true
  },
}, { timestamps: true, versionKey: false })

bookmarkSchema.index({ user: 1, post: 1 }, { unique: true })
bookmarkSchema.index({ user: 1 })

const Bookmark = model<IBookmark>("Bookmark", bookmarkSchema)

export default Bookmark