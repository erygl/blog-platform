import { afterEach, beforeEach, vi, describe, it, expect } from "vitest"
import { app, request, cleanDb, registerUser, loginUser } from "../../helpers/auth.helper.js"

vi.mock("../../../src/utils/email.js", async (importOriginal) => ({
  ...await importOriginal(),
  sendEmail: vi.fn().mockResolvedValue(undefined)
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

describe("POST /api/posts", () => {
  it("should create a draft post and return 201", async () => {
    const res = await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        title: "My Draft Post",
        content: "This is the body of the draft post and it is long enough to pass validation.",
        status: "draft"
      })
    expect(res.status).toBe(201)
    expect(res.body.post.status).toBe("draft")
    expect(res.body.post.slug).toBeDefined()
    expect(res.body.post.readingTime).toBeGreaterThanOrEqual(1)
    expect(res.body.message).toBe("Post created successfully")
  })

  it("should create a published post and return 201", async () => {
    const res = await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        title: "My Published Post",
        content: "This is the body of the published post and it is long enough to pass validation.",
        status: "published"
      })
    expect(res.status).toBe(201)
    expect(res.body.post.status).toBe("published")
    expect(res.body.post.publishedAt).not.toBeNull()
  })

  it("should create a post with tags", async () => {
    const res = await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        title: "My Tagged Post",
        content: "This is the body of the tagged post and it is long enough to pass validation.",
        status: "published",
        tags: ["typescript", "node"]
      })
    expect(res.status).toBe(201)
    expect(res.body.post.tags).toHaveLength(2)
  })

  it("should return 401 if no auth token", async () => {
    const res = await request(app)
      .post("/api/posts")
      .send({
        title: "Unauthorized Post",
        content: "This is the body of the post and it is long enough to pass validation.",
        status: "draft"
      })
    expect(res.status).toBe(401)
  })

  it("should return 400 if request body is invalid", async () => {
    const res = await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ title: "Hi" })
    expect(res.status).toBe(400)
  })
})
