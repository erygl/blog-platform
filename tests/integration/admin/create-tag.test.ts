import { afterEach, beforeEach, vi, describe, it, expect } from "vitest"
import { app, request, cleanDb } from "../../helpers/auth.helper.js"
import { registerAdmin, loginAdmin } from "../../helpers/admin.helper.js"
import Tag from "../../../src/models/Tag.js"

vi.mock("../../../src/utils/email.js", () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined)
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

describe("POST /api/admin/tags", () => {
  it("should create tag and return 201 with tag object", async () => {
    const res = await request(app)
      .post("/api/admin/tags")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "JavaScript" })
    expect(res.status).toBe(201)
    expect(res.body.tag).toHaveProperty("name", "JavaScript")
    expect(res.body.tag).toHaveProperty("slug")
  })

  it("should generate slug from name", async () => {
    const res = await request(app)
      .post("/api/admin/tags")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Node JS" })
    expect(res.status).toBe(201)
    expect(res.body.tag.slug).toBe("node-js")
  })

  it("should return 409 if tag name already exists", async () => {
    await Tag.create({ name: "JavaScript", slug: "javascript" })
    const res = await request(app)
      .post("/api/admin/tags")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "JavaScript" })
    expect(res.status).toBe(409)
  })

  it("should return 400 if name is missing", async () => {
    const res = await request(app)
      .post("/api/admin/tags")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({})
    expect(res.status).toBe(400)
  })

  it("should return 400 if name is empty string", async () => {
    const res = await request(app)
      .post("/api/admin/tags")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "" })
    expect(res.status).toBe(400)
  })

  it("should return 401 if no auth token", async () => {
    const res = await request(app)
      .post("/api/admin/tags")
      .send({ name: "JavaScript" })
    expect(res.status).toBe(401)
  })
})
