import { afterEach, vi, describe, it, expect } from "vitest"
import { app, request, cleanDb, registerUser, loginUser } from "../../helpers/auth.helper.js"

vi.mock("../../../src/utils/email.js", async (importOriginal) => ({
  ...await importOriginal(),
  sendEmail: vi.fn().mockResolvedValue(undefined)
}))

afterEach(async () => {
  vi.clearAllMocks()
  await cleanDb()
})

describe("POST api/auth/refresh", () => {
  it("should return a new access token", async () => {
    await registerUser()
    const { refreshToken } = await loginUser()
    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", refreshToken)
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty("accessToken")
  })

  it("should return 401 if refresh token cookie is missing", async () => {
    const res = await request(app)
      .post("/api/auth/refresh")
    expect(res.status).toBe(401)
  })

  it("should return 401 if refresh token is invalid", async () => {
    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", "refreshToken=invalidtoken")
    expect(res.status).toBe(401)
  })

  it("should return 401 after logout", async () => {
    await registerUser()
    const { accessToken, refreshToken } = await loginUser()
    await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${accessToken}`)
    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", refreshToken)
    expect(res.status).toBe(401)
  })
})
