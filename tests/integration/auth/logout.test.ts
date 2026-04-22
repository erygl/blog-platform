import { beforeEach, afterEach, vi, describe, it, expect } from "vitest"
import { app, request, cleanDb, registerUser, loginUser } from "../../helpers/auth.helper.js"

vi.mock("../../../src/utils/email.js", async (importOriginal) => ({
  ...await importOriginal(),
  sendEmail: vi.fn().mockResolvedValue(undefined)
}))

afterEach(async () => {
  vi.clearAllMocks()
  await cleanDb()
})

describe("POST api/auth/logout", () => {
  let accessToken: string

  beforeEach(async () => {
    await registerUser()
    accessToken = (await loginUser()).accessToken
  })

  it("should logout successfully", async () => {
    const res = await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${accessToken}`)
    expect(res.status).toBe(200)
  })

  it("should return 401 if no token provided", async () => {
    const res = await request(app)
      .post("/api/auth/logout")
    expect(res.status).toBe(401)
  })

  it("should return 401 if token is invalid", async () => {
    const res = await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer invalidToken`)
    expect(res.status).toBe(401)
  })
})