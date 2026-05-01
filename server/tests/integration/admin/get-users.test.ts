import { afterEach, beforeEach, vi, describe, it, expect } from "vitest"
import { app, request, cleanDb, registerUser } from "../../helpers/auth.helper.js"
import { registerAdmin, loginAdmin } from "../../helpers/admin.helper.js"
import User from "../../../src/models/User.js"

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

describe("GET /api/admin/users", () => {
  it("should return users array and hasMore", async () => {
    await registerUser()
    const res = await request(app)
      .get("/api/admin/users")
      .set("Authorization", `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty("users")
    expect(res.body).toHaveProperty("hasMore")
    expect(Array.isArray(res.body.users)).toBe(true)
  })

  it("should return 401 if no auth token", async () => {
    const res = await request(app).get("/api/admin/users")
    expect(res.status).toBe(401)
  })

  it("should return 404 if user is not admin", async () => {
    await registerUser()
    const loginRes = await request(app).post("/api/auth/login").send({
      email: "john@example.com",
      password: "Password1"
    })
    const res = await request(app)
      .get("/api/admin/users")
      .set("Authorization", `Bearer ${loginRes.body.accessToken}`)
    expect(res.status).toBe(404)
  })

  it("should filter by isVerified and exclude non-matching users", async () => {
    await registerUser(false)
    await User.findOneAndUpdate({ email: "admin@example.com" }, { isVerified: true })
    const res = await request(app)
      .get("/api/admin/users?isVerified=false")
      .set("Authorization", `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.users).toHaveLength(1)
    expect(res.body.users[0].username).toBe("john")
  })

  it("should filter by isBanned", async () => {
    const res = await request(app)
      .get("/api/admin/users?isBanned=false")
      .set("Authorization", `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.users)).toBe(true)
  })

  it("should filter by role", async () => {
    const res = await request(app)
      .get("/api/admin/users?role=admin")
      .set("Authorization", `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.users.length).toBeGreaterThanOrEqual(1)
  })

  it("should search by username or name with q", async () => {
    await registerUser()
    const res = await request(app)
      .get("/api/admin/users?q=john")
      .set("Authorization", `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.users.length).toBeGreaterThanOrEqual(1)
  })

  it("should respect limit and return hasMore true when more exist", async () => {
    for (let i = 0; i < 3; i++) {
      await request(app).post("/api/auth/register").send({
        username: `user${i}`,
        name: `User ${i}`,
        email: `user${i}@example.com`,
        password: "Password1"
      })
    }
    const res = await request(app)
      .get("/api/admin/users?limit=2&page=1")
      .set("Authorization", `Bearer ${adminToken}`)
    expect(res.status).toBe(200)
    expect(res.body.users).toHaveLength(2)
    expect(res.body.hasMore).toBe(true)
  })
})
