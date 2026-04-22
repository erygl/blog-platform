import { afterEach, beforeEach, vi, describe, it, expect } from "vitest"
import { app, request, cleanDb, registerUser, loginUser } from "../../helpers/auth.helper.js"
import { registerAdmin, loginAdmin } from "../../helpers/admin.helper.js"
import { createPost } from "../../helpers/post.helper.js"
import Post from "../../../src/models/Post.js"

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

describe("GET /api/admin/posts/:postId", () => {
  it("should return post with populated author and tags", async () => {
    const post = await createPost(userToken)
    const dbPost = await Post.findOne({ slug: post.slug })
    const res = await request(app)
      .get(`/api/admin/posts/${dbPost!._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.post).toHaveProperty("author")
    expect(res.body.post.author).toHaveProperty("username")
    expect(res.body.post).toHaveProperty("tags")
  })

  it("should return draft post that is not accessible via public endpoints", async () => {
    const post = await createPost(userToken, { title: "Draft Post Title Here Long", status: "draft" })
    const dbPost = await Post.findOne({ slug: post.slug })
    const res = await request(app)
      .get(`/api/admin/posts/${dbPost!._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.post.status).toBe("draft")
  })

  it("should return archived post", async () => {
    const post = await createPost(userToken, { title: "Archived Post Title Here Long" })
    const dbPost = await Post.findOneAndUpdate(
      { slug: post.slug },
      { status: "archived" },
      { returnDocument: "after" }
    )
    const res = await request(app)
      .get(`/api/admin/posts/${dbPost!._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.post.status).toBe("archived")
  })

  it("should return 401 if no auth token", async () => {
    const post = await createPost(userToken)
    const dbPost = await Post.findOne({ slug: post.slug })
    const res = await request(app).get(`/api/admin/posts/${dbPost!._id}`)
    expect(res.status).toBe(401)
  })

  it("should return 404 if post not found", async () => {
    const res = await request(app)
      .get("/api/admin/posts/000000000000000000000001")
      .set("Authorization", `Bearer ${adminToken}`)
    expect(res.status).toBe(404)
  })

  it("should return 400 if postId is invalid format", async () => {
    const res = await request(app)
      .get("/api/admin/posts/invalid-id")
      .set("Authorization", `Bearer ${adminToken}`)
    expect(res.status).toBe(400)
  })
})
