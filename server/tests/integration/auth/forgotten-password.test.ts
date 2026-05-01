import { afterEach, vi, describe, it, expect } from "vitest"
import { app, request, cleanDb, registerUser } from "../../helpers/auth.helper.js"
import User from "../../../src/models/User.js"
import * as emailUtils from "../../../src/utils/email.js"

vi.mock("../../../src/utils/email.js", async (importOriginal) => ({
  ...await importOriginal(),
  sendEmail: vi.fn().mockResolvedValue(undefined)
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
    expect(emailUtils.sendEmail).toHaveBeenLastCalledWith("john@example.com", expect.any(Object))
  })

  it("should return 200 even if email does not exist", async () => {
    const res = await request(app)
      .post("/api/auth/forgotten-password")
      .send({ email: "nonexistent@example.com" })

    expect(res.status).toBe(200)
    expect(emailUtils.sendEmail).not.toHaveBeenCalled()
  })

  it("should return 400 if email is invalid", async () => {
    const res = await request(app)
      .post("/api/auth/forgotten-password")
      .send({ email: "notanemail" })
    expect(res.status).toBe(400)
  })
})
