import { afterEach, beforeEach, vi, describe, it, expect } from "vitest"
import { app, request, cleanDb, registerUser, loginUser, registerSecondUser, loginSecondUser } from "../../helpers/auth.helper.js"
import { createPost } from "../../helpers/post.helper.js"
import { createComment, createReply } from "../../helpers/comment.helper.js"
import { blockUser } from "../../helpers/block.helper.js"
import User from "../../../src/models/User.js"

vi.mock("../../../src/utils/email.js", async (importOriginal) => ({
  ...await importOriginal(),
  sendEmail: vi.fn().mockResolvedValue(undefined)
}))

let accessToken: string
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
})

afterEach(async () => {
  vi.clearAllMocks()
  await cleanDb()
})

describe("GET /api/posts/:postSlug/comments/:commentId/replies", () => {
  it("should return 200 with replies array and hasMore false", async () => {
    await createReply(accessToken, postSlug, commentId)
    const res = await request(app)
      .get(`/api/posts/${postSlug}/comments/${commentId}/replies`)
    expect(res.status).toBe(200)
    expect(res.body.replies).toHaveLength(1)
    expect(res.body.hasMore).toBe(false)
  })

  it("should return empty array when no replies", async () => {
    const res = await request(app)
      .get(`/api/posts/${postSlug}/comments/${commentId}/replies`)
    expect(res.status).toBe(200)
    expect(res.body.replies).toHaveLength(0)
    expect(res.body.hasMore).toBe(false)
  })

  it("should respect limit and return hasMore with nextCursor", async () => {
    await createReply(accessToken, postSlug, commentId, { content: "Reply 1" })
    await createReply(accessToken, postSlug, commentId, { content: "Reply 2" })
    await createReply(accessToken, postSlug, commentId, { content: "Reply 3" })

    const page1 = await request(app)
      .get(`/api/posts/${postSlug}/comments/${commentId}/replies?limit=2`)
    expect(page1.status).toBe(200)
    expect(page1.body.replies).toHaveLength(2)
    expect(page1.body.hasMore).toBe(true)
    expect(page1.body.nextCursor).toBeDefined()

    const page2 = await request(app)
      .get(`/api/posts/${postSlug}/comments/${commentId}/replies?limit=2&cursor=${page1.body.nextCursor}`)
    expect(page2.status).toBe(200)
    expect(page2.body.replies).toHaveLength(1)
    expect(page2.body.hasMore).toBe(false)
  })

  it("should return 404 if comment does not exist", async () => {
    const res = await request(app)
      .get(`/api/posts/${postSlug}/comments/000000000000000000000000/replies`)
    expect(res.status).toBe(404)
  })

  it("should not return replies from blocked authors", async () => {
    // bob owns the post and the parent comment, jane replies, john blocks jane and views
    await request(app)
      .post("/api/auth/register")
      .send({ username: "bob", name: "Bob", email: "bob@example.com", password: "Password1" })
    await User.updateOne({ username: "bob" }, { isVerified: true })
    const { body: { accessToken: bobToken } } = await request(app)
      .post("/api/auth/login")
      .send({ email: "bob@example.com", password: "Password1" })
    const bobPost = await createPost(bobToken)
    const bobComment = await createComment(bobToken, bobPost.slug)

    await registerSecondUser()
    const { accessToken: janeToken } = await loginSecondUser()
    await createReply(janeToken, bobPost.slug, bobComment._id)

    await blockUser(accessToken, "jane")

    const res = await request(app)
      .get(`/api/posts/${bobPost.slug}/comments/${bobComment._id}/replies`)
      .set("Authorization", `Bearer ${accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.replies).toHaveLength(0)
  })
})
