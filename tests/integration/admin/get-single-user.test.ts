import { afterEach, beforeEach, vi, describe, it, expect } from "vitest"
import { app, request, cleanDb, registerUser } from "../../helpers/auth.helper.js"
import { registerAdmin, loginAdmin } from "../../helpers/admin.helper.js"
import User from "../../../src/models/User.js"

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

describe("GET /api/admin/users/:userId", () => {
  it("should return user with publishedPostCount and draftPostCount", async () => {
    await registerUser()
    const user = await User.findOne({ email: "john@example.com" })
    const res = await request(app)
      .get(`/api/admin/users/${user!._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.user).toHaveProperty("publishedPostCount")
    expect(res.body.user).toHaveProperty("draftPostCount")
    expect(typeof res.body.user.publishedPostCount).toBe("number")
    expect(typeof res.body.user.draftPostCount).toBe("number")
  })

  it("should return 401 if no auth token", async () => {
    await registerUser()
    const user = await User.findOne({ email: "john@example.com" })
    const res = await request(app).get(`/api/admin/users/${user!._id}`)
    expect(res.status).toBe(401)
  })

  it("should return 404 if user not found", async () => {
    const res = await request(app)
      .get("/api/admin/users/000000000000000000000001")
      .set("Authorization", `Bearer ${adminToken}`)
    expect(res.status).toBe(404)
  })

  it("should return 400 if userId is invalid format", async () => {
    const res = await request(app)
      .get("/api/admin/users/invalid-id")
      .set("Authorization", `Bearer ${adminToken}`)
    expect(res.status).toBe(400)
  })
})
