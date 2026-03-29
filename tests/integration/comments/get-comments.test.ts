import { afterEach, beforeEach, vi, describe, it, expect } from "vitest"
import { app, request, cleanDb, registerUser, loginUser } from "../../helpers/auth.helper.js"
import { createPost } from "../../helpers/post.helper.js"
import { createComment, createReply } from "../../helpers/comment.helper.js"

vi.mock("../../../src/utils/email.js", () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined)
}))

let accessToken: string
let postSlug: string

beforeEach(async () => {
  await registerUser()
  const res = await loginUser()
  accessToken = res.accessToken
  const post = await createPost(accessToken)
  postSlug = post.slug
})

afterEach(async () => {
  vi.clearAllMocks()
  await cleanDb()
})

describe("GET /api/posts/:postSlug/comments", () => {
  it("should return 200 with comments array and hasMore false", async () => {
    await createComment(accessToken, postSlug)
    const res = await request(app).get(`/api/posts/${postSlug}/comments`)
    expect(res.status).toBe(200)
    expect(res.body.comments).toHaveLength(1)
    expect(res.body.hasMore).toBe(false)
  })

  it("should return empty array when no comments exist", async () => {
    const res = await request(app).get(`/api/posts/${postSlug}/comments`)
    expect(res.status).toBe(200)
    expect(res.body.comments).toHaveLength(0)
    expect(res.body.hasMore).toBe(false)
  })

  it("should respect limit and return hasMore true", async () => {
    await createComment(accessToken, postSlug, { content: "Comment 1" })
    await createComment(accessToken, postSlug, { content: "Comment 2" })
    await createComment(accessToken, postSlug, { content: "Comment 3" })

    const res = await request(app).get(`/api/posts/${postSlug}/comments?limit=2`)
    expect(res.status).toBe(200)
    expect(res.body.comments).toHaveLength(2)
    expect(res.body.hasMore).toBe(true)
  })

  it("should not return replies", async () => {
    const comment = await createComment(accessToken, postSlug)
    await createReply(accessToken, postSlug, comment._id)

    const res = await request(app).get(`/api/posts/${postSlug}/comments`)
    expect(res.status).toBe(200)
    expect(res.body.comments).toHaveLength(1)
  })

  it("should return 404 if post does not exist", async () => {
    const res = await request(app).get("/api/posts/non-existent-slug/comments")
    expect(res.status).toBe(404)
  })
})
