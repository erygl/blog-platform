import { afterEach, beforeEach, vi, describe, it, expect } from "vitest"
import { app, request, cleanDb, registerUser, loginUser } from "../../helpers/auth.helper.js"
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

describe("PATCH /api/admin/users/:userId", () => {
  it("should ban user and clear refreshToken", async () => {
    await registerUser()
    await loginUser()
    const user = await User.findOne({ email: "john@example.com" })
    const res = await request(app)
      .patch(`/api/admin/users/${user!._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ isBanned: true })
    expect(res.status).toBe(200)
    const updated = await User.findById(user!._id).select("+refreshToken")
    expect(updated!.isBanned).toBe(true)
    expect(updated!.refreshToken).toBeNull()
  })

  it("should force-verify user", async () => {
    await registerUser()
    const user = await User.findOne({ email: "john@example.com" })
    const res = await request(app)
      .patch(`/api/admin/users/${user!._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ isVerified: true })
    expect(res.status).toBe(200)
    const updated = await User.findById(user!._id)
    expect(updated!.isVerified).toBe(true)
  })

  it("should promote user to admin", async () => {
    await registerUser()
    const user = await User.findOne({ email: "john@example.com" })
    const res = await request(app)
      .patch(`/api/admin/users/${user!._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ role: "admin" })
    expect(res.status).toBe(200)
    const updated = await User.findById(user!._id)
    expect(updated!.role).toBe("admin")
  })

  it("should reset avatar to null and clear it in DB", async () => {
    await registerUser()
    const user = await User.findOneAndUpdate(
      { email: "john@example.com" },
      { avatar: "https://example.com/avatar.jpg" },
      { returnDocument: "after" }
    )
    expect(user!.avatar).toBe("https://example.com/avatar.jpg")

    const res = await request(app)
      .patch(`/api/admin/users/${user!._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ avatar: null })
    expect(res.status).toBe(200)

    const updated = await User.findById(user!._id)
    expect(updated!.avatar).toBeNull()
  })

  it("should return 400 if body is empty", async () => {
    await registerUser()
    const user = await User.findOne({ email: "john@example.com" })
    const res = await request(app)
      .patch(`/api/admin/users/${user!._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({})
    expect(res.status).toBe(400)
  })

  it("should return 401 if no auth token", async () => {
    await registerUser()
    const user = await User.findOne({ email: "john@example.com" })
    const res = await request(app)
      .patch(`/api/admin/users/${user!._id}`)
      .send({ isBanned: true })
    expect(res.status).toBe(401)
  })

  it("should return 404 if user not found", async () => {
    const res = await request(app)
      .patch("/api/admin/users/000000000000000000000001")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ isBanned: true })
    expect(res.status).toBe(404)
  })
})
