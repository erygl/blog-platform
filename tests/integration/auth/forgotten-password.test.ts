import { afterEach, vi, describe, it, expect } from "vitest"
import { app, request, cleanDb, registerUser } from "../../helpers/auth.helper.js"
import User from "../../../src/models/User.js"
import * as emailUtils from "../../../src/utils/email.js"

vi.mock("../../../src/utils/email.js", () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  sendResetEmail: vi.fn().mockResolvedValue(undefined)
}))

afterEach(async () => {
  vi.clearAllMocks()
  await cleanDb()
})

describe("POST api/auth/forgotten-password", () => {
  it("should set reset token in DB and call sendResetEmail", async () => {
    await registerUser()

    await request(app)
      .post("/api/auth/forgotten-password")
      .send({ email: "john@example.com" })

    const user = await User.findOne({ email: "john@example.com" })
      .select("+passwordResetToken +passwordResetTokenExpiry")

    expect(user?.passwordResetToken).toBeTruthy()
    expect(user?.passwordResetTokenExpiry).toBeTruthy()
    expect(emailUtils.sendResetEmail).toHaveBeenCalledWith("john@example.com", expect.any(String))
  })

  it("should return 200 even if email does not exist", async () => {
    const res = await request(app)
      .post("/api/auth/forgotten-password")
      .send({ email: "nonexistent@example.com" })

    expect(res.status).toBe(200)
    expect(emailUtils.sendResetEmail).not.toHaveBeenCalled()
  })

  it("should return 400 if email is invalid", async () => {
    const res = await request(app)
      .post("/api/auth/forgotten-password")
      .send({ email: "notanemail" })
    expect(res.status).toBe(400)
  })
})
