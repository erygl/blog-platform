import { vi, describe, it, expect, beforeEach, afterEach } from "vitest"
import {
  app,
  request,
  registerUser,
  loginUser,
  registerSecondUser,
  loginSecondUser,
  cleanDb
} from "../../helpers/auth.helper.js"
import { createNotification } from "../../helpers/notification.helper.js"
import User from "../../../src/models/User.js"

vi.mock("../../../src/utils/email.js", async (importOriginal) => ({
  ...await importOriginal(),
  sendEmail: vi.fn().mockResolvedValue(undefined)
}))

let johnToken: string
let janeToken: string
let johnId: string
let janeId: string

beforeEach(async () => {
  await registerUser()
  johnToken = (await loginUser()).accessToken
  await registerSecondUser()
  janeToken = (await loginSecondUser()).accessToken

  const john = await User.findOne({ email: "john@example.com" }).lean()
  const jane = await User.findOne({ email: "jane@example.com" }).lean()
  johnId = john!._id.toString()
  janeId = jane!._id.toString()
})

afterEach(async () => {
  vi.clearAllMocks()
  await cleanDb()
})

describe("GET /api/notifications", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/notifications")
    expect(res.status).toBe(401)
  })

  it("returns empty data array when user has no notifications", async () => {
    const res = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${johnToken}`)
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual([])
    expect(res.body.hasMore).toBe(false)
  })

  it("returns only the user's notifications", async () => {
    await createNotification(johnId, janeId, "follow")
    await createNotification(janeId, johnId, "follow")

    const res = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${johnToken}`)
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].type).toBe("follow")
  })

  it("returns notifications sorted newest first", async () => {
    const n1 = await createNotification(johnId, janeId, "follow")
    const n2 = await createNotification(johnId, janeId, "post_like")

    const res = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${johnToken}`)
    expect(res.status).toBe(200)
    expect(res.body.data[0]._id).toBe(n2._id.toString())
    expect(res.body.data[1]._id).toBe(n1._id.toString())
  })

  it("returns hasMore: true when more records exist", async () => {
    for (let i = 0; i < 3; i++) {
      await createNotification(johnId, janeId, "follow")
    }
    const res = await request(app)
      .get("/api/notifications?limit=2")
      .set("Authorization", `Bearer ${johnToken}`)
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(2)
    expect(res.body.hasMore).toBe(true)
    expect(res.body.nextCursor).toBeTruthy()
  })

  it("returns hasMore: false on the last page", async () => {
    await createNotification(johnId, janeId, "follow")
    await createNotification(johnId, janeId, "post_like")

    const res = await request(app)
      .get("/api/notifications?limit=10")
      .set("Authorization", `Bearer ${johnToken}`)
    expect(res.status).toBe(200)
    expect(res.body.hasMore).toBe(false)
    expect(res.body.nextCursor).toBeUndefined()
  })

  it("returns the correct next page using nextCursor", async () => {
    for (let i = 0; i < 3; i++) {
      await createNotification(johnId, janeId, "follow")
    }

    const firstPage = await request(app)
      .get("/api/notifications?limit=2")
      .set("Authorization", `Bearer ${johnToken}`)
    expect(firstPage.body.hasMore).toBe(true)
    const cursor = firstPage.body.nextCursor

    const secondPage = await request(app)
      .get(`/api/notifications?limit=2&cursor=${cursor}`)
      .set("Authorization", `Bearer ${johnToken}`)
    expect(secondPage.body.data).toHaveLength(1)
    expect(secondPage.body.hasMore).toBe(false)
  })
})
