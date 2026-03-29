import { afterEach, beforeEach, vi, describe, it, expect } from "vitest"
import { app, request, cleanDb, registerUser, loginUser } from "../../helpers/auth.helper.js"
import { createPost } from "../../helpers/post.helper.js"
import { createComment, createReply } from "../../helpers/comment.helper.js"
import Comment from "../../../src/models/Comment.js"

vi.mock("../../../src/utils/email.js", () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined)
}))

let accessToken: string
let readerToken: string
let postSlug: string
let commentId: string

beforeEach(async () => {
  await registerUser()
  const res = await loginUser()
  accessToken = res.accessToken
  const post = await createPost(accessToken)
  postSlug = post.slug
  const comment = await createComment(accessToken, postSlug)
  commentId = comment._id

  await request(app).post("/api/auth/register").send({
    username: "jane",
    email: "jane@example.com",
    password: "Password1"
  })
  const janeLogin = await request(app).post("/api/auth/login").send({
    email: "jane@example.com",
    password: "Password1"
  })
  readerToken = janeLogin.body.accessToken
})

afterEach(async () => {
  vi.clearAllMocks()
  await cleanDb()
})

describe("POST /api/posts/:postSlug/comments/:commentId/like", () => {
  it("should like a comment and return 200", async () => {
    const res = await request(app)
      .post(`/api/posts/${postSlug}/comments/${commentId}/like`)
      .set("Authorization", `Bearer ${readerToken}`)
    expect(res.status).toBe(200)
    expect(res.body.message).toBe("Comment liked successfully")

    const comment = await Comment.findById(commentId).lean()
    expect(comment!.likesCount).toBe(1)
  })

  it("should like a reply and return 200", async () => {
    const reply = await createReply(accessToken, postSlug, commentId)
    const res = await request(app)
      .post(`/api/posts/${postSlug}/comments/${reply._id}/like`)
      .set("Authorization", `Bearer ${readerToken}`)
    expect(res.status).toBe(200)
  })

  it("should return 409 if comment is already liked", async () => {
    await request(app)
      .post(`/api/posts/${postSlug}/comments/${commentId}/like`)
      .set("Authorization", `Bearer ${readerToken}`)
    const res = await request(app)
      .post(`/api/posts/${postSlug}/comments/${commentId}/like`)
      .set("Authorization", `Bearer ${readerToken}`)
    expect(res.status).toBe(409)
  })

  it("should return 404 if comment does not exist", async () => {
    const res = await request(app)
      .post(`/api/posts/${postSlug}/comments/000000000000000000000000/like`)
      .set("Authorization", `Bearer ${readerToken}`)
    expect(res.status).toBe(404)
  })

  it("should return 401 if no auth token", async () => {
    const res = await request(app)
      .post(`/api/posts/${postSlug}/comments/${commentId}/like`)
    expect(res.status).toBe(401)
  })
})

describe("DELETE /api/posts/:postSlug/comments/:commentId/like", () => {
  it("should unlike a comment and return 200", async () => {
    await request(app)
      .post(`/api/posts/${postSlug}/comments/${commentId}/like`)
      .set("Authorization", `Bearer ${readerToken}`)
    const res = await request(app)
      .delete(`/api/posts/${postSlug}/comments/${commentId}/like`)
      .set("Authorization", `Bearer ${readerToken}`)
    expect(res.status).toBe(200)
    expect(res.body.message).toBe("Comment unliked successfully")

    const comment = await Comment.findById(commentId).lean()
    expect(comment!.likesCount).toBe(0)
  })

  it("should unlike a reply and return 200", async () => {
    const reply = await createReply(accessToken, postSlug, commentId)
    await request(app)
      .post(`/api/posts/${postSlug}/comments/${reply._id}/like`)
      .set("Authorization", `Bearer ${readerToken}`)
    const res = await request(app)
      .delete(`/api/posts/${postSlug}/comments/${reply._id}/like`)
      .set("Authorization", `Bearer ${readerToken}`)
    expect(res.status).toBe(200)
  })

  it("should return 400 if comment is not liked", async () => {
    const res = await request(app)
      .delete(`/api/posts/${postSlug}/comments/${commentId}/like`)
      .set("Authorization", `Bearer ${readerToken}`)
    expect(res.status).toBe(400)
  })

  it("should return 404 if comment does not exist", async () => {
    const res = await request(app)
      .delete(`/api/posts/${postSlug}/comments/000000000000000000000000/like`)
      .set("Authorization", `Bearer ${readerToken}`)
    expect(res.status).toBe(404)
  })

  it("should return 401 if no auth token", async () => {
    const res = await request(app)
      .delete(`/api/posts/${postSlug}/comments/${commentId}/like`)
    expect(res.status).toBe(401)
  })
})

describe("GET /api/posts/:postSlug/comments/:commentId/likes", () => {
  it("should return 200 with likes array and hasMore false", async () => {
    await request(app)
      .post(`/api/posts/${postSlug}/comments/${commentId}/like`)
      .set("Authorization", `Bearer ${readerToken}`)

    const res = await request(app)
      .get(`/api/posts/${postSlug}/comments/${commentId}/likes`)
      .set("Authorization", `Bearer ${accessToken}`)
    expect(res.status).toBe(200)
    expect(res.body.likes).toHaveLength(1)
    expect(res.body.likes[0].username).toBe("jane")
    expect(res.body.hasMore).toBe(false)
  })

  it("should return likes for a reply", async () => {
    const reply = await createReply(accessToken, postSlug, commentId)
    await request(app)
      .post(`/api/posts/${postSlug}/comments/${reply._id}/like`)
      .set("Authorization", `Bearer ${readerToken}`)

    const res = await request(app)
      .get(`/api/posts/${postSlug}/comments/${reply._id}/likes`)
      .set("Authorization", `Bearer ${accessToken}`)
    expect(res.status).toBe(200)
    expect(res.body.likes).toHaveLength(1)
  })

  it("should return empty array when no likes", async () => {
    const res = await request(app)
      .get(`/api/posts/${postSlug}/comments/${commentId}/likes`)
      .set("Authorization", `Bearer ${accessToken}`)
    expect(res.status).toBe(200)
    expect(res.body.likes).toHaveLength(0)
    expect(res.body.hasMore).toBe(false)
  })

  it("should respect limit and return hasMore true", async () => {
    await request(app)
      .post(`/api/posts/${postSlug}/comments/${commentId}/like`)
      .set("Authorization", `Bearer ${accessToken}`)
    await request(app)
      .post(`/api/posts/${postSlug}/comments/${commentId}/like`)
      .set("Authorization", `Bearer ${readerToken}`)

    const res = await request(app)
      .get(`/api/posts/${postSlug}/comments/${commentId}/likes?limit=1`)
      .set("Authorization", `Bearer ${accessToken}`)
    expect(res.status).toBe(200)
    expect(res.body.likes).toHaveLength(1)
    expect(res.body.hasMore).toBe(true)
  })

  it("should return 404 if comment does not exist", async () => {
    const res = await request(app)
      .get(`/api/posts/${postSlug}/comments/000000000000000000000000/likes`)
      .set("Authorization", `Bearer ${accessToken}`)
    expect(res.status).toBe(404)
  })
})
