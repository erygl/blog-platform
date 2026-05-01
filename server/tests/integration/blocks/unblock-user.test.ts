import { afterEach, beforeEach, vi, describe, it, expect } from "vitest"
import { app, request, cleanDb, registerUser, loginUser, registerSecondUser } from "../../helpers/auth.helper.js"
import { blockUser } from "../../helpers/block.helper.js"

vi.mock("../../../src/utils/email.js", async (importOriginal) => ({
  ...await importOriginal(),
  sendEmail: vi.fn().mockResolvedValue(undefined)
}))

let accessToken: string

beforeEach(async () => {
  await registerUser()
  const res = await loginUser()
  accessToken = res.accessToken
  await registerSecondUser()
})

afterEach(async () => {
  vi.clearAllMocks()
  await cleanDb()
})

describe("DELETE /api/blocks/:username", () => {
  it("should unblock a user successfully", async () => {
    await blockUser(accessToken, "jane")

    const res = await request(app)
      .delete("/api/blocks/jane")
      .set("Authorization", `Bearer ${accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.message).toContain("unblocked")
  })

  it("should return 401 if no auth token", async () => {
    const res = await request(app).delete("/api/blocks/jane")

    expect(res.status).toBe(401)
  })

  it("should return 404 if target user does not exist", async () => {
    const res = await request(app)
      .delete("/api/blocks/nonexistent")
      .set("Authorization", `Bearer ${accessToken}`)

    expect(res.status).toBe(404)
  })

  it("should return 404 if block relationship does not exist", async () => {
    const res = await request(app)
      .delete("/api/blocks/jane")
      .set("Authorization", `Bearer ${accessToken}`)

    expect(res.status).toBe(404)
  })
})
