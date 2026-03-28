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

describe("GET /api/users/:username/posts", () => {
  it("should return 200 with published posts", async () => {
    await createPost(accessToken)

    const res = await request(app).get("/api/users/john/posts")

    expect(res.status).toBe(200)
    expect(res.body.posts).toHaveLength(1)
    expect(res.body.posts[0].title).toBe("My Test Post Title")
    expect(res.body.total).toBe(1)
    expect(res.body.hasMore).toBe(false)
  })

  it("should not return draft posts", async () => {
    await createPost(accessToken, { status: "draft" })

    const res = await request(app).get("/api/users/john/posts")

    expect(res.status).toBe(200)
    expect(res.body.posts).toHaveLength(0)
    expect(res.body.total).toBe(0)
  })

  it("should return empty array when user has no posts", async () => {
    const res = await request(app).get("/api/users/john/posts")

    expect(res.status).toBe(200)
    expect(res.body.posts).toHaveLength(0)
    expect(res.body.total).toBe(0)
    expect(res.body.hasMore).toBe(false)
  })

  it("should respect limit and return hasMore", async () => {
    await createPost(accessToken)
    await createPost(accessToken)
    await createPost(accessToken)

    const res = await request(app).get("/api/users/john/posts?limit=2")

    expect(res.status).toBe(200)
    expect(res.body.posts).toHaveLength(2)
    expect(res.body.hasMore).toBe(true)
  })

  it("should return 404 if user not found", async () => {
    const res = await request(app).get("/api/users/nonexistent/posts")
    expect(res.status).toBe(404)
  })
})
