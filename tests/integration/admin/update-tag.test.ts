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

describe("PATCH /api/admin/tags/:tagId", () => {
  it("should update tag name and slug", async () => {
    const tag = await Tag.create({ name: "JavaScript", slug: "javascript" })
    const res = await request(app)
      .patch(`/api/admin/tags/${tag._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Node JS" })
    expect(res.status).toBe(200)
    expect(res.body.tag.name).toBe("Node JS")
    expect(res.body.tag.slug).toBe("node-js")
  })

  it("should return 409 if new name conflicts with an existing tag", async () => {
    await Tag.create({ name: "JavaScript", slug: "javascript" })
    const tag = await Tag.create({ name: "TypeScript", slug: "typescript" })
    const res = await request(app)
      .patch(`/api/admin/tags/${tag._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "JavaScript" })
    expect(res.status).toBe(409)
  })

  it("should return 400 if name is missing", async () => {
    const tag = await Tag.create({ name: "JavaScript", slug: "javascript" })
    const res = await request(app)
      .patch(`/api/admin/tags/${tag._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({})
    expect(res.status).toBe(400)
  })

  it("should return 400 if name is empty string", async () => {
    const tag = await Tag.create({ name: "JavaScript", slug: "javascript" })
    const res = await request(app)
      .patch(`/api/admin/tags/${tag._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "" })
    expect(res.status).toBe(400)
  })

  it("should return 404 if tag not found", async () => {
    const res = await request(app)
      .patch("/api/admin/tags/000000000000000000000001")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "New Name" })
    expect(res.status).toBe(404)
  })

  it("should return 401 if no auth token", async () => {
    const tag = await Tag.create({ name: "JavaScript", slug: "javascript" })
    const res = await request(app)
      .patch(`/api/admin/tags/${tag._id}`)
      .send({ name: "New Name" })
    expect(res.status).toBe(401)
  })
})
