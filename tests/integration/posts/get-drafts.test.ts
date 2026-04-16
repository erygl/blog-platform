import { afterEach, beforeEach, vi, describe, it, expect } from "vitest"
import { app, request, cleanDb, registerUser, loginUser, registerSecondUser, loginSecondUser } from "../../helpers/auth.helper.js"
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

describe("GET /api/posts/me/drafts", () => {
  it("should return 401 if no auth token", async () => {
    const res = await request(app).get("/api/posts/me/drafts")
    expect(res.status).toBe(401)
  })

  it("should return empty array when no drafts exist", async () => {
    const res = await request(app)
      .get("/api/posts/me/drafts")
      .set("Authorization", `Bearer ${accessToken}`)
    expect(res.status).toBe(200)
    expect(res.body.drafts).toHaveLength(0)
  })

  it("should return only the user's own drafts", async () => {
    await createPost(accessToken, { status: "draft" })

    const res = await request(app)
      .get("/api/posts/me/drafts")
      .set("Authorization", `Bearer ${accessToken}`)
    expect(res.status).toBe(200)
    expect(res.body.drafts).toHaveLength(1)
  })

  it("should not return published posts", async () => {
    await createPost(accessToken, { status: "published" })

    const res = await request(app)
      .get("/api/posts/me/drafts")
      .set("Authorization", `Bearer ${accessToken}`)
    expect(res.status).toBe(200)
    expect(res.body.drafts).toHaveLength(0)
  })

  it("should not return another user's drafts", async () => {
    await registerSecondUser()
    const janeLogin = await loginSecondUser()
    await createPost(janeLogin.accessToken, { status: "draft" })

    const res = await request(app)
      .get("/api/posts/me/drafts")
      .set("Authorization", `Bearer ${accessToken}`)
    expect(res.status).toBe(200)
    expect(res.body.drafts).toHaveLength(0)
  })
})
