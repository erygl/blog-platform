import { afterEach, beforeEach, vi, describe, it, expect } from "vitest"
import { app, request, cleanDb, registerUser, loginUser } from "../../helpers/auth.helper.js"
import { registerAdmin, loginAdmin } from "../../helpers/admin.helper.js"
import { createPost } from "../../helpers/post.helper.js"
import { createComment } from "../../helpers/comment.helper.js"
import Post from "../../../src/models/Post.js"
import Comment from "../../../src/models/Comment.js"
import Like from "../../../src/models/Like.js"
import Tag from "../../../src/models/Tag.js"

vi.mock("../../../src/utils/email.js", () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined)
}))

let adminToken: string
let userToken: string

beforeEach(async () => {
  await registerAdmin()
  adminToken = await loginAdmin()
  await registerUser()
  const res = await loginUser()
  userToken = res.accessToken
})

afterEach(async () => {
  vi.clearAllMocks()
  await cleanDb()
})

describe("DELETE /api/admin/posts/:postId", () => {
  it("should delete post and return 204", async () => {
    const post = await createPost(userToken)
    const dbPost = await Post.findOne({ slug: post.slug })
    const res = await request(app)
      .delete(`/api/admin/posts/${dbPost!._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
    expect(res.status).toBe(204)
    const deleted = await Post.findById(dbPost!._id)
    expect(deleted).toBeNull()
  })

  it("should cascade delete comments from multiple users when post is deleted", async () => {
    const post = await createPost(userToken)
    const dbPost = await Post.findOne({ slug: post.slug })

    await request(app).post("/api/auth/register").send({
      username: "jane", name: "Jane Doe", email: "jane@example.com", password: "Password1"
    })
    await request(app).post("/api/auth/register").send({
      username: "bob", name: "Bob Smith", email: "bob@example.com", password: "Password1"
    })
    const janeLogin = await request(app).post("/api/auth/login").send({ email: "jane@example.com", password: "Password1" })
    const bobLogin = await request(app).post("/api/auth/login").send({ email: "bob@example.com", password: "Password1" })

    await createComment(userToken, post.slug)
    await createComment(janeLogin.body.accessToken, post.slug)
    await createComment(bobLogin.body.accessToken, post.slug)

    await request(app)
      .delete(`/api/admin/posts/${dbPost!._id}`)
      .set("Authorization", `Bearer ${adminToken}`)

    const comments = await Comment.find({ post: dbPost!._id })
    expect(comments).toHaveLength(0)
  })

  it("should cascade delete likes from multiple users when post is deleted", async () => {
    const post = await createPost(userToken)
    const dbPost = await Post.findOne({ slug: post.slug })

    await request(app).post("/api/auth/register").send({
      username: "jane", name: "Jane Doe", email: "jane@example.com", password: "Password1"
    })
    await request(app).post("/api/auth/register").send({
      username: "bob", name: "Bob Smith", email: "bob@example.com", password: "Password1"
    })
    const janeLogin = await request(app).post("/api/auth/login").send({ email: "jane@example.com", password: "Password1" })
    const bobLogin = await request(app).post("/api/auth/login").send({ email: "bob@example.com", password: "Password1" })

    await request(app).post(`/api/posts/${post.slug}/like`).set("Authorization", `Bearer ${userToken}`)
    await request(app).post(`/api/posts/${post.slug}/like`).set("Authorization", `Bearer ${janeLogin.body.accessToken}`)
    await request(app).post(`/api/posts/${post.slug}/like`).set("Authorization", `Bearer ${bobLogin.body.accessToken}`)

    await request(app)
      .delete(`/api/admin/posts/${dbPost!._id}`)
      .set("Authorization", `Bearer ${adminToken}`)

    const likes = await Like.find({ post: dbPost!._id })
    expect(likes).toHaveLength(0)
  })

  it("should decrement tag postCount when a published post is deleted", async () => {
    const tag = await Tag.create({ name: "TestTag", slug: "testtag", postCount: 0 })
    const post = await createPost(userToken, { tags: ["TestTag"] })
    const dbPost = await Post.findOne({ slug: post.slug })
    const tagBefore = await Tag.findById(tag._id)
    expect(tagBefore!.postCount).toBe(1)

    await request(app)
      .delete(`/api/admin/posts/${dbPost!._id}`)
      .set("Authorization", `Bearer ${adminToken}`)

    const tagAfter = await Tag.findById(tag._id)
    expect(tagAfter!.postCount).toBe(0)
  })

  it("should return 401 if no auth token", async () => {
    const post = await createPost(userToken)
    const dbPost = await Post.findOne({ slug: post.slug })
    const res = await request(app).delete(`/api/admin/posts/${dbPost!._id}`)
    expect(res.status).toBe(401)
  })

  it("should return 404 if post not found", async () => {
    const res = await request(app)
      .delete("/api/admin/posts/000000000000000000000001")
      .set("Authorization", `Bearer ${adminToken}`)
    expect(res.status).toBe(404)
  })
})
