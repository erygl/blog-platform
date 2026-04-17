import { Schema, model, Types } from "mongoose"

interface IPost {
  title: string,
  content: string,
  author: Types.ObjectId,
  coverImage: string | null,
  tags: Types.ObjectId[]
  status: "draft" | "published" | "archived"
  excerpt: string,
  slug: string,
  viewsCount: number,
  likesCount: number,
  commentsCount: number,
  trendingScore: number,
  publishedAt: Date | null,
  lastActivityAt: Date | null
}

const PostSchema = new Schema<IPost>({
  title: {
    type: String,
    minLength: 5,
    maxLength: 100,
    trim: true,
    required: true
  },
  content: {
    type: String, // rich HTML or JSON (TipTap/Quill)
    required: true
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  coverImage: {
    type: String,
    default: null
  },
  tags: {
    type: [{
      type: Schema.Types.ObjectId,
      ref: "Tag"
    }],
    default: []
  },
  status: {
    type: String,
    enum: {
      values: ["draft", "published", "archived"],
      message: `Status must be "draft", "published" or "archived"`
    },
    default: "draft"
  },
  excerpt: {
    type: String,
    required: true
  },
  slug: {
    type: String,
    unique: true,
    required: true
  },
  viewsCount: {
    type: Number,
    default: 0
  },
  likesCount: {
    type: Number,
    default: 0
  },
  commentsCount: {
    type: Number,
    default: 0
  },
  trendingScore: {
    type: Number,
    default: 0
  },
  publishedAt: {
    type: Date,
    default: null
  },
  lastActivityAt: {
    type: Date,
    default: null
  }
}, { timestamps: true, versionKey: false })

PostSchema.index({ status: 1, lastActivityAt: -1 })
PostSchema.index({ trendingScore: -1 })

const Post = model<IPost>("Post", PostSchema)

export default Post