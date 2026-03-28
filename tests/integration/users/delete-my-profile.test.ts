import { afterEach, beforeEach, vi, describe, it, expect } from "vitest"
import { app, request, cleanDb, registerUser, loginUser } from "../../helpers/auth.helper.js"
import { createPost } from "../../helpers/post.helper.js"
import User from "../../../src/models/User.js"
import Post from "../../../src/models/Post.js"
import Like from "../../../src/models/Like.js"
import Comment from "../../../src/models/Comment.js"
import Follow from "../../../src/models/Follow.js"

vi.mock("../../../src/utils/email.js", () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined)
}))

let accessToken: string

beforeEach(async () => {
  await registerUser()
  const res = await loginUser()
  accessToken = res.accessToken
})

afterEach(async () => {
  vi.clearAllMocks()
  await cleanDb()
})

describe("DELETE /api/users/me", () => {
  it("should delete the user and return 204", async () => {
    const res = await request(app)
      .delete("/api/users/me")
      .set("Authorization", `Bearer ${accessToken}`)

    expect(res.status).toBe(204)

    const user = await User.findOne({ username: "john" })
    expect(user).toBeNull()
  })

  it("should delete all posts belonging to the user", async () => {
    await createPost(accessToken)
    await createPost(accessToken)

    await request(app)
      .delete("/api/users/me")
      .set("Authorization", `Bearer ${accessToken}`)

    const posts = await Post.find({})
    expect(posts).toHaveLength(0)
  })

  it("should delete likes and comments on the user's own posts when user is deleted", async () => {
    const post = await createPost(accessToken)
    const dbPost = await Post.findOne({ slug: post.slug })

    await request(app).post("/api/auth/register").send({
      username: "jane",
      email: "jane@example.com",
      password: "Password1"
    })
    const jane = await User.findOne({ username: "jane" })
    await Like.create({ user: jane!._id, post: dbPost!._id, type: "post" })
    await Comment.create({ post: dbPost!._id, author: jane!._id, content: "Jane's comment" })

    await request(app)
      .delete("/api/users/me")
      .set("Authorization", `Bearer ${accessToken}`)

    const likes = await Like.find({ post: dbPost!._id })
    expect(likes).toHaveLength(0)

    const comments = await Comment.find({ post: dbPost!._id })
    expect(comments).toHaveLength(0)
  })

  it("should decrement likesCount on posts the user had liked", async () => {
    await request(app).post("/api/auth/register").send({
      username: "jane",
      email: "jane@example.com",
      password: "Password1"
    })
    const janeLogin = await request(app).post("/api/auth/login").send({
      email: "jane@example.com",
      password: "Password1"
    })
    const janePost = await createPost(janeLogin.body.accessToken)

    await request(app)
      .post(`/api/posts/${janePost.slug}/like`)
      .set("Authorization", `Bearer ${accessToken}`)

    const before = await Post.findOne({ slug: janePost.slug })
    expect(before!.likesCount).toBe(1)

    await request(app)
      .delete("/api/users/me")
      .set("Authorization", `Bearer ${accessToken}`)

    const after = await Post.findOne({ slug: janePost.slug })
    expect(after!.likesCount).toBe(0)
  })

  it("should delete the user's comments and decrement commentsCount on posts", async () => {
    await request(app).post("/api/auth/register").send({
      username: "jane",
      email: "jane@example.com",
      password: "Password1"
    })
    const janeLogin = await request(app).post("/api/auth/login").send({
      email: "jane@example.com",
      password: "Password1"
    })
    const janePost = await createPost(janeLogin.body.accessToken)
    const dbPost = await Post.findOne({ slug: janePost.slug })
    const john = await User.findOne({ username: "john" })

    await Comment.create({ post: dbPost!._id, author: john!._id, content: "John's comment" })
    await Post.findByIdAndUpdate(dbPost!._id, { $inc: { commentsCount: 1 } })

    await request(app)
      .delete("/api/users/me")
      .set("Authorization", `Bearer ${accessToken}`)

    const comments = await Comment.find({ author: john!._id })
    expect(comments).toHaveLength(0)

    const after = await Post.findOne({ slug: janePost.slug })
    expect(after!.commentsCount).toBe(0)
  })

  it("should update follow counts when a followed/following user is deleted", async () => {
    await request(app).post("/api/auth/register").send({
      username: "jane",
      email: "jane@example.com",
      password: "Password1"
    })

    // john follows jane
    await request(app)
      .post("/api/users/jane/follow")
      .set("Authorization", `Bearer ${accessToken}`)

    const janeBefore = await User.findOne({ username: "jane" })
    expect(janeBefore!.followersCount).toBe(1)

    await request(app)
      .delete("/api/users/me")
      .set("Authorization", `Bearer ${accessToken}`)

    // jane's followersCount should be decremented
    const janeAfter = await User.findOne({ username: "jane" })
    expect(janeAfter!.followersCount).toBe(0)

    // follow documents should be removed
    const follows = await Follow.find({})
    expect(follows).toHaveLength(0)
  })

  it("should return 401 if no auth token", async () => {
    const res = await request(app).delete("/api/users/me")
    expect(res.status).toBe(401)
  })
})
