import { vi, describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest"
import {
  app,
  request,
  registerUser,
  loginUser,
  registerSecondUser,
  loginSecondUser,
  cleanDb
} from "../../helpers/auth.helper.js"
import { createPost } from "../../helpers/post.helper.js"
import { initSSE, sseClients } from "../../../src/services/notification.service.js"
import User from "../../../src/models/User.js"

vi.mock("../../../src/utils/email.js", async (importOriginal) => ({
  ...await importOriginal(),
  sendEmail: vi.fn().mockResolvedValue(undefined)
}))

beforeAll(() => {
  initSSE()
})

let johnToken: string
let janeToken: string
let johnId: string

beforeEach(async () => {
  await registerUser()
  johnToken = (await loginUser()).accessToken
  await registerSecondUser()
  janeToken = (await loginSecondUser()).accessToken

  const john = await User.findOne({ email: "john@example.com" }).lean()
  johnId = john!._id.toString()
})

afterEach(async () => {
  sseClients.delete(johnId)
  vi.clearAllMocks()
  await cleanDb()
})

describe("GET /api/notifications/stream", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/notifications/stream")
    expect(res.status).toBe(401)
  })

  it("delivers a notification event to the connected client", async () => {
    // Simulate an active SSE connection by injecting a mock response into sseClients
    const mockWrite = vi.fn()
    sseClients.set(johnId, { write: mockWrite } as any)

    // Trigger a notification by having jane like john's post
    const postSlug = (await createPost(johnToken)).slug
    await request(app)
      .post(`/api/posts/${postSlug}/like`)
      .set("Authorization", `Bearer ${janeToken}`)

    // Wait for the async emitter handler to write the event to the mock response
    await vi.waitFor(() => expect(mockWrite).toHaveBeenCalled())

    // Assert the SSE event payload is correct
    const event = JSON.parse(mockWrite.mock.calls[0][0].replace("data: ", ""))
    expect(event.type).toBe("post_like")
    expect(event.sender.username).toBe("jane")
  })
})
