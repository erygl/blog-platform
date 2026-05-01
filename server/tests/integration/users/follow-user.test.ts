import { afterEach, beforeEach, vi, describe, it, expect } from "vitest"
import { app, request, cleanDb, registerUser, loginUser, registerSecondUser } from "../../helpers/auth.helper.js"
import User from "../../../src/models/User.js"

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

describe("POST /api/users/:username/follow", () => {
  it("should return 200 and increment follower/following counts", async () => {
    const res = await request(app)
      .post("/api/users/jane/follow")
      .set("Authorization", `Bearer ${accessToken}`)

    expect(res.status).toBe(200)

    const jane = await User.findOne({ username: "jane" })
    const john = await User.findOne({ username: "john" })
    expect(jane!.followersCount).toBe(1)
    expect(john!.followingCount).toBe(1)
  })

  it("should return 409 if already following", async () => {
    await request(app)
      .post("/api/users/jane/follow")
      .set("Authorization", `Bearer ${accessToken}`)

    const res = await request(app)
      .post("/api/users/jane/follow")
      .set("Authorization", `Bearer ${accessToken}`)

    expect(res.status).toBe(409)
  })

  it("should return 400 if trying to follow yourself", async () => {
    const res = await request(app)
      .post("/api/users/john/follow")
      .set("Authorization", `Bearer ${accessToken}`)

    expect(res.status).toBe(400)
  })

  it("should return 404 if user not found", async () => {
    const res = await request(app)
      .post("/api/users/nonexistent/follow")
      .set("Authorization", `Bearer ${accessToken}`)

    expect(res.status).toBe(404)
  })

  it("should return 401 if no auth token", async () => {
    const res = await request(app).post("/api/users/jane/follow")
    expect(res.status).toBe(401)
  })
})
