import { afterEach, vi, describe, it, expect } from "vitest"
import { app, request, cleanDb, registerUser, loginUser } from "../../helpers/auth.helper.js"
import * as emailUtils from "../../../src/utils/email.js"
import User from "../../../src/models/User.js"

vi.mock("../../../src/utils/email.js", async (importOriginal) => ({
  ...await importOriginal(),
  sendEmail: vi.fn().mockResolvedValue(undefined)
}))

afterEach(async () => {
  vi.clearAllMocks()
  await cleanDb()
})

describe("PATCH api/users/me/email", () => {
  it("should return 200, update email in db, set isVerified to false and send verification email", async () => {
    await registerUser()
    vi.clearAllMocks()
    const { accessToken } = await loginUser()
    const res = await request(app)
      .patch("/api/users/me/email")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ email: "newemail@example.com", password: "Password1" })
    expect(res.status).toBe(200)

    const user = await User.findOne({ email: "newemail@example.com" })
    expect(user).not.toBeNull()
    expect(user!.isVerified).toBe(false)
    expect(emailUtils.sendEmail).toHaveBeenCalledTimes(2)
  })

  it("should return 400 if new email is same as current", async () => {
    await registerUser()
    const { accessToken } = await loginUser()
    const res = await request(app)
      .patch("/api/users/me/email")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ email: "john@example.com", password: "Password1" })
    expect(res.status).toBe(400)
  })

  it("should return 401 if wrong password", async () => {
    await registerUser()
    const { accessToken } = await loginUser()
    const res = await request(app)
      .patch("/api/users/me/email")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ email: "newemail@example.com", password: "WrongPass1" })
    expect(res.status).toBe(401)
  })

  it("should return 400 if invalid email format", async () => {
    await registerUser()
    const { accessToken } = await loginUser()
    const res = await request(app)
      .patch("/api/users/me/email")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ email: "not-an-email", password: "Password1" })
    expect(res.status).toBe(400)
  })

  it("should return 401 if no auth token", async () => {
    const res = await request(app)
      .patch("/api/users/me/email")
      .send({ email: "newemail@example.com", password: "Password1" })
    expect(res.status).toBe(401)
  })
})
