import { afterEach, beforeEach, vi, describe, it, expect } from "vitest"
import { app, request, cleanDb, registerUser, loginUser, registerSecondUser, loginSecondUser } from "../../helpers/auth.helper.js"
import { createPost } from "../../helpers/post.helper.js"

vi.mock("../../../src/utils/email.js", async (importOriginal) => ({
  ...await importOriginal(),
  sendEmail: vi.fn().mockResolvedValue(undefined)
}))

let authorToken: string
let readerToken: string
let postSlug: string

beforeEach(async () => {
  await registerUser()
  const authorRes = await loginUser()
  authorToken = authorRes.accessToken
  const post = await createPost(authorToken)
  postSlug = post.slug

  await registerSecondUser()
  const janeRes = await loginSecondUser()
  readerToken = janeRes.accessToken
})

afterEach(async () => {
  vi.clearAllMocks()
  await cleanDb()
})

describe("GET /api/bookmarks", () => {
  it("should return empty array when no bookmarks exist", async () => {
    const res = await request(app)
      .get("/api/bookmarks")
      .set("Authorization", `Bearer ${readerToken}`)
    expect(res.status).toBe(200)
    expect(res.body.bookmarks).toHaveLength(0)
    expect(res.body.hasMore).toBe(false)
  })

  it("should return bookmarks with populated post and author fields", async () => {
    await request(app)
      .post(`/api/bookmarks/${postSlug}`)
      .set("Authorization", `Bearer ${readerToken}`)
    const res = await request(app)
      .get("/api/bookmarks")
      .set("Authorization", `Bearer ${readerToken}`)
    expect(res.status).toBe(200)
    expect(res.body.bookmarks).toHaveLength(1)
    expect(res.body.hasMore).toBe(false)
    const bookmark = res.body.bookmarks[0]
    expect(bookmark.title).toBeDefined()
    expect(bookmark.slug).toBe(postSlug)
    expect(bookmark.author.username).toBe("john")
    expect(bookmark.author.name).toBeDefined()
    expect(bookmark.author.avatar).toBeDefined()
  })

  it("should respect limit and return hasMore with nextCursor", async () => {
    for (let i = 0; i < 3; i++) {
      const post = await createPost(authorToken)
      await request(app)
        .post(`/api/bookmarks/${post.slug}`)
        .set("Authorization", `Bearer ${readerToken}`)
    }
    const page1 = await request(app)
      .get("/api/bookmarks?limit=2")
      .set("Authorization", `Bearer ${readerToken}`)
    expect(page1.status).toBe(200)
    expect(page1.body.bookmarks).toHaveLength(2)
    expect(page1.body.hasMore).toBe(true)
    expect(page1.body.nextCursor).toBeDefined()

    const page2 = await request(app)
      .get(`/api/bookmarks?limit=2&cursor=${page1.body.nextCursor}`)
      .set("Authorization", `Bearer ${readerToken}`)
    expect(page2.status).toBe(200)
    expect(page2.body.bookmarks).toHaveLength(1)
    expect(page2.body.hasMore).toBe(false)
  })

  it("should only return the current user's bookmarks", async () => {
    await request(app)
      .post(`/api/bookmarks/${postSlug}`)
      .set("Authorization", `Bearer ${readerToken}`)
    const res = await request(app)
      .get("/api/bookmarks")
      .set("Authorization", `Bearer ${authorToken}`)
    expect(res.status).toBe(200)
    expect(res.body.bookmarks).toHaveLength(0)
  })

  it("should return 401 if no auth token", async () => {
    const res = await request(app).get("/api/bookmarks")
    expect(res.status).toBe(401)
  })

  it("should not return bookmarked posts from blocked authors", async () => {
    await request(app)
      .post(`/api/bookmarks/${postSlug}`)
      .set("Authorization", `Bearer ${readerToken}`)

    await request(app)
      .post(`/api/blocks/john`)
      .set("Authorization", `Bearer ${readerToken}`)

    const res = await request(app)
      .get("/api/bookmarks")
      .set("Authorization", `Bearer ${readerToken}`)

    expect(res.status).toBe(200)
    expect(res.body.bookmarks).toHaveLength(0)
  })
})
