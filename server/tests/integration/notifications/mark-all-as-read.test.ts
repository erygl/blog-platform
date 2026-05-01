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

vi.mock("../../../src/utils/email.js", async (importOriginal) => ({
  ...await importOriginal(),
  sendEmail: vi.fn().mockResolvedValue(undefined)
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

describe("PATCH /api/notifications/read-all", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).patch("/api/notifications/read-all")
    expect(res.status).toBe(401)
  })

  it("returns 204", async () => {
    const res = await request(app)
      .patch("/api/notifications/read-all")
      .set("Authorization", `Bearer ${johnToken}`)
    expect(res.status).toBe(204)
  })

  it("marks all unread notifications as read", async () => {
    await createNotification(johnId, janeId, "follow")
    await createNotification(johnId, janeId, "post_like")

    await request(app)
      .patch("/api/notifications/read-all")
      .set("Authorization", `Bearer ${johnToken}`)

    const unread = await Notification.countDocuments({ recipient: johnId, read: false })
    expect(unread).toBe(0)
  })

  it("does not affect another user's notifications", async () => {
    await createNotification(janeId, johnId, "follow")

    await request(app)
      .patch("/api/notifications/read-all")
      .set("Authorization", `Bearer ${johnToken}`)

    const janeUnread = await Notification.countDocuments({ recipient: janeId, read: false })
    expect(janeUnread).toBe(1)
  })
})
