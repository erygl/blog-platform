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
import { createComment } from "../../helpers/comment.helper.js"
import { initSSE } from "../../../src/services/notification.service.js"
import Notification from "../../../src/models/Notification.js"
import User from "../../../src/models/User.js"

vi.mock("../../../src/utils/email.js", () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined)
}))

beforeAll(() => {
  initSSE()
})

let johnToken: string
let janeToken: string
let johnId: string
let janeId: string
let postSlug: string

beforeEach(async () => {
  await registerUser()
  johnToken = (await loginUser()).accessToken
  await registerSecondUser()
  janeToken = (await loginSecondUser()).accessToken

  const john = await User.findOne({ email: "john@example.com" }).lean()
  const jane = await User.findOne({ email: "jane@example.com" }).lean()
  johnId = john!._id.toString()
  janeId = jane!._id.toString()

  const post = await createPost(johnToken)
  postSlug = post.slug
})

afterEach(async () => {
  vi.clearAllMocks()
  await cleanDb()
})

describe("post like → notification", () => {
  it("creates a post_like notification for the post author", async () => {
    await request(app)
      .post(`/api/posts/${postSlug}/like`)
      .set("Authorization", `Bearer ${janeToken}`)

    await vi.waitFor(async () => {
      const n = await Notification.findOne({ recipient: johnId, sender: janeId, type: "post_like" })
      expect(n).not.toBeNull()
    })
  })
})

describe("post comment → notification", () => {
  it("creates a post_comment notification for the post author", async () => {
    await request(app)
      .post(`/api/posts/${postSlug}/comments`)
      .set("Authorization", `Bearer ${janeToken}`)
      .send({ content: "Nice post!" })

    await vi.waitFor(async () => {
      const n = await Notification.findOne({ recipient: johnId, sender: janeId, type: "post_comment" })
      expect(n).not.toBeNull()
    })
  })
})

describe("comment reply → notification", () => {
  it("creates a comment_reply notification for the comment author", async () => {
    const comment = await createComment(janeToken, postSlug)

    await request(app)
      .post(`/api/posts/${postSlug}/comments/${comment._id}/replies`)
      .set("Authorization", `Bearer ${johnToken}`)
      .send({ content: "Thanks for the comment!" })

    await vi.waitFor(async () => {
      const n = await Notification.findOne({ recipient: janeId, sender: johnId, type: "comment_reply" })
      expect(n).not.toBeNull()
    })
  })
})

describe("comment like → notification", () => {
  it("creates a comment_like notification for the comment author", async () => {
    const comment = await createComment(janeToken, postSlug)

    await request(app)
      .post(`/api/posts/${postSlug}/comments/${comment._id}/like`)
      .set("Authorization", `Bearer ${johnToken}`)

    await vi.waitFor(async () => {
      const n = await Notification.findOne({ recipient: janeId, sender: johnId, type: "comment_like" })
      expect(n).not.toBeNull()
    })
  })
})

describe("follow → notification", () => {
  it("creates a follow notification for the followed user", async () => {
    await request(app)
      .post("/api/users/john/follow")
      .set("Authorization", `Bearer ${janeToken}`)

    await vi.waitFor(async () => {
      const n = await Notification.findOne({ recipient: johnId, sender: janeId, type: "follow" })
      expect(n).not.toBeNull()
    })
  })
})
