import { afterEach, beforeEach, vi, describe, it, expect } from "vitest"
import { app, request, cleanDb, registerUser, loginUser } from "../../helpers/auth.helper.js"
import { createPost } from "../../helpers/post.helper.js"

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

describe("GET /api/posts/:postSlug", () => {
  it("should return a published post without sensitive fields", async () => {
    const post = await createPost(accessToken, { status: "published" })
    const res = await request(app).get(`/api/posts/${post.slug}`)
    expect(res.status).toBe(200)
    expect(res.body.post.slug).toBe(post.slug)
    expect(res.body.post.readingTime).toBeGreaterThanOrEqual(1)
    expect(res.body.post.likes).toBeUndefined()
    expect(res.body.post.trendingScore).toBeUndefined()
  })

  it("should increment view count on each request", async () => {
    const post = await createPost(accessToken, { status: "published" })
    await request(app).get(`/api/posts/${post.slug}`)
    const res = await request(app).get(`/api/posts/${post.slug}`)
    expect(res.status).toBe(200)
    expect(res.body.post.viewsCount).toBe(2)
  })

  it("should return 404 for a non-existent slug", async () => {
    const res = await request(app).get("/api/posts/non-existent-slug")
    expect(res.status).toBe(404)
  })

  it("should return 404 for a draft", async () => {
    const post = await createPost(accessToken, { status: "draft" })
    const res = await request(app).get(`/api/posts/${post.slug}`)
    expect(res.status).toBe(404)
  })
})
