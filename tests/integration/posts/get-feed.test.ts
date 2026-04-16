import { afterEach, beforeEach, vi, describe, it, expect } from "vitest"
import { app, request, cleanDb, registerUser, loginUser, registerSecondUser, loginSecondUser } from "../../helpers/auth.helper.js"
import { createPost } from "../../helpers/post.helper.js"
import User from "../../../src/models/User.js"
import Follow from "../../../src/models/Follow.js"

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
    await registerSecondUser()
    const janeLogin = await loginSecondUser()
    await createPost(janeLogin.accessToken)

    const john = await User.findOne({ username: "john" })
    const jane = await User.findOne({ username: "jane" })
    await Follow.create({ follower: john!._id, following: jane!._id })

    const res = await request(app)
      .get("/api/posts/feed")
      .set("Authorization", `Bearer ${accessToken}`)
    expect(res.status).toBe(200)
    expect(res.body.posts).toHaveLength(1)
    expect(res.body.posts[0].author.username).toBe("jane")
    expect(res.body.hasMore).toBe(false)
  })

  it("should not return posts from users not followed", async () => {
    await registerSecondUser()
    const janeLogin = await loginSecondUser()
    await createPost(janeLogin.accessToken)

    const res = await request(app)
      .get("/api/posts/feed")
      .set("Authorization", `Bearer ${accessToken}`)
    expect(res.status).toBe(200)
    expect(res.body.posts).toHaveLength(0)
  })

  it("should respect limit and return hasMore", async () => {
    await registerSecondUser()
    const janeLogin = await loginSecondUser()
    const janeToken = janeLogin.accessToken
    await createPost(janeToken)
    await createPost(janeToken)
    await createPost(janeToken)

    const john = await User.findOne({ username: "john" })
    const jane = await User.findOne({ username: "jane" })
    await Follow.create({ follower: john!._id, following: jane!._id })

    const res = await request(app)
      .get("/api/posts/feed?limit=2")
      .set("Authorization", `Bearer ${accessToken}`)
    expect(res.status).toBe(200)
    expect(res.body.posts).toHaveLength(2)
    expect(res.body.hasMore).toBe(true)
  })

  it("should not return drafts from followed users", async () => {
    await registerSecondUser()
    const janeLogin = await loginSecondUser()
    await createPost(janeLogin.accessToken, { status: "draft" })

    const john = await User.findOne({ username: "john" })
    const jane = await User.findOne({ username: "jane" })
    await Follow.create({ follower: john!._id, following: jane!._id })

    const res = await request(app)
      .get("/api/posts/feed")
      .set("Authorization", `Bearer ${accessToken}`)
    expect(res.status).toBe(200)
    expect(res.body.posts).toHaveLength(0)
    expect(res.body.hasMore).toBe(false)
  })
})
