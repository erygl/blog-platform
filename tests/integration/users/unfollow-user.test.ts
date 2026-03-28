import { afterEach, beforeEach, vi, describe, it, expect } from "vitest"
import { app, request, cleanDb, registerUser, loginUser } from "../../helpers/auth.helper.js"
import User from "../../../src/models/User.js"

vi.mock("../../../src/utils/email.js", () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined)
}))

let accessToken: string

beforeEach(async () => {
  await registerUser()
  const res = await loginUser()
  accessToken = res.accessToken

  await request(app).post("/api/auth/register").send({
    username: "jane",
    email: "jane@example.com",
    password: "Password1"
  })
})

afterEach(async () => {
  vi.clearAllMocks()
  await cleanDb()
})

describe("DELETE /api/users/:username/follow", () => {
  it("should return 200 and decrement follower/following counts", async () => {
    await request(app)
      .post("/api/users/jane/follow")
      .set("Authorization", `Bearer ${accessToken}`)

    const res = await request(app)
      .delete("/api/users/jane/follow")
      .set("Authorization", `Bearer ${accessToken}`)

    expect(res.status).toBe(200)

    const jane = await User.findOne({ username: "jane" })
    const john = await User.findOne({ username: "john" })
    expect(jane!.followersCount).toBe(0)
    expect(john!.followingCount).toBe(0)
  })

  it("should return 400 if not following the user", async () => {
    const res = await request(app)
      .delete("/api/users/jane/follow")
      .set("Authorization", `Bearer ${accessToken}`)

    expect(res.status).toBe(400)
  })

  it("should return 400 if trying to unfollow yourself", async () => {
    const res = await request(app)
      .delete("/api/users/john/follow")
      .set("Authorization", `Bearer ${accessToken}`)

    expect(res.status).toBe(400)
  })

  it("should return 404 if user not found", async () => {
    const res = await request(app)
      .delete("/api/users/nonexistent/follow")
      .set("Authorization", `Bearer ${accessToken}`)

    expect(res.status).toBe(404)
  })

  it("should return 401 if no auth token", async () => {
    const res = await request(app).delete("/api/users/jane/follow")
    expect(res.status).toBe(401)
  })
})
