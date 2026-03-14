import { afterEach, vi, describe, it, expect } from "vitest"
import { app, request, cleanDb, registerUser } from "../../helpers/auth.helper.js"
import User from "../../../src/models/User.js"

let capturedResetToken: string

vi.mock("../../../src/utils/email.js", () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  sendResetEmail: vi.fn().mockImplementation((_email: string, token: string) => {
    capturedResetToken = token
    return Promise.resolve()
  })
}))

afterEach(async () => {
  vi.clearAllMocks()
  await cleanDb()
})

describe("POST api/auth/reset-password", () => {
  it("should reset password and clear reset token from DB", async () => {
    await registerUser()
    await request(app)
      .post("/api/auth/forgotten-password")
      .send({ email: "john@example.com" })

    await request(app)
      .post(`/api/auth/reset-password?token=${capturedResetToken}`)
      .send({ password: "NewPassword1" })

    const user = await User.findOne({ email: "john@example.com" })
      .select("+passwordResetToken +passwordResetTokenExpiry")

    expect(user?.passwordResetToken).toBeNull()
    expect(user?.passwordResetTokenExpiry).toBeNull()
  })

  it("should allow login with new password after reset", async () => {
    await registerUser()
    await request(app)
      .post("/api/auth/forgotten-password")
      .send({ email: "john@example.com" })

    await request(app)
      .post(`/api/auth/reset-password?token=${capturedResetToken}`)
      .send({ password: "NewPassword1" })

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "john@example.com", password: "NewPassword1" })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty("accessToken")
  })

  it("should return 400 if token is missing", async () => {
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ password: "NewPassword1" })
    expect(res.status).toBe(400)
  })

  it("should return 400 if token is invalid", async () => {
    const res = await request(app)
      .post("/api/auth/reset-password?token=invalidtoken")
      .send({ password: "NewPassword1" })
    expect(res.status).toBe(400)
  })

  it("should return 400 if password does not meet requirements", async () => {
    await registerUser()
    await request(app)
      .post("/api/auth/forgotten-password")
      .send({ email: "john@example.com" })

    const res = await request(app)
      .post(`/api/auth/reset-password?token=${capturedResetToken}`)
      .send({ password: "weak" })
    expect(res.status).toBe(400)
  })

  it("should not allow reusing the same reset token twice", async () => {
    await registerUser()
    await request(app)
      .post("/api/auth/forgotten-password")
      .send({ email: "john@example.com" })

    await request(app)
      .post(`/api/auth/reset-password?token=${capturedResetToken}`)
      .send({ password: "NewPassword1" })

    const res = await request(app)
      .post(`/api/auth/reset-password?token=${capturedResetToken}`)
      .send({ password: "AnotherPassword1" })

    expect(res.status).toBe(400)
  })
})
