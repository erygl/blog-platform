import { Schema, model } from "mongoose"

interface ITag {
  name: string,
  slug: string,
  postCount: number
}

const TagSchema = new Schema<ITag>({
  name: {
    type: String,
    unique: true,
    trim: true,
    required: true
  },
  slug: {
    type: String,
    unique: true,
    required: true
  },
  postCount: {
    type: Number,
    default: 0
  }
}, { versionKey: false })

const Tag = model<ITag>("Tag", TagSchema)

export default Tag