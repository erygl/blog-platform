import { afterEach, beforeEach, vi, describe, it, expect } from "vitest"
import { app, request, cleanDb, registerUser, loginUser } from "../../helpers/auth.helper.js"
import { createPost } from "../../helpers/post.helper.js"
import Comment from "../../../src/models/Comment.js"
import Like from "../../../src/models/Like.js"
import User from "../../../src/models/User.js"
import Post from "../../../src/models/Post.js"

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

describe("DELETE /api/posts/:postSlug", () => {
  it("should delete a post and return 204", async () => {
    const post = await createPost(accessToken)
    const res = await request(app)
      .delete(`/api/posts/${post.slug}`)
      .set("Authorization", `Bearer ${accessToken}`)
    expect(res.status).toBe(204)
  })

  it("should cascade delete all comments from any user when post is deleted", async () => {
    const post = await createPost(accessToken)
    const dbPost = await Post.findOne({ slug: post.slug })

    await request(app).post("/api/auth/register").send({
      username: "jane",
      email: "jane@example.com",
      password: "Password1"
    })
    await request(app).post("/api/auth/register").send({
      username: "bob",
      email: "bob@example.com",
      password: "Password1"
    })
    const jane = await User.findOne({ username: "jane" })
    const bob = await User.findOne({ username: "bob" })

    await Comment.create({ post: dbPost!._id, author: jane!._id, content: "Jane's comment" })
    await Comment.create({ post: dbPost!._id, author: bob!._id, content: "Bob's comment" })

    await request(app)
      .delete(`/api/posts/${post.slug}`)
      .set("Authorization", `Bearer ${accessToken}`)

    const comments = await Comment.find({ post: dbPost!._id })
    expect(comments).toHaveLength(0)
  })

  it("should cascade delete all likes when post is deleted", async () => {
    const post = await createPost(accessToken)
    const dbPost = await Post.findOne({ slug: post.slug })

    await request(app).post("/api/auth/register").send({
      username: "jane",
      email: "jane@example.com",
      password: "Password1"
    })
    const jane = await User.findOne({ username: "jane" })
    await Like.create({ user: jane!._id, post: dbPost!._id, type: "post" })

    await request(app)
      .delete(`/api/posts/${post.slug}`)
      .set("Authorization", `Bearer ${accessToken}`)

    const likes = await Like.find({ post: dbPost!._id })
    expect(likes).toHaveLength(0)
  })

  it("should return 401 if no auth token", async () => {
    const post = await createPost(accessToken)
    const res = await request(app).delete(`/api/posts/${post.slug}`)
    expect(res.status).toBe(401)
  })

  it("should return 404 if post does not exist", async () => {
    const res = await request(app)
      .delete("/api/posts/non-existent-slug")
      .set("Authorization", `Bearer ${accessToken}`)
    expect(res.status).toBe(404)
  })

  it("should return 404 if user does not own the post", async () => {
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

    const res = await request(app)
      .delete(`/api/posts/${janePost.slug}`)
      .set("Authorization", `Bearer ${accessToken}`)
    expect(res.status).toBe(404)
  })
})
