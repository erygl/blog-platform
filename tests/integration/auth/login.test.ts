import { afterEach, vi, describe, it, expect } from "vitest"
import { app, request, cleanDb, registerUser } from "../../helpers/auth.helper.js"

vi.mock("../../../src/utils/email.js", () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined)
}))

afterEach(async () => {
  vi.clearAllMocks()
  await cleanDb()
})

describe("POST api/auth/login", () => {
  it("should login and return accessToken", async () => {
    await registerUser()
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: "john@example.com",
        password: "Password1"
      })
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty("accessToken")
  })

  it("should return 401, if credentials wrong", async () => {
    await registerUser()
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: "john@example.com",
        password: "wrongPassword"
      })
    expect(res.status).toBe(401)
  })

  it("should return 401, if email does not exist", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: "nonexistent@example.com",
        password: "wrongPassword"
      })
    expect(res.status).toBe(401)
  })
})