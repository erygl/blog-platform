import { afterEach, beforeEach, vi, describe, it, expect } from "vitest"
import { app, request, cleanDb, registerUser, loginUser, registerSecondUser } from "../../helpers/auth.helper.js"
import { blockUser } from "../../helpers/block.helper.js"
import User from "../../../src/models/User.js"
import Block from "../../../src/models/Block.js"

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

describe("GET /api/blocks", () => {
  it("should return 401 if no auth token", async () => {
    const res = await request(app).get("/api/blocks")

    expect(res.status).toBe(401)
  })

  it("should return empty list when no users are blocked", async () => {
    const res = await request(app)
      .get("/api/blocks")
      .set("Authorization", `Bearer ${accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.users).toHaveLength(0)
    expect(res.body.hasMore).toBe(false)
  })

  it("should return blocked users", async () => {
    await registerSecondUser()
    await blockUser(accessToken, "jane")

    const res = await request(app)
      .get("/api/blocks")
      .set("Authorization", `Bearer ${accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.users).toHaveLength(1)
    expect(res.body.users[0].username).toBe("jane")
    expect(res.body.hasMore).toBe(false)
  })

  it("should respect limit and return hasMore with nextCursor", async () => {
    const john = await User.findOne({ username: "john" }).lean()
    const extraUsers = await User.insertMany([
      { username: "user1", name: "User One", email: "user1@example.com", password: "x", isVerified: true },
      { username: "user2", name: "User Two", email: "user2@example.com", password: "x", isVerified: true },
      { username: "user3", name: "User Three", email: "user3@example.com", password: "x", isVerified: true },
    ])
    await Block.insertMany(extraUsers.map(u => ({ blocker: john!._id, blocked: u._id })))

    const page1 = await request(app)
      .get("/api/blocks?limit=2")
      .set("Authorization", `Bearer ${accessToken}`)

    expect(page1.status).toBe(200)
    expect(page1.body.users).toHaveLength(2)
    expect(page1.body.hasMore).toBe(true)
    expect(page1.body.nextCursor).toBeDefined()

    const page2 = await request(app)
      .get(`/api/blocks?limit=2&cursor=${page1.body.nextCursor}`)
      .set("Authorization", `Bearer ${accessToken}`)

    expect(page2.status).toBe(200)
    expect(page2.body.users).toHaveLength(1)
    expect(page2.body.hasMore).toBe(false)
  })
})
