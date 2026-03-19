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

describe("GET /api/posts/me/drafts/:postSlug", () => {
  it("should return 401 if no auth token", async () => {
    const res = await request(app).get("/api/posts/me/drafts/some-slug")
    expect(res.status).toBe(401)
  })

  it("should return the draft by slug", async () => {
    const post = await createPost(accessToken, { status: "draft" })
    const res = await request(app)
      .get(`/api/posts/me/drafts/${post.slug}`)
      .set("Authorization", `Bearer ${accessToken}`)
    expect(res.status).toBe(200)
    expect(res.body.draft.slug).toBe(post.slug)
  })

  it("should return 404 for a non-existent slug", async () => {
    const res = await request(app)
      .get("/api/posts/me/drafts/non-existent-slug")
      .set("Authorization", `Bearer ${accessToken}`)
    expect(res.status).toBe(404)
  })

  it("should return 404 for another user's draft", async () => {
    await request(app).post("/api/auth/register").send({
      username: "jane",
      email: "jane@example.com",
      password: "Password1"
    })
    const janeLogin = await request(app).post("/api/auth/login").send({
      email: "jane@example.com",
      password: "Password1"
    })
    const janeDraft = await createPost(janeLogin.body.accessToken, { status: "draft" })

    const res = await request(app)
      .get(`/api/posts/me/drafts/${janeDraft.slug}`)
      .set("Authorization", `Bearer ${accessToken}`)
    expect(res.status).toBe(404)
  })

  it("should return 404 for a published post", async () => {
    const post = await createPost(accessToken, { status: "published" })
    const res = await request(app)
      .get(`/api/posts/me/drafts/${post.slug}`)
      .set("Authorization", `Bearer ${accessToken}`)
    expect(res.status).toBe(404)
  })
})
