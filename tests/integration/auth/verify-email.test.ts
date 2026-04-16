import { afterEach, vi, describe, it, expect } from "vitest"
import { app, request, cleanDb, registerUser } from "../../helpers/auth.helper.js"

let capturedToken: string

vi.mock("../../../src/utils/email.js", () => ({
  sendVerificationEmail: vi.fn().mockImplementation((_email, token) => {
    capturedToken = token
    return Promise.resolve()
  })
}))

afterEach(async () => {
  vi.clearAllMocks()
  await cleanDb()
})

describe("GET api/auth/verify-email", () => {
  it("should verify email successfully", async () => {
    await registerUser(false)
    const res = await request(app)
      .get(`/api/auth/verify-email?token=${capturedToken}`)
    expect(res.status).toBe(200)
  })

  it("should return 400, if token is missing", async () => {
    const res = await request(app)
      .get(`/api/auth/verify-email`)
    expect(res.status).toBe(400)
  })

  it("should return 400, if user already verified", async () => {
    await registerUser(false)
    await request(app)
      .get(`/api/auth/verify-email?token=${capturedToken}`)
    const res = await request(app)
      .get(`/api/auth/verify-email?token=${capturedToken}`)
    expect(res.status).toBe(400)
  })
})