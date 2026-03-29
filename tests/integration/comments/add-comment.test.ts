import { afterEach, beforeEach, vi, describe, it, expect } from "vitest"
import { app, request, cleanDb, registerUser, loginUser } from "../../helpers/auth.helper.js"
import { createPost } from "../../helpers/post.helper.js"
import Post from "../../../src/models/Post.js"

vi.mock("../../../src/utils/email.js", () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined)
}))

let accessToken: string
let postSlug: string

beforeEach(async () => {
  await registerUser()
  const res = await loginUser()
  accessToken = res.accessToken
  const post = await createPost(accessToken)
  postSlug = post.slug
})

afterEach(async () => {
  vi.clearAllMocks()
  await cleanDb()
})

describe("POST /api/posts/:postSlug/comments", () => {
  it("should create a comment and return 201", async () => {
    const res = await request(app)
      .post(`/api/posts/${postSlug}/comments`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ content: "Great post!" })
    expect(res.status).toBe(201)
    expect(res.body.comment.content).toBe("Great post!")
    expect(res.body.message).toBe("Comment created successfully")
  })

  it("should increment post commentsCount", async () => {
    await request(app)
      .post(`/api/posts/${postSlug}/comments`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ content: "Great post!" })

    const post = await Post.findOne({ slug: postSlug }).lean()
    expect(post!.commentsCount).toBe(1)
  })

  it("should return 401 if no auth token", async () => {
    const res = await request(app)
      .post(`/api/posts/${postSlug}/comments`)
      .send({ content: "Great post!" })
    expect(res.status).toBe(401)
  })

  it("should return 400 if body is invalid", async () => {
    const res = await request(app)
      .post(`/api/posts/${postSlug}/comments`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ content: "" })
    expect(res.status).toBe(400)
  })

  it("should return 404 if post does not exist", async () => {
    const res = await request(app)
      .post("/api/posts/non-existent-slug/comments")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ content: "Great post!" })
    expect(res.status).toBe(404)
  })
})
