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

describe("GET /api/posts", () => {
  it("should return 200 with posts array and hasMore flag", async () => {
    await createPost(accessToken)

    const res = await request(app).get("/api/posts")
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty("posts")
    expect(Array.isArray(res.body.posts)).toBe(true)
    expect(res.body).toHaveProperty("hasMore")
  })

  it("should only return published posts", async () => {
    await createPost(accessToken, { status: "draft" })

    const res = await request(app).get("/api/posts")
    expect(res.status).toBe(200)
    expect(res.body.posts).toHaveLength(0)
  })

  it("should return empty array when no posts exist", async () => {
    const res = await request(app).get("/api/posts")
    expect(res.status).toBe(200)
    expect(res.body.posts).toHaveLength(0)
    expect(res.body.hasMore).toBe(false)
  })

  it("should respect limit query param", async () => {
    await createPost(accessToken)
    await createPost(accessToken)
    await createPost(accessToken)

    const res = await request(app).get("/api/posts?limit=2")
    expect(res.status).toBe(200)
    expect(res.body.posts).toHaveLength(2)
    expect(res.body.hasMore).toBe(true)
  })
})
