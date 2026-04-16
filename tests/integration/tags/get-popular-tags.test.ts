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

describe("GET /api/tags", () => {
  it("should return 200 with empty tags array when no tags exist", async () => {
    const res = await request(app).get("/api/tags")
    expect(res.status).toBe(200)
    expect(res.body.tags).toHaveLength(0)
  })

  it("should return tags sorted by postCount descending", async () => {
    await createPost(accessToken, { title: "TS Post One", tags: ["typescript"] })
    await createPost(accessToken, { title: "TS Post Two", tags: ["typescript"] })
    await createPost(accessToken, { title: "TS Post Three", tags: ["typescript"] })
    await createPost(accessToken, { title: "Node Post One", tags: ["node"] })
    await createPost(accessToken, { title: "Node Post Two", tags: ["node"] })
    await createPost(accessToken, { title: "React Post One", tags: ["react"] })

    const res = await request(app).get("/api/tags")
    expect(res.status).toBe(200)
    expect(res.body.tags).toHaveLength(3)
    expect(res.body.tags[0].name).toBe("Typescript")
    expect(res.body.tags[0].postCount).toBe(3)
    expect(res.body.tags[1].name).toBe("Node")
    expect(res.body.tags[1].postCount).toBe(2)
    expect(res.body.tags[2].name).toBe("React")
    expect(res.body.tags[2].postCount).toBe(1)
  })

  it("should only return tags with postCount greater than 0", async () => {
    await createPost(accessToken, { title: "Active Tag Post", tags: ["active"] })
    await createPost(accessToken, { title: "Inactive Tag Post", tags: ["inactive"], status: "draft" })

    const res = await request(app).get("/api/tags")
    expect(res.status).toBe(200)
    expect(res.body.tags).toHaveLength(1)
    expect(res.body.tags[0].name).toBe("Active")
  })

  it("should respect limit query param", async () => {
    await createPost(accessToken, { title: "Tag A Post", tags: ["alpha"] })
    await createPost(accessToken, { title: "Tag B Post", tags: ["beta"] })
    await createPost(accessToken, { title: "Tag C Post", tags: ["gamma"] })

    const res = await request(app).get("/api/tags?limit=2")
    expect(res.status).toBe(200)
    expect(res.body.tags).toHaveLength(2)
  })
})
