import { afterEach, beforeEach, vi, describe, it, expect } from "vitest"
import { app, request, cleanDb, registerUser, loginUser } from "../../helpers/auth.helper.js"

vi.mock("../../../src/utils/email.js", async (importOriginal) => ({
  ...await importOriginal(),
  sendEmail: vi.fn().mockResolvedValue(undefined)
}))

beforeEach(async () => {
  await registerUser()
  await loginUser()
})

afterEach(async () => {
  vi.clearAllMocks()
  await cleanDb()
})

describe("GET /api/users/:username", () => {
  it("should return 200 with public profile", async () => {
    const res = await request(app).get("/api/users/john")

    expect(res.status).toBe(200)
    expect(res.body.user.username).toBe("john")
    expect(res.body.user.followersCount).toBe(0)
    expect(res.body.user.followingCount).toBe(0)
    expect(res.body.user.totalPosts).toBe(0)
  })

  it("should not expose sensitive fields", async () => {
    const res = await request(app).get("/api/users/john")

    expect(res.status).toBe(200)
    expect(res.body.user.email).toBeUndefined()
    expect(res.body.user.password).toBeUndefined()
    expect(res.body.user.refreshToken).toBeUndefined()
  })

  it("should return 404 if user not found", async () => {
    const res = await request(app).get("/api/users/nonexistent")
    expect(res.status).toBe(404)
  })
})
