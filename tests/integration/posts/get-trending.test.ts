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

  it("should respect limit query param and return nextCursor", async () => {
    await createPost(accessToken)
    await createPost(accessToken)
    await createPost(accessToken)

    const res = await request(app).get("/api/posts?limit=2")
    expect(res.status).toBe(200)
    expect(res.body.posts).toHaveLength(2)
    expect(res.body.hasMore).toBe(true)
    expect(res.body.nextCursor).toBeDefined()
  })

  it("should return next page using nextCursor", async () => {
    await createPost(accessToken)
    await createPost(accessToken)
    await createPost(accessToken)

    const page1 = await request(app).get("/api/posts?limit=2")
    const page2 = await request(app).get(`/api/posts?limit=2&cursor=${page1.body.nextCursor}`)
    expect(page2.status).toBe(200)
    expect(page2.body.posts).toHaveLength(1)
    expect(page2.body.hasMore).toBe(false)
  })
})
