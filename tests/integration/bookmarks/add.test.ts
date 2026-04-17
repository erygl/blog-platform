import { afterEach, beforeEach, vi, describe, it, expect } from "vitest"
import { app, request, cleanDb, registerUser, loginUser, registerSecondUser, loginSecondUser } from "../../helpers/auth.helper.js"
import { createPost } from "../../helpers/post.helper.js"

vi.mock("../../../src/utils/email.js", () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined)
}))

let authorToken: string
let readerToken: string
let postSlug: string

beforeEach(async () => {
  await registerUser()
  const authorRes = await loginUser()
  authorToken = authorRes.accessToken
  const post = await createPost(authorToken)
  postSlug = post.slug

  await registerSecondUser()
  const janeRes = await loginSecondUser()
  readerToken = janeRes.accessToken
})

afterEach(async () => {
  vi.clearAllMocks()
  await cleanDb()
})

describe("POST /api/bookmarks/:postSlug", () => {
  it("should add a bookmark and return 201", async () => {
    const res = await request(app)
      .post(`/api/bookmarks/${postSlug}`)
      .set("Authorization", `Bearer ${readerToken}`)
    expect(res.status).toBe(201)
    expect(res.body.message).toBe("Post added to bookmarks successfully")
  })

  it("should return 409 if post is already bookmarked", async () => {
    await request(app)
      .post(`/api/bookmarks/${postSlug}`)
      .set("Authorization", `Bearer ${readerToken}`)
    const res = await request(app)
      .post(`/api/bookmarks/${postSlug}`)
      .set("Authorization", `Bearer ${readerToken}`)
    expect(res.status).toBe(409)
  })

  it("should return 404 if post does not exist", async () => {
    const res = await request(app)
      .post("/api/bookmarks/non-existent-slug")
      .set("Authorization", `Bearer ${readerToken}`)
    expect(res.status).toBe(404)
  })

  it("should return 404 when trying to bookmark a draft", async () => {
    const draft = await createPost(authorToken, { status: "draft" })
    const res = await request(app)
      .post(`/api/bookmarks/${draft.slug}`)
      .set("Authorization", `Bearer ${readerToken}`)
    expect(res.status).toBe(404)
  })

  it("should return 401 if no auth token", async () => {
    const res = await request(app).post(`/api/bookmarks/${postSlug}`)
    expect(res.status).toBe(401)
  })
})
