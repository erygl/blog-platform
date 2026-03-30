import Post from "../models/Post.js";
import Tag from "../models/Tag.js";
import Comment from "../models/Comment.js";
import { generateSlug } from "../utils/slug.js";
import { BadRequestError, ConflictError, NotFoundError } from "../errors/index.js";
import Like from "../models/Like.js";
import { mongo } from "mongoose";
import Follow from "../models/Follow.js";

const resolveTagIds = async (tagNames: string[]) => {
  return Promise.all(
    tagNames.map(async (name) => {
      const slug = generateSlug(name)
      const tag = await Tag.findOneAndUpdate(
        { name },
        { $setOnInsert: { name, slug } },
        { upsert: true, returnDocument: "after" }
      )
      return tag._id
    })
  )
}

const getTrendingPosts = async (page: number, limit: number) => {
  const skip = (page - 1) * limit
  const posts = await Post.find({ status: "published" })
    .sort({ trendingScore: -1 })
    .skip(skip)
    .limit(limit + 1)
    .select("-_id title slug excerpt author coverImage likesCount commentsCount viewsCount publishedAt")
    .populate("author", "-_id username name avatar")
    .lean()

  const hasMore = posts.length > limit
  return { posts: posts.slice(0, limit), hasMore }
}

const createPost = async (data: {
  title: string,
  content: string,
  status: "draft" | "published",
  coverImage?: string,
  tags?: string[]
}, userId: string) => {
  const slug = generateSlug(data.title, true)
  const excerpt = data.content.slice(0, 100).trimEnd()

  const tagIds = await resolveTagIds(data.tags ?? [])
  if (data.status === "published") {
    await Tag.updateMany({ _id: { $in: tagIds } }, { $inc: { postCount: 1 } })
  }

  const post = await Post.create({
    ...data,
    author: userId,
    slug,
    excerpt,
    tags: tagIds,
    publishedAt: data.status === "published" ? new Date() : null
  })

  return post
}

const getFeed = async (userId: string, page: number, limit: number) => {
  const skip = (page - 1) * limit
  const followedUsers = await Follow.find({ follower: userId }).select("following").lean()
  const followedUserIds = followedUsers.map(f => f.following)
  const posts = await Post.find({ author: { $in: followedUserIds }, status: "published" })
    .sort("-publishedAt")
    .skip(skip)
    .limit(limit + 1)
    .select("-_id title slug excerpt author coverImage likesCount commentsCount viewsCount publishedAt")
    .populate("author", "-_id username name avatar")
    .lean()

  const hasMore = posts.length > limit
  return { posts: posts.slice(0, limit), hasMore }
}

const getDrafts = async (userId: string) => {
  const drafts = await Post.find({ author: userId, status: "draft" })
    .sort("-createdAt")
    .select("title slug excerpt updatedAt")
    .lean()

  return drafts
}

const getSingleDraft = async (userId: string, postSlug: string) => {
  const draft = await Post.findOne({
    author: userId,
    slug: postSlug,
    status: "draft"
  })
    .select("-excerpt -trendingScore")
    .populate("author", "-_id username name avatar")
    .populate("tags", "-_id name slug")
    .lean()

  if (!draft) throw new NotFoundError("Draft not found")
  return draft
}

const getSinglePost = async (postSlug: string) => {
  const post = await Post.findOneAndUpdate(
    { slug: postSlug, status: "published" },
    { $inc: { viewsCount: 1 } },
    { returnDocument: "after" }
  )
    .select("-_id -status -excerpt -trendingScore -createdAt -updatedAt")
    .populate("author", "-_id username name avatar")
    .populate("tags", "-_id name slug")
    .lean()

  if (!post) throw new NotFoundError("Post not found")
  return post
}

const updatePost = async (
  data: {
    title?: string,
    content?: string,
    status?: "draft" | "published",
    coverImage?: string,
    tags?: string[]
  },
  postSlug: string,
  userId: string
) => {
  const post = await Post.findOne({ slug: postSlug }).lean()
  if (!post || post.author.toString() !== userId)
    throw new NotFoundError("Post not found")

  let tagIds;
  if (data.tags) {
    tagIds = await resolveTagIds(data.tags)
  }

  // update postCounts based on post status
  const newStatus = data.status ?? post.status
  const newTagIds = tagIds ?? post.tags
  const currentlyCounted = post.status === "published" ? post.tags : []
  const newCounted = newStatus === "published" ? newTagIds : []
  await Promise.all([
    Tag.updateMany(
      { _id: { $in: currentlyCounted, $nin: newCounted } },
      { $inc: { postCount: -1 } }
    ),
    Tag.updateMany(
      { _id: { $in: newCounted, $nin: currentlyCounted } },
      { $inc: { postCount: 1 } }
    ),
  ])

  const updatedPost = await Post.findOneAndUpdate(
    { slug: postSlug },
    {
      ...data,
      excerpt: data.content ? data.content.slice(0, 100).trimEnd() : post.excerpt,
      tags: tagIds ?? post.tags,
      publishedAt: !post.publishedAt && data.status === "published" ? new Date() : post.publishedAt
    },
    { returnDocument: "after" }
  )
  return updatedPost
}

const deletePost = async (postSlug: string, userId: string): Promise<void> => {
  const post = await Post.findOneAndDelete({ slug: postSlug, author: userId })
  if (!post) throw new NotFoundError("Post not found")
  await Promise.all([
    Like.deleteMany({ post: post._id }),
    Comment.deleteMany({ post: post._id }),
    ...(post.status === "published"
      ? [Tag.updateMany({ _id: { $in: post.tags } }, { $inc: { postCount: -1 } })]
      : []
    )
  ])
}

const likePost = async (postSlug: string, userId: string): Promise<void> => {
  const post = await Post.findOne({ slug: postSlug, status: "published" })
    .select("_id").lean()
  if (!post) throw new NotFoundError("Post not found")

  try {
    await Like.create({ user: userId, post: post._id, type: "post" })
  } catch (error) {
    if (error instanceof mongo.MongoServerError && error.code === 11000) {
      throw new ConflictError("Post already liked")
    }
    throw error
  }
  await Post.findByIdAndUpdate(post._id, { $inc: { likesCount: 1 } })
}

const unlikePost = async (postSlug: string, userId: string): Promise<void> => {
  const post = await Post.findOne({ slug: postSlug, status: "published" })
    .select("_id").lean()
  if (!post) throw new NotFoundError("Post not found")

  const unlike = await Like.findOneAndDelete({ user: userId, post: post._id, type: "post" })
  if (!unlike) throw new ConflictError("Post not liked")
  await Post.findByIdAndUpdate(post._id, { $inc: { likesCount: -1 } })
}

const getPostLikes = async (postSlug: string, page: number, limit: number) => {
  const skip = (page - 1) * limit
  const post = await Post.findOne({ slug: postSlug, status: "published" })
    .select("_id")
    .lean()

  if (!post) throw new NotFoundError("Post not found")

  const likes = await Like.find({ post: post._id })
    .skip(skip)
    .limit(limit + 1)
    .select("-_id user")
    .populate("user", "-_id username name avatar bio")
    .lean()

  const hasMore = likes.length > limit
  return { likes: likes.slice(0, limit).map(l => l.user), hasMore }
}

export {
  getTrendingPosts,
  createPost,
  getFeed,
  getDrafts,
  getSingleDraft,
  getSinglePost,
  updatePost,
  deletePost,
  likePost,
  unlikePost,
  getPostLikes
}