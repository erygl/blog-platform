import { afterEach, beforeEach, vi, describe, it, expect } from "vitest"
import { app, request, cleanDb, registerUser } from "../../helpers/auth.helper.js"
import { registerAdmin, loginAdmin } from "../../helpers/admin.helper.js"
import { createPost } from "../../helpers/post.helper.js"
import { createComment } from "../../helpers/comment.helper.js"
import User from "../../../src/models/User.js"
import Post from "../../../src/models/Post.js"
import Comment from "../../../src/models/Comment.js"
import Like from "../../../src/models/Like.js"

vi.mock("../../../src/utils/email.js", () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined)
}))

let adminToken: string

beforeEach(async () => {
  await registerAdmin()
  adminToken = await loginAdmin()
})

afterEach(async () => {
  vi.clearAllMocks()
  await cleanDb()
})

describe("DELETE /api/admin/users/:userId", () => {
  it("should delete user and return 204", async () => {
    await registerUser()
    const user = await User.findOne({ email: "john@example.com" })
    const res = await request(app)
      .delete(`/api/admin/users/${user!._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
    expect(res.status).toBe(204)
    const deleted = await User.findById(user!._id)
    expect(deleted).toBeNull()
  })

  it("should cascade delete user's posts", async () => {
    await registerUser()
    const loginRes = await request(app).post("/api/auth/login").send({
      email: "john@example.com",
      password: "Password1"
    })
    await createPost(loginRes.body.accessToken)
    const user = await User.findOne({ email: "john@example.com" })

    await request(app)
      .delete(`/api/admin/users/${user!._id}`)
      .set("Authorization", `Bearer ${adminToken}`)

    const posts = await Post.find({ author: user!._id })
    expect(posts).toHaveLength(0)
  })

  it("should cascade delete user's comments", async () => {
    await registerUser()
    const loginRes = await request(app).post("/api/auth/login").send({
      email: "john@example.com",
      password: "Password1"
    })
    const post = await createPost(loginRes.body.accessToken)
    await createComment(loginRes.body.accessToken, post.slug)
    const user = await User.findOne({ email: "john@example.com" })

    await request(app)
      .delete(`/api/admin/users/${user!._id}`)
      .set("Authorization", `Bearer ${adminToken}`)

    const comments = await Comment.find({ author: user!._id })
    expect(comments).toHaveLength(0)
  })

  it("should cascade delete user's likes", async () => {
    await registerUser()
    const loginRes = await request(app).post("/api/auth/login").send({
      email: "john@example.com",
      password: "Password1"
    })
    const post = await createPost(loginRes.body.accessToken)
    const dbPost = await Post.findOne({ slug: post.slug })
    const user = await User.findOne({ email: "john@example.com" })
    await Like.create({ user: user!._id, post: dbPost!._id, type: "post" })

    await request(app)
      .delete(`/api/admin/users/${user!._id}`)
      .set("Authorization", `Bearer ${adminToken}`)

    const likes = await Like.find({ user: user!._id })
    expect(likes).toHaveLength(0)
  })

  it("should return 401 if no auth token", async () => {
    await registerUser()
    const user = await User.findOne({ email: "john@example.com" })
    const res = await request(app).delete(`/api/admin/users/${user!._id}`)
    expect(res.status).toBe(401)
  })

  it("should return 404 if user not found", async () => {
    const res = await request(app)
      .delete("/api/admin/users/000000000000000000000001")
      .set("Authorization", `Bearer ${adminToken}`)
    expect(res.status).toBe(404)
  })
})
