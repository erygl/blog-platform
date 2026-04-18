import { afterEach, beforeEach, vi, describe, it, expect } from "vitest"
import { app, request, cleanDb, registerUser, loginUser, registerSecondUser } from "../../helpers/auth.helper.js"

vi.mock("../../../src/utils/email.js", () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined)
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

describe("GET /api/users/:username/following", () => {
  it("should return 200 with following list", async () => {
    await request(app)
      .post("/api/users/jane/follow")
      .set("Authorization", `Bearer ${accessToken}`)

    const res = await request(app)
      .get("/api/users/john/following")
      .set("Authorization", `Bearer ${accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.following).toHaveLength(1)
    expect(res.body.following[0].username).toBe("jane")
    expect(res.body.hasMore).toBe(false)
  })

  it("should return empty array when not following anyone", async () => {
    const res = await request(app)
      .get("/api/users/john/following")
      .set("Authorization", `Bearer ${accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.following).toHaveLength(0)
    expect(res.body.hasMore).toBe(false)
  })

  it("should respect limit and return hasMore with nextCursor", async () => {
    for (const user of [
      { username: "user1", name: "User One", email: "user1@example.com" },
      { username: "user2", name: "User Two", email: "user2@example.com" },
      { username: "user3", name: "User Three", email: "user3@example.com" },
    ]) {
      await request(app).post("/api/auth/register").send({ ...user, password: "Password1" })
      await request(app)
        .post(`/api/users/${user.username}/follow`)
        .set("Authorization", `Bearer ${accessToken}`)
    }

    const page1 = await request(app)
      .get("/api/users/john/following?limit=2")
      .set("Authorization", `Bearer ${accessToken}`)

    expect(page1.status).toBe(200)
    expect(page1.body.following).toHaveLength(2)
    expect(page1.body.hasMore).toBe(true)
    expect(page1.body.nextCursor).toBeDefined()

    const page2 = await request(app)
      .get(`/api/users/john/following?limit=2&cursor=${page1.body.nextCursor}`)
      .set("Authorization", `Bearer ${accessToken}`)

    expect(page2.status).toBe(200)
    expect(page2.body.following).toHaveLength(1)
    expect(page2.body.hasMore).toBe(false)
  })

  it("should return 404 if user not found", async () => {
    const res = await request(app)
      .get("/api/users/nonexistent/following")
      .set("Authorization", `Bearer ${accessToken}`)

    expect(res.status).toBe(404)
  })

  it("should return 401 if no auth token", async () => {
    const res = await request(app).get("/api/users/john/following")
    expect(res.status).toBe(401)
  })
})
