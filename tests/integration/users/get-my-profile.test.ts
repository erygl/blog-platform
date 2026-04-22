import { afterEach, beforeEach, vi, describe, it, expect } from "vitest"
import { app, request, cleanDb, registerUser, loginUser } from "../../helpers/auth.helper.js"

vi.mock("../../../src/utils/email.js", async (importOriginal) => ({
  ...await importOriginal(),
  sendEmail: vi.fn().mockResolvedValue(undefined)
}))

let accessToken: string

beforeEach(async () => {
  await registerUser()
  const res = await loginUser()
  accessToken = res.accessToken
})

afterEach(async () => {
  vi.clearAllMocks()
  await cleanDb()
})

describe("GET /api/users/me", () => {
  it("should return 200 with user profile", async () => {
    const res = await request(app)
      .get("/api/users/me")
      .set("Authorization", `Bearer ${accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.user.username).toBe("john")
    expect(res.body.user.email).toBe("john@example.com")
    expect(res.body.user.totalPosts).toBe(0)
  })

  it("should not expose sensitive fields", async () => {
    const res = await request(app)
      .get("/api/users/me")
      .set("Authorization", `Bearer ${accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.user.password).toBeUndefined()
    expect(res.body.user.refreshToken).toBeUndefined()
    expect(res.body.user.passwordResetToken).toBeUndefined()
  })

  it("should return 401 if no auth token", async () => {
    const res = await request(app).get("/api/users/me")
    expect(res.status).toBe(401)
  })
})
