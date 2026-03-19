import { afterEach, beforeEach, vi, describe, it, expect } from "vitest"
import { app, request, cleanDb, registerUser, loginUser } from "../../helpers/auth.helper.js"
import { createPost } from "../../helpers/post.helper.js"
import User from "../../../src/models/User.js"

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

describe("GET /api/posts/feed", () => {
  it("should return 401 if no auth token", async () => {
    const res = await request(app).get("/api/posts/feed")
    expect(res.status).toBe(401)
  })

  it("should return empty feed when not following anyone", async () => {
    const res = await request(app)
      .get("/api/posts/feed")
      .set("Authorization", `Bearer ${accessToken}`)
    expect(res.status).toBe(200)
    expect(res.body.posts).toHaveLength(0)
    expect(res.body.hasMore).toBe(false)
  })

  it("should return posts from followed users", async () => {
    await request(app).post("/api/auth/register").send({
      username: "jane",
      email: "jane@example.com",
      password: "Password1"
    })
    const janeLogin = await request(app).post("/api/auth/login").send({
      email: "jane@example.com",
      password: "Password1"
    })
    await createPost(janeLogin.body.accessToken)

    const john = await User.findOne({ username: "john" })
    const jane = await User.findOne({ username: "jane" })
    await User.findByIdAndUpdate(john!._id, { $push: { following: jane!._id } })

    const res = await request(app)
      .get("/api/posts/feed")
      .set("Authorization", `Bearer ${accessToken}`)
    expect(res.status).toBe(200)
    expect(res.body.posts).toHaveLength(1)
    expect(res.body.posts[0].author.username).toBe("jane")
    expect(res.body.hasMore).toBe(false)
  })

  it("should not return posts from users not followed", async () => {
    await request(app).post("/api/auth/register").send({
      username: "jane",
      email: "jane@example.com",
      password: "Password1"
    })
    const janeLogin = await request(app).post("/api/auth/login").send({
      email: "jane@example.com",
      password: "Password1"
    })
    await createPost(janeLogin.body.accessToken)

    const res = await request(app)
      .get("/api/posts/feed")
      .set("Authorization", `Bearer ${accessToken}`)
    expect(res.status).toBe(200)
    expect(res.body.posts).toHaveLength(0)
  })

  it("should respect limit and return hasMore", async () => {
    await request(app).post("/api/auth/register").send({
      username: "jane",
      email: "jane@example.com",
      password: "Password1"
    })
    const janeLogin = await request(app).post("/api/auth/login").send({
      email: "jane@example.com",
      password: "Password1"
    })
    const janeToken = janeLogin.body.accessToken
    await createPost(janeToken)
    await createPost(janeToken)
    await createPost(janeToken)

    const john = await User.findOne({ username: "john" })
    const jane = await User.findOne({ username: "jane" })
    await User.findByIdAndUpdate(john!._id, { $push: { following: jane!._id } })

    const res = await request(app)
      .get("/api/posts/feed?limit=2")
      .set("Authorization", `Bearer ${accessToken}`)
    expect(res.status).toBe(200)
    expect(res.body.posts).toHaveLength(2)
    expect(res.body.hasMore).toBe(true)
  })

  it("should not return drafts from followed users", async () => {
    await request(app).post("/api/auth/register").send({
      username: "jane",
      email: "jane@example.com",
      password: "Password1"
    })
    const janeLogin = await request(app).post("/api/auth/login").send({
      email: "jane@example.com",
      password: "Password1"
    })
    await createPost(janeLogin.body.accessToken, { status: "draft" })

    const john = await User.findOne({ username: "john" })
    const jane = await User.findOne({ username: "jane" })
    await User.findByIdAndUpdate(john!._id, { $push: { following: jane!._id } })

    const res = await request(app)
      .get("/api/posts/feed")
      .set("Authorization", `Bearer ${accessToken}`)
    expect(res.status).toBe(200)
    expect(res.body.posts).toHaveLength(0)
    expect(res.body.hasMore).toBe(false)
  })
})
