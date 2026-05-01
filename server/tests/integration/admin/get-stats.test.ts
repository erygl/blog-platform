import { afterEach, beforeEach, vi, describe, it, expect } from "vitest"
import { app, request, cleanDb, registerUser, loginUser } from "../../helpers/auth.helper.js"
import { registerAdmin, loginAdmin } from "../../helpers/admin.helper.js"
import { createPost } from "../../helpers/post.helper.js"
import { createComment } from "../../helpers/comment.helper.js"
import Tag from "../../../src/models/Tag.js"
import User from "../../../src/models/User.js"

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

describe("GET /api/admin/stats", () => {
  it("should return correct stats structure", async () => {
    const res = await request(app)
      .get("/api/admin/stats")
      .set("Authorization", `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.stats).toMatchObject({
      users: expect.objectContaining({
        total: expect.any(Number),
        verified: expect.any(Number),
        unverified: expect.any(Number),
        banned: expect.any(Number)
      }),
      posts: expect.objectContaining({
        published: expect.any(Number),
        draft: expect.any(Number),
        archived: expect.any(Number)
      }),
      comments: expect.any(Number),
      tags: expect.any(Number)
    })
  })

  it("should return accurate counts matching seeded data", async () => {
    await User.findOneAndUpdate({ email: "john@example.com" }, { isVerified: true })
    await createPost(userToken, { title: "Published Post Title Long Enough", status: "published" })
    await createPost(userToken, { title: "Draft Post Title Long Enough Here", status: "draft" })
    const publishedPost = await createPost(userToken, { title: "Another Published Post Long", status: "published" })
    await createComment(userToken, publishedPost.slug)
    await Tag.create({ name: "JavaScript", slug: "javascript" })

    const res = await request(app)
      .get("/api/admin/stats")
      .set("Authorization", `Bearer ${adminToken}`)
    expect(res.status).toBe(200)

    const { users, posts, comments, tags } = res.body.stats
    expect(users.total).toBe(2)
    expect(users.verified).toBe(2)
    expect(users.unverified).toBe(0)
    expect(users.banned).toBe(0)
    expect(posts.published).toBe(2)
    expect(posts.draft).toBe(1)
    expect(posts.archived).toBe(0)
    expect(comments).toBe(1)
    expect(tags).toBe(1)
  })

  it("should filter stats by startDate and endDate", async () => {
    await createPost(userToken)

    const future = new Date()
    future.setFullYear(future.getFullYear() + 1)
    const futureStr = future.toISOString().split("T")[0]

    const res = await request(app)
      .get(`/api/admin/stats?startDate=${futureStr}&endDate=${futureStr}`)
      .set("Authorization", `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.stats.posts.published).toBe(0)
  })

  it("should return 400 if startDate is after endDate", async () => {
    const res = await request(app)
      .get("/api/admin/stats?startDate=2026-12-31&endDate=2026-01-01")
      .set("Authorization", `Bearer ${adminToken}`)
    expect(res.status).toBe(400)
  })

  it("should return 401 if no auth token", async () => {
    const res = await request(app).get("/api/admin/stats")
    expect(res.status).toBe(401)
  })
})
