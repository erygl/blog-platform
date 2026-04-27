import { afterEach, beforeEach, vi, describe, it, expect } from "vitest"
import { app, request, cleanDb, registerUser, loginUser, registerSecondUser, loginSecondUser } from "../../helpers/auth.helper.js"
import { createPost } from "../../helpers/post.helper.js"
import { blockUser } from "../../helpers/block.helper.js"

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

describe("GET /api/tags/:tagSlug", () => {
  it("should return 200 with tag details and posts", async () => {
    await createPost(accessToken, { title: "Learn TypeScript", tags: ["typescript"] })

    const res = await request(app).get("/api/tags/typescript")
    expect(res.status).toBe(200)
    expect(res.body.tag.name).toBe("Typescript")
    expect(res.body.tag.postCount).toBe(1)
    expect(res.body.posts).toHaveLength(1)
    expect(res.body.posts[0]).toHaveProperty("title")
    expect(res.body.posts[0]).toHaveProperty("slug")
    expect(res.body.posts[0]).toHaveProperty("excerpt")
    expect(res.body.posts[0].author).toHaveProperty("username")
    expect(res.body.hasMore).toBe(false)
  })

  it("should return 404 for non-existent tag", async () => {
    const res = await request(app).get("/api/tags/nonexistent")
    expect(res.status).toBe(404)
  })

  it("should paginate posts using cursor", async () => {
    await createPost(accessToken, { title: "TS Post One", tags: ["typescript"] })
    await createPost(accessToken, { title: "TS Post Two", tags: ["typescript"] })
    await createPost(accessToken, { title: "TS Post Three", tags: ["typescript"] })

    const page1 = await request(app).get("/api/tags/typescript?limit=2")
    expect(page1.status).toBe(200)
    expect(page1.body.posts).toHaveLength(2)
    expect(page1.body.hasMore).toBe(true)
    expect(page1.body.nextCursor).toBeDefined()

    const page2 = await request(app).get(`/api/tags/typescript?limit=2&cursor=${page1.body.nextCursor}`)
    expect(page2.status).toBe(200)
    expect(page2.body.posts).toHaveLength(1)
    expect(page2.body.hasMore).toBe(false)
  })

  it("should only return published posts, not drafts", async () => {
    await createPost(accessToken, { title: "Published Mixed Post", tags: ["mixed"] })
    await createPost(accessToken, { title: "Draft Mixed Post", tags: ["mixed"], status: "draft" })

    const res = await request(app).get("/api/tags/mixed")
    expect(res.status).toBe(200)
    expect(res.body.posts).toHaveLength(1)
  })

  it("should return empty posts array when all tagged posts are deleted", async () => {
    const post = await createPost(accessToken, { title: "Ephemeral Post Here", tags: ["ephemeral"] })

    await request(app)
      .delete(`/api/posts/${post.slug}`)
      .set("Authorization", `Bearer ${accessToken}`)

    const res = await request(app).get("/api/tags/ephemeral")
    expect(res.status).toBe(200)
    expect(res.body.posts).toHaveLength(0)
    expect(res.body.hasMore).toBe(false)
  })

  it("should not return posts from blocked authors", async () => {
    await registerSecondUser()
    const { accessToken: janeToken } = await loginSecondUser()
    await createPost(janeToken, { title: "Jane TypeScript Post", tags: ["typescript"] })

    await blockUser(accessToken, "jane")

    const res = await request(app)
      .get("/api/tags/typescript")
      .set("Authorization", `Bearer ${accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.posts).toHaveLength(0)
  })
})
