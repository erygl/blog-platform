import { vi, describe, it, expect, beforeEach, afterEach } from "vitest"
import {
  app,
  request,
  registerUser,
  loginUser,
  registerSecondUser,
  cleanDb
} from "../../helpers/auth.helper.js"
import { createNotification } from "../../helpers/notification.helper.js"
import User from "../../../src/models/User.js"

vi.mock("../../../src/utils/email.js", () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined)
}))

let johnToken: string
let johnId: string
let janeId: string

beforeEach(async () => {
  await registerUser()
  johnToken = (await loginUser()).accessToken
  await registerSecondUser()

  const john = await User.findOne({ email: "john@example.com" }).lean()
  const jane = await User.findOne({ email: "jane@example.com" }).lean()
  johnId = john!._id.toString()
  janeId = jane!._id.toString()
})

afterEach(async () => {
  vi.clearAllMocks()
  await cleanDb()
})

describe("GET /api/notifications/unread-count", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/notifications/unread-count")
    expect(res.status).toBe(401)
  })

  it("returns count: 0 when user has no notifications", async () => {
    const res = await request(app)
      .get("/api/notifications/unread-count")
      .set("Authorization", `Bearer ${johnToken}`)
    expect(res.status).toBe(200)
    expect(res.body.count).toBe(0)
  })

  it("returns the correct count of unread notifications", async () => {
    await createNotification(johnId, janeId, "follow")
    await createNotification(johnId, janeId, "post_like")
    await createNotification(johnId, janeId, "follow", { read: true })

    const res = await request(app)
      .get("/api/notifications/unread-count")
      .set("Authorization", `Bearer ${johnToken}`)
    expect(res.body.count).toBe(2)
  })

  it("does not count another user's notifications", async () => {
    await createNotification(janeId, johnId, "follow")

    const res = await request(app)
      .get("/api/notifications/unread-count")
      .set("Authorization", `Bearer ${johnToken}`)
    expect(res.body.count).toBe(0)
  })
})
