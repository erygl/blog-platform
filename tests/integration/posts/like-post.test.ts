import { afterEach, beforeEach, vi, describe, it, expect } from "vitest"
import { app, request, cleanDb, registerUser, loginUser, registerSecondUser, loginSecondUser } from "../../helpers/auth.helper.js"
import User from "../../../src/models/User.js"
import { createPost } from "../../helpers/post.helper.js"

vi.mock("../../../src/utils/email.js", () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined)
}))

let postSlug: string
let authorToken: string
let readerToken: string

beforeEach(async () => {
  await registerUser()
  const authorRes = await loginUser()
  authorToken = authorRes.accessToken
  const post = await createPost(authorToken)
  postSlug = post.slug

  await registerSecondUser()
  const janeLogin = await loginSecondUser()
  readerToken = janeLogin.accessToken
})

afterEach(async () => {
  vi.clearAllMocks()
  await cleanDb()
})

describe("POST /api/posts/:postSlug/like", () => {
  it("should like a post and return 200", async () => {
    const res = await request(app)
      .post(`/api/posts/${postSlug}/like`)
      .set("Authorization", `Bearer ${readerToken}`)
    expect(res.status).toBe(200)
    expect(res.body.message).toBe("Post liked successfully")
  })

  it("should return 409 if post is already liked", async () => {
    await request(app)
      .post(`/api/posts/${postSlug}/like`)
      .set("Authorization", `Bearer ${readerToken}`)
    const res = await request(app)
      .post(`/api/posts/${postSlug}/like`)
      .set("Authorization", `Bearer ${readerToken}`)
    expect(res.status).toBe(409)
  })

  it("should return 404 if post does not exist", async () => {
    const res = await request(app)
      .post("/api/posts/non-existent-slug/like")
      .set("Authorization", `Bearer ${readerToken}`)
    expect(res.status).toBe(404)
  })

  it("should return 404 when trying to like a draft", async () => {
    const draft = await createPost(authorToken, { status: "draft" })
    const res = await request(app)
      .post(`/api/posts/${draft.slug}/like`)
      .set("Authorization", `Bearer ${readerToken}`)
    expect(res.status).toBe(404)
  })

  it("should return 401 if no auth token", async () => {
    const res = await request(app).post(`/api/posts/${postSlug}/like`)
    expect(res.status).toBe(401)
  })
})

describe("DELETE /api/posts/:postSlug/like", () => {
  it("should unlike a post and return 200", async () => {
    await request(app)
      .post(`/api/posts/${postSlug}/like`)
      .set("Authorization", `Bearer ${readerToken}`)
    const res = await request(app)
      .delete(`/api/posts/${postSlug}/like`)
      .set("Authorization", `Bearer ${readerToken}`)
    expect(res.status).toBe(200)
    expect(res.body.message).toBe("Post unliked successfully")
  })

  it("should return 409 if post is not liked yet", async () => {
    const res = await request(app)
      .delete(`/api/posts/${postSlug}/like`)
      .set("Authorization", `Bearer ${readerToken}`)
    expect(res.status).toBe(409)
  })

  it("should return 404 if post does not exist", async () => {
    const res = await request(app)
      .delete("/api/posts/non-existent-slug/like")
      .set("Authorization", `Bearer ${readerToken}`)
    expect(res.status).toBe(404)
  })

  it("should return 401 if no auth token", async () => {
    const res = await request(app).delete(`/api/posts/${postSlug}/like`)
    expect(res.status).toBe(401)
  })
})

describe("GET /api/posts/:postSlug/likes", () => {
  it("should return 200 with likes array and hasMore flag", async () => {
    await request(app)
      .post(`/api/posts/${postSlug}/like`)
      .set("Authorization", `Bearer ${readerToken}`)

    const res = await request(app)
      .get(`/api/posts/${postSlug}/likes`)
      .set("Authorization", `Bearer ${readerToken}`)
    expect(res.status).toBe(200)
    expect(res.body.likes).toHaveLength(1)
    expect(res.body.likes[0].username).toBe("jane")
    expect(res.body.hasMore).toBe(false)
  })

  it("should return empty array when no likes exist", async () => {
    const res = await request(app)
      .get(`/api/posts/${postSlug}/likes`)
      .set("Authorization", `Bearer ${readerToken}`)
    expect(res.status).toBe(200)
    expect(res.body.likes).toHaveLength(0)
    expect(res.body.hasMore).toBe(false)
  })

  it("should respect limit and return hasMore", async () => {
    await request(app).post("/api/auth/register").send({
      username: "bob",
      name: "Bob Smith",
      email: "bob@example.com",
      password: "Password1"
    })
    await User.updateOne({ email: "bob@example.com" }, { isVerified: true })
    const bobLogin = await request(app).post("/api/auth/login").send({
      email: "bob@example.com",
      password: "Password1"
    })
    await request(app)
      .post(`/api/posts/${postSlug}/like`)
      .set("Authorization", `Bearer ${readerToken}`)
    await request(app)
      .post(`/api/posts/${postSlug}/like`)
      .set("Authorization", `Bearer ${bobLogin.body.accessToken}`)

    const res = await request(app)
      .get(`/api/posts/${postSlug}/likes?limit=1`)
      .set("Authorization", `Bearer ${readerToken}`)
    expect(res.status).toBe(200)
    expect(res.body.likes).toHaveLength(1)
    expect(res.body.hasMore).toBe(true)
  })

  it("should return 404 for non-existent post", async () => {
    const res = await request(app)
      .get("/api/posts/non-existent-slug/likes")
      .set("Authorization", `Bearer ${readerToken}`)
    expect(res.status).toBe(404)
  })
})
