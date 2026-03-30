import { afterEach, beforeEach, vi, describe, it, expect } from "vitest"
import { app, request, cleanDb, registerUser, loginUser } from "../../helpers/auth.helper.js"
import { createPost } from "../../helpers/post.helper.js"
import Tag from "../../../src/models/Tag.js"

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

describe("GET /api/search", () => {
  it("should return 400 when q param is missing", async () => {
    const res = await request(app).get("/api/search?type=posts")
    expect(res.status).toBe(400)
  })

  it("should return 400 when q is shorter than 2 characters", async () => {
    const res = await request(app).get("/api/search?q=a&type=posts")
    expect(res.status).toBe(400)
  })

  it("should return 400 when type is invalid", async () => {
    const res = await request(app).get("/api/search?q=test&type=invalid")
    expect(res.status).toBe(400)
  })

  it("should return 200 with matching published posts", async () => {
    await createPost(accessToken, { title: "Learning TypeScript Basics" })

    const res = await request(app).get("/api/search?q=TypeScript&type=posts")
    expect(res.status).toBe(200)
    expect(res.body.results).toHaveLength(1)
    expect(res.body.results[0].title).toBe("Learning TypeScript Basics")
    expect(res.body).toHaveProperty("hasMore")
  })

  it("should not return draft posts in search results", async () => {
    await createPost(accessToken, { title: "Draft TypeScript Post", status: "draft" })

    const res = await request(app).get("/api/search?q=TypeScript&type=posts")
    expect(res.status).toBe(200)
    expect(res.body.results).toHaveLength(0)
  })

  it("should default to posts type when type is omitted", async () => {
    await createPost(accessToken, { title: "Searchable Post Here" })

    const res = await request(app).get("/api/search?q=Searchable")
    expect(res.status).toBe(200)
    expect(res.body.results).toHaveLength(1)
    expect(res.body.results[0].title).toBe("Searchable Post Here")
  })

  it("should return matching users by username", async () => {
    const res = await request(app).get("/api/search?q=john&type=users")
    expect(res.status).toBe(200)
    expect(res.body.results).toHaveLength(1)
    expect(res.body.results[0].username).toBe("john")
  })

  it("should return matching users by name", async () => {
    const res = await request(app).get("/api/search?q=John Doe&type=users")
    expect(res.status).toBe(200)
    expect(res.body.results).toHaveLength(1)
    expect(res.body.results[0].name).toBe("John Doe")
  })

  it("should return matching tags with postCount > 0", async () => {
    await Tag.create({ name: "typescript", slug: "typescript", postCount: 5 })
    await Tag.create({ name: "javascript", slug: "javascript", postCount: 0 })

    const res = await request(app).get("/api/search?q=script&type=tags")
    expect(res.status).toBe(200)
    expect(res.body.results).toHaveLength(1)
    expect(res.body.results[0].name).toBe("typescript")
  })

  it("should respect limit param and return correct hasMore flag", async () => {
    await createPost(accessToken, { title: "Alpha Post" })
    await createPost(accessToken, { title: "Alpha Guide" })
    await createPost(accessToken, { title: "Alpha Tutorial" })

    const res = await request(app).get("/api/search?q=Alpha&type=posts&limit=2")
    expect(res.status).toBe(200)
    expect(res.body.results).toHaveLength(2)
    expect(res.body.hasMore).toBe(true)
  })

  it("should return empty array when no matches found", async () => {
    const res = await request(app).get("/api/search?q=nonexistent&type=posts")
    expect(res.status).toBe(200)
    expect(res.body.results).toHaveLength(0)
    expect(res.body.hasMore).toBe(false)
  })
})
