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
import Notification from "../../../src/models/Notification.js"
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

describe("PATCH /api/notifications/:notificationId/read", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).patch("/api/notifications/507f1f77bcf86cd799439011/read")
    expect(res.status).toBe(401)
  })

  it("returns 404 for a non-existent notification", async () => {
    const res = await request(app)
      .patch("/api/notifications/507f1f77bcf86cd799439011/read")
      .set("Authorization", `Bearer ${johnToken}`)
    expect(res.status).toBe(404)
  })

  it("returns 404 when the notification belongs to a different user", async () => {
    const n = await createNotification(janeId, johnId, "follow")

    const res = await request(app)
      .patch(`/api/notifications/${n._id}/read`)
      .set("Authorization", `Bearer ${johnToken}`)
    expect(res.status).toBe(404)
  })

  it("returns 204 and marks the notification as read", async () => {
    const n = await createNotification(johnId, janeId, "follow")

    const res = await request(app)
      .patch(`/api/notifications/${n._id}/read`)
      .set("Authorization", `Bearer ${johnToken}`)
    expect(res.status).toBe(204)

    const updated = await Notification.findById(n._id).lean()
    expect(updated!.read).toBe(true)
  })
})
