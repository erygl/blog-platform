import { afterEach, beforeEach, vi, describe, it, expect } from "vitest"
import { app, request, cleanDb, registerUser, loginUser } from "../../helpers/auth.helper.js"

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

describe("GET /api/users/:username/followers", () => {
  it("should return 200 with followers list", async () => {
    await request(app)
      .post("/api/users/jane/follow")
      .set("Authorization", `Bearer ${accessToken}`)

    const res = await request(app)
      .get("/api/users/jane/followers")
      .set("Authorization", `Bearer ${accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.followers).toHaveLength(1)
    expect(res.body.followers[0].username).toBe("john")
    expect(res.body.hasMore).toBe(false)
  })

  it("should return empty array when no followers", async () => {
    const res = await request(app)
      .get("/api/users/jane/followers")
      .set("Authorization", `Bearer ${accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.followers).toHaveLength(0)
    expect(res.body.hasMore).toBe(false)
  })

  it("should respect limit and return hasMore", async () => {
    for (const user of [
      { username: "user1", email: "user1@example.com" },
      { username: "user2", email: "user2@example.com" },
      { username: "user3", email: "user3@example.com" },
    ]) {
      const reg = await request(app).post("/api/auth/register").send({ ...user, password: "Password1" })
      const login = await request(app).post("/api/auth/login").send({ email: user.email, password: "Password1" })
      await request(app)
        .post("/api/users/jane/follow")
        .set("Authorization", `Bearer ${login.body.accessToken}`)
    }

    const res = await request(app)
      .get("/api/users/jane/followers?limit=2")
      .set("Authorization", `Bearer ${accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.followers).toHaveLength(2)
    expect(res.body.hasMore).toBe(true)
  })

  it("should return 404 if user not found", async () => {
    const res = await request(app)
      .get("/api/users/nonexistent/followers")
      .set("Authorization", `Bearer ${accessToken}`)

    expect(res.status).toBe(404)
  })

  it("should return 401 if no auth token", async () => {
    const res = await request(app).get("/api/users/jane/followers")
    expect(res.status).toBe(401)
  })
})
