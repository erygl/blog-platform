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

describe("PUT /api/posts/:postSlug", () => {
  it("should update a post and return 200", async () => {
    const post = await createPost(accessToken)
    const res = await request(app)
      .put(`/api/posts/${post.slug}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ title: "Updated Title" })
    expect(res.status).toBe(200)
    expect(res.body.post.title).toBe("Updated Title")
    expect(res.body.message).toBe("Post updated successfully")
  })

  it("should set publishedAt when status changes from draft to published", async () => {
    const post = await createPost(accessToken, { status: "draft" })
    const res = await request(app)
      .put(`/api/posts/${post.slug}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ status: "published" })
    expect(res.status).toBe(200)
    expect(res.body.post.status).toBe("published")
    expect(res.body.post.publishedAt).not.toBeNull()
  })

  it("should return 401 if no auth token", async () => {
    const post = await createPost(accessToken)
    const res = await request(app)
      .put(`/api/posts/${post.slug}`)
      .send({ title: "Updated Title" })
    expect(res.status).toBe(401)
  })

  it("should return 404 if post does not exist", async () => {
    const res = await request(app)
      .put("/api/posts/non-existent-slug")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ title: "Updated Title" })
    expect(res.status).toBe(404)
  })

  it("should return 404 if user does not own the post", async () => {
    await request(app).post("/api/auth/register").send({
      username: "jane",
      email: "jane@example.com",
      password: "Password1"
    })
    const janeLogin = await request(app).post("/api/auth/login").send({
      email: "jane@example.com",
      password: "Password1"
    })
    const janePost = await createPost(janeLogin.body.accessToken)

    const res = await request(app)
      .put(`/api/posts/${janePost.slug}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ title: "Updated Title" })
    expect(res.status).toBe(404)
  })

  it("should return 400 if request body is invalid", async () => {
    const post = await createPost(accessToken)
    const res = await request(app)
      .put(`/api/posts/${post.slug}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ title: "Hi" })
    expect(res.status).toBe(400)
  })
})
