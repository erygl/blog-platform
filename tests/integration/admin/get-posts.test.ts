import { afterEach, beforeEach, vi, describe, it, expect } from "vitest"
import { app, request, cleanDb, registerUser, loginUser } from "../../helpers/auth.helper.js"
import { registerAdmin, loginAdmin } from "../../helpers/admin.helper.js"
import { createPost } from "../../helpers/post.helper.js"

vi.mock("../../../src/utils/email.js", () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined)
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

describe("GET /api/admin/posts", () => {
  it("should return posts array and hasMore", async () => {
    await createPost(userToken)
    const res = await request(app)
      .get("/api/admin/posts")
      .set("Authorization", `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty("posts")
    expect(res.body).toHaveProperty("hasMore")
    expect(Array.isArray(res.body.posts)).toBe(true)
  })

  it("should return 401 if no auth token", async () => {
    const res = await request(app).get("/api/admin/posts")
    expect(res.status).toBe(401)
  })

  it("should filter by status and exclude other statuses", async () => {
    await createPost(userToken, { title: "Draft Post Title Here Long", status: "draft" })
    await createPost(userToken, { title: "Published Post Title Here Long", status: "published" })
    const res = await request(app)
      .get("/api/admin/posts?status=draft")
      .set("Authorization", `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.posts).toHaveLength(1)
    expect(res.body.posts[0].status).toBe("draft")
  })

  it("should filter by author username and exclude posts from other authors", async () => {
    await createPost(userToken)
    await request(app).post("/api/auth/register").send({
      username: "jane",
      name: "Jane Doe",
      email: "jane@example.com",
      password: "Password1"
    })
    const janeLogin = await request(app).post("/api/auth/login").send({
      email: "jane@example.com",
      password: "Password1"
    })
    await createPost(janeLogin.body.accessToken, { title: "Jane Post Title Here Long" })

    const res = await request(app)
      .get("/api/admin/posts?author=john")
      .set("Authorization", `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.posts).toHaveLength(1)
    res.body.posts.forEach((p: { author: { username: string } }) => {
      expect(p.author.username).toBe("john")
    })
  })

  it("should sort by createdAt descending by default", async () => {
    await createPost(userToken, { title: "First Post Title Here" })
    await createPost(userToken, { title: "Second Post Title Here" })
    const res = await request(app)
      .get("/api/admin/posts?sort=createdAt&order=desc")
      .set("Authorization", `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.posts.length).toBeGreaterThanOrEqual(2)
  })

  it("should respect limit and return hasMore true when more exist", async () => {
    for (let i = 0; i < 3; i++) {
      await createPost(userToken, { title: `Post Number ${i} With Long Enough Title` })
    }
    const res = await request(app)
      .get("/api/admin/posts?limit=2&page=1")
      .set("Authorization", `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.posts).toHaveLength(2)
    expect(res.body.hasMore).toBe(true)
  })
})
