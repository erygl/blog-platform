import { afterEach, vi, describe, it, expect } from "vitest"
import { app, request, cleanDb, registerUser, loginUser } from "../../helpers/auth.helper.js"
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

describe("PATCH api/users/me/password", () => {
  it("should return 200 with valid old and new password and allow login with new password", async () => {
    await registerUser()
    const { accessToken } = await loginUser()
    const res = await request(app)
      .patch("/api/users/me/password")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ oldPassword: "Password1", newPassword: "NewPassword1" })
    expect(res.status).toBe(200)

    const user = await User.findOne({ email: "john@example.com" }).select("+refreshToken")
    expect(user!.refreshToken).toBeNull()
    expect(emailUtils.sendEmail).toHaveBeenLastCalledWith("john@example.com", expect.any(Object))

    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "john@example.com", password: "NewPassword1" })
    expect(loginRes.status).toBe(200)
  })

  it("should return 401 if wrong old password and not change password", async () => {
    await registerUser()
    const { accessToken } = await loginUser()
    const res = await request(app)
      .patch("/api/users/me/password")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ oldPassword: "WrongPass1", newPassword: "NewPassword1" })
    expect(res.status).toBe(401)

    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "john@example.com", password: "Password1" })
    expect(loginRes.status).toBe(200)
  })

  it("should return 400 if new password is same as old", async () => {
    await registerUser()
    const { accessToken } = await loginUser()
    const res = await request(app)
      .patch("/api/users/me/password")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ oldPassword: "Password1", newPassword: "Password1" })
    expect(res.status).toBe(400)
  })

  it("should return 400 if new password fails validation", async () => {
    await registerUser()
    const { accessToken } = await loginUser()
    const res = await request(app)
      .patch("/api/users/me/password")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ oldPassword: "Password1", newPassword: "weak" })
    expect(res.status).toBe(400)
  })

  it("should return 401 if no auth token", async () => {
    const res = await request(app)
      .patch("/api/users/me/password")
      .send({ oldPassword: "Password1", newPassword: "NewPassword1" })
    expect(res.status).toBe(401)
  })
})
