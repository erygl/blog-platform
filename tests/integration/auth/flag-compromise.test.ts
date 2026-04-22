import { afterEach, vi, describe, it, expect } from "vitest"
import { app, request, cleanDb, registerUser, loginUser } from "../../helpers/auth.helper.js"
import User from "../../../src/models/User.js"
import * as emailUtils from "../../../src/utils/email.js"

let capturedFlagToken: string

vi.mock("../../../src/utils/email.js", async (importOriginal) => ({
  ...await importOriginal(),
  sendEmail: vi.fn().mockImplementation((_to: string, template: { subject: string, html: string }) => {
    const match = template.html.match(/flag-compromise\?token=([^"]+)/)
    if (match) capturedFlagToken = match[1]
    return Promise.resolve()
  })
}))

afterEach(async () => {
  vi.clearAllMocks()
  await cleanDb()
})

describe("GET api/auth/flag-compromise", () => {
  it("should save reset token, clear session and send reset email", async () => {
    await registerUser()
    const { accessToken } = await loginUser()

    await request(app)
      .patch("/api/users/me/password")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ oldPassword: "Password1", newPassword: "NewPassword1" })

    const res = await request(app)
      .get(`/api/auth/flag-compromise?token=${capturedFlagToken}`)

    expect(res.status).toBe(200)

    const user = await User.findOne({ email: "john@example.com" })
      .select("+passwordResetToken +passwordResetTokenExpiry +refreshToken")

    expect(user?.passwordResetToken).toBeTruthy()
    expect(user?.passwordResetTokenExpiry).toBeTruthy()
    expect(user?.refreshToken).toBeNull()
    expect(emailUtils.sendEmail).toHaveBeenLastCalledWith("john@example.com", expect.any(Object))
  })

  it("should return 400 if token is missing", async () => {
    const res = await request(app).get("/api/auth/flag-compromise")
    expect(res.status).toBe(400)
  })

  it("should return 401 if token is invalid", async () => {
    const res = await request(app).get("/api/auth/flag-compromise?token=invalidtoken")
    expect(res.status).toBe(401)
  })
})
