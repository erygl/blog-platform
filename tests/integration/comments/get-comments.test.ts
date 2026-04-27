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

  it("should respect limit and return hasMore with nextCursor", async () => {
    await createComment(accessToken, postSlug, { content: "Comment 1" })
    await createComment(accessToken, postSlug, { content: "Comment 2" })
    await createComment(accessToken, postSlug, { content: "Comment 3" })

    const page1 = await request(app).get(`/api/posts/${postSlug}/comments?limit=2`)
    expect(page1.status).toBe(200)
    expect(page1.body.comments).toHaveLength(2)
    expect(page1.body.hasMore).toBe(true)
    expect(page1.body.nextCursor).toBeDefined()

    const page2 = await request(app).get(`/api/posts/${postSlug}/comments?limit=2&cursor=${page1.body.nextCursor}`)
    expect(page2.status).toBe(200)
    expect(page2.body.comments).toHaveLength(1)
    expect(page2.body.hasMore).toBe(false)
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

  it("should not return comments from blocked authors", async () => {
    // bob owns the post, jane comments, john blocks jane and views — neutral 3rd party setup
    await request(app)
      .post("/api/auth/register")
      .send({ username: "bob", name: "Bob", email: "bob@example.com", password: "Password1" })
    await User.updateOne({ username: "bob" }, { isVerified: true })
    const { body: { accessToken: bobToken } } = await request(app)
      .post("/api/auth/login")
      .send({ email: "bob@example.com", password: "Password1" })
    const bobPost = await createPost(bobToken)

    await registerSecondUser()
    const { accessToken: janeToken } = await loginSecondUser()
    await createComment(janeToken, bobPost.slug)

    await blockUser(accessToken, "jane")

    const res = await request(app)
      .get(`/api/posts/${bobPost.slug}/comments`)
      .set("Authorization", `Bearer ${accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.comments).toHaveLength(0)
  })
})
