import { afterEach, beforeEach, vi, describe, it, expect } from "vitest"
import { app, request, cleanDb, registerUser, loginUser, registerSecondUser, loginSecondUser } from "../../helpers/auth.helper.js"
import User from "../../../src/models/User.js"
import { registerAdmin, loginAdmin } from "../../helpers/admin.helper.js"
import { createPost } from "../../helpers/post.helper.js"
import { createComment, createReply } from "../../helpers/comment.helper.js"
import Post from "../../../src/models/Post.js"
import Comment from "../../../src/models/Comment.js"
import Like from "../../../src/models/Like.js"

vi.mock("../../../src/utils/email.js", async (importOriginal) => ({
  ...await importOriginal(),
  sendEmail: vi.fn().mockResolvedValue(undefined)
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

describe("DELETE /api/admin/comments/:commentId", () => {
  it("should delete comment and return 204", async () => {
    const post = await createPost(userToken)
    const comment = await createComment(userToken, post.slug)
    const res = await request(app)
      .delete(`/api/admin/comments/${comment._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
    expect(res.status).toBe(204)
    const deleted = await Comment.findById(comment._id)
    expect(deleted).toBeNull()
  })

  it("should cascade delete replies when parent comment is deleted", async () => {
    const post = await createPost(userToken)
    const comment = await createComment(userToken, post.slug)

    await registerSecondUser()
    await request(app).post("/api/auth/register").send({
      username: "bob", name: "Bob Smith", email: "bob@example.com", password: "Password1"
    })
    await User.updateOne({ email: "bob@example.com" }, { isVerified: true })
    const janeLogin = await loginSecondUser()
    const bobLogin = await request(app).post("/api/auth/login").send({ email: "bob@example.com", password: "Password1" })

    await createReply(janeLogin.accessToken, post.slug, comment._id)
    await createReply(bobLogin.body.accessToken, post.slug, comment._id)

    await request(app)
      .delete(`/api/admin/comments/${comment._id}`)
      .set("Authorization", `Bearer ${adminToken}`)

    const replies = await Comment.find({ parentComment: comment._id })
    expect(replies).toHaveLength(0)
  })

  it("should cascade delete likes on comment and its replies from multiple users", async () => {
    const post = await createPost(userToken)
    const comment = await createComment(userToken, post.slug)

    await registerSecondUser()
    const janeLogin = await loginSecondUser()
    const reply = await createReply(janeLogin.accessToken, post.slug, comment._id)

    await request(app)
      .post(`/api/posts/${post.slug}/comments/${comment._id}/like`)
      .set("Authorization", `Bearer ${userToken}`)
    await request(app)
      .post(`/api/posts/${post.slug}/comments/${comment._id}/like`)
      .set("Authorization", `Bearer ${janeLogin.accessToken}`)
    await request(app)
      .post(`/api/posts/${post.slug}/comments/${reply._id}/like`)
      .set("Authorization", `Bearer ${userToken}`)

    await request(app)
      .delete(`/api/admin/comments/${comment._id}`)
      .set("Authorization", `Bearer ${adminToken}`)

    const commentLikes = await Like.find({ comment: comment._id })
    const replyLikes = await Like.find({ comment: reply._id })
    expect(commentLikes).toHaveLength(0)
    expect(replyLikes).toHaveLength(0)
  })

  it("should decrement post commentsCount by comment + reply count", async () => {
    const post = await createPost(userToken)
    const comment = await createComment(userToken, post.slug)

    await registerSecondUser()
    const janeLogin = await loginSecondUser()
    await createReply(janeLogin.accessToken, post.slug, comment._id)
    await createReply(janeLogin.accessToken, post.slug, comment._id)

    const dbPost = await Post.findOne({ slug: post.slug })
    expect(dbPost!.commentsCount).toBe(3)

    await request(app)
      .delete(`/api/admin/comments/${comment._id}`)
      .set("Authorization", `Bearer ${adminToken}`)

    const updated = await Post.findOne({ slug: post.slug })
    expect(updated!.commentsCount).toBe(0)
  })

  it("should decrement repliesCount on parent when a reply is deleted", async () => {
    const post = await createPost(userToken)
    const comment = await createComment(userToken, post.slug)

    await registerSecondUser()
    const janeLogin = await loginSecondUser()
    const reply = await createReply(janeLogin.accessToken, post.slug, comment._id)

    const parentBefore = await Comment.findById(comment._id)
    expect(parentBefore!.repliesCount).toBe(1)

    await request(app)
      .delete(`/api/admin/comments/${reply._id}`)
      .set("Authorization", `Bearer ${adminToken}`)

    const parentAfter = await Comment.findById(comment._id)
    expect(parentAfter!.repliesCount).toBe(0)
  })

  it("should return 401 if no auth token", async () => {
    const post = await createPost(userToken)
    const comment = await createComment(userToken, post.slug)
    const res = await request(app).delete(`/api/admin/comments/${comment._id}`)
    expect(res.status).toBe(401)
  })

  it("should return 404 if comment not found", async () => {
    const res = await request(app)
      .delete("/api/admin/comments/000000000000000000000001")
      .set("Authorization", `Bearer ${adminToken}`)
    expect(res.status).toBe(404)
  })
})
