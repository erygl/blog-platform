import { afterEach, beforeEach, vi, describe, it, expect } from "vitest"
import { app, request, cleanDb } from "../../helpers/auth.helper.js"
import { registerAdmin, loginAdmin } from "../../helpers/admin.helper.js"
import Tag from "../../../src/models/Tag.js"

vi.mock("../../../src/utils/email.js", async (importOriginal) => ({
  ...await importOriginal(),
  sendEmail: vi.fn().mockResolvedValue(undefined)
}))

let adminToken: string

beforeEach(async () => {
  await registerAdmin()
  adminToken = await loginAdmin()
})

afterEach(async () => {
  vi.clearAllMocks()
  await cleanDb()
})

describe("GET /api/admin/tags", () => {
  it("should return tags array and hasMore", async () => {
    await Tag.create({ name: "JavaScript", slug: "javascript" })
    const res = await request(app)
      .get("/api/admin/tags")
      .set("Authorization", `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty("tags")
    expect(res.body).toHaveProperty("hasMore")
    expect(Array.isArray(res.body.tags)).toBe(true)
  })

  it("should return 401 if no auth token", async () => {
    const res = await request(app).get("/api/admin/tags")
    expect(res.status).toBe(401)
  })

  it("should search by q and exclude non-matching tags", async () => {
    await Tag.create({ name: "JavaScript", slug: "javascript" })
    await Tag.create({ name: "TypeScript", slug: "typescript" })
    await Tag.create({ name: "Python", slug: "python" })

    const res = await request(app)
      .get("/api/admin/tags?q=script")
      .set("Authorization", `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.tags).toHaveLength(2)
    res.body.tags.forEach((t: { name: string }) => {
      expect(t.name.toLowerCase()).toContain("script")
    })
  })

  it("should sort by postCount descending", async () => {
    await Tag.create({ name: "Low", slug: "low", postCount: 1 })
    await Tag.create({ name: "High", slug: "high", postCount: 10 })
    await Tag.create({ name: "Mid", slug: "mid", postCount: 5 })

    const res = await request(app)
      .get("/api/admin/tags?sort=postCount&order=desc")
      .set("Authorization", `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.tags[0].name).toBe("High")
    expect(res.body.tags[2].name).toBe("Low")
  })

  it("should sort by postCount ascending", async () => {
    await Tag.create({ name: "Low", slug: "low", postCount: 1 })
    await Tag.create({ name: "High", slug: "high", postCount: 10 })

    const res = await request(app)
      .get("/api/admin/tags?sort=postCount&order=asc")
      .set("Authorization", `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.tags[0].name).toBe("Low")
  })

  it("should respect limit and return hasMore true when more exist", async () => {
    await Tag.create({ name: "Tag1", slug: "tag1" })
    await Tag.create({ name: "Tag2", slug: "tag2" })
    await Tag.create({ name: "Tag3", slug: "tag3" })

    const res = await request(app)
      .get("/api/admin/tags?limit=2&page=1")
      .set("Authorization", `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.tags).toHaveLength(2)
    expect(res.body.hasMore).toBe(true)
  })
})
