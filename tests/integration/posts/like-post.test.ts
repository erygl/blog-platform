import { afterEach, beforeEach, vi, describe, it, expect } from "vitest"
import { app, request, cleanDb, registerUser, loginUser } from "../../helpers/auth.helper.js"
import { createPost } from "../../helpers/post.helper.js"

vi.mock("../../../src/utils/email.js", () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined)
}))

let postSlug: string
let readerToken: string

beforeEach(async () => {
  await registerUser()
  const authorRes = await loginUser()
  const post = await createPost(authorRes.accessToken)
  postSlug = post.slug

  await request(app).post("/api/auth/register").send({
    username: "jane",
    email: "jane@example.com",
    password: "Password1"
  })
  const janeLogin = await request(app).post("/api/auth/login").send({
    email: "jane@example.com",
    password: "Password1"
  })
  readerToken = janeLogin.body.accessToken
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

  it("should return 400 if post is not liked yet", async () => {
    const res = await request(app)
      .delete(`/api/posts/${postSlug}/like`)
      .set("Authorization", `Bearer ${readerToken}`)
    expect(res.status).toBe(400)
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
