import { afterEach, beforeEach, vi, describe, it, expect } from "vitest"
import { app, request, cleanDb, registerUser, loginUser } from "../../helpers/auth.helper.js"
import { createPost } from "../../helpers/post.helper.js"

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

describe("GET /api/users/me/likes", () => {
  it("should return 200 with liked posts", async () => {
    const post = await createPost(accessToken)
    await request(app)
      .post(`/api/posts/${post.slug}/like`)
      .set("Authorization", `Bearer ${accessToken}`)

    const res = await request(app)
      .get("/api/users/me/likes")
      .set("Authorization", `Bearer ${accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.posts).toHaveLength(1)
    expect(res.body.posts[0].title).toBe("My Test Post Title")
    expect(res.body.hasMore).toBe(false)
  })

  it("should return empty array when no liked posts", async () => {
    const res = await request(app)
      .get("/api/users/me/likes")
      .set("Authorization", `Bearer ${accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.posts).toHaveLength(0)
    expect(res.body.hasMore).toBe(false)
  })

  it("should respect limit and return hasMore with nextCursor", async () => {
    const post1 = await createPost(accessToken, {
      title: "First Post Title Here",
      content: "This is the body of the test post and it is long enough to pass validation.",
      status: "published"
    })
    const post2 = await createPost(accessToken, {
      title: "Second Post Title Here",
      content: "This is the body of the test post and it is long enough to pass validation.",
      status: "published"
    })
    const post3 = await createPost(accessToken, {
      title: "Third Post Title Here",
      content: "This is the body of the test post and it is long enough to pass validation.",
      status: "published"
    })

    await request(app).post(`/api/posts/${post1.slug}/like`).set("Authorization", `Bearer ${accessToken}`)
    await request(app).post(`/api/posts/${post2.slug}/like`).set("Authorization", `Bearer ${accessToken}`)
    await request(app).post(`/api/posts/${post3.slug}/like`).set("Authorization", `Bearer ${accessToken}`)

    const page1 = await request(app)
      .get("/api/users/me/likes?limit=2")
      .set("Authorization", `Bearer ${accessToken}`)

    expect(page1.status).toBe(200)
    expect(page1.body.posts).toHaveLength(2)
    expect(page1.body.hasMore).toBe(true)
    expect(page1.body.nextCursor).toBeDefined()

    const page2 = await request(app)
      .get(`/api/users/me/likes?limit=2&cursor=${page1.body.nextCursor}`)
      .set("Authorization", `Bearer ${accessToken}`)

    expect(page2.status).toBe(200)
    expect(page2.body.posts).toHaveLength(1)
    expect(page2.body.hasMore).toBe(false)
  })

  it("should return 401 if no auth token", async () => {
    const res = await request(app).get("/api/users/me/likes")
    expect(res.status).toBe(401)
  })
})
