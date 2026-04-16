import { afterEach, beforeEach, vi, describe, it, expect } from "vitest"
import { app, request, cleanDb, registerUser, loginUser, registerSecondUser, loginSecondUser } from "../../helpers/auth.helper.js"
import { createPost } from "../../helpers/post.helper.js"
import { createComment, createReply } from "../../helpers/comment.helper.js"

vi.mock("../../../src/utils/email.js", () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined)
}))

let accessToken: string
let postSlug: string

beforeEach(async () => {
  await registerUser()
  const res = await loginUser()
  accessToken = res.accessToken
  const post = await createPost(accessToken)
  postSlug = post.slug
})

afterEach(async () => {
  vi.clearAllMocks()
  await cleanDb()
})

describe("PATCH /api/posts/:postSlug/comments/:commentId", () => {
  it("should update comment and return 200 with updated content", async () => {
    const comment = await createComment(accessToken, postSlug)
    const res = await request(app)
      .patch(`/api/posts/${postSlug}/comments/${comment._id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ content: "Updated comment" })
    expect(res.status).toBe(200)
    expect(res.body.comment.content).toBe("Updated comment")
  })

  it("should set isEdited to true", async () => {
    const comment = await createComment(accessToken, postSlug)
    const res = await request(app)
      .patch(`/api/posts/${postSlug}/comments/${comment._id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ content: "Edited content" })
    expect(res.status).toBe(200)
    expect(res.body.comment.isEdited).toBe(true)
  })

  it("should update a reply and return 200", async () => {
    const comment = await createComment(accessToken, postSlug)
    const reply = await createReply(accessToken, postSlug, comment._id)
    const res = await request(app)
      .patch(`/api/posts/${postSlug}/comments/${reply._id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ content: "Updated reply" })
    expect(res.status).toBe(200)
    expect(res.body.comment.content).toBe("Updated reply")
  })

  it("should return 401 if no auth token", async () => {
    const comment = await createComment(accessToken, postSlug)
    const res = await request(app)
      .patch(`/api/posts/${postSlug}/comments/${comment._id}`)
      .send({ content: "Updated" })
    expect(res.status).toBe(401)
  })

  it("should return 400 if body is invalid", async () => {
    const comment = await createComment(accessToken, postSlug)
    const res = await request(app)
      .patch(`/api/posts/${postSlug}/comments/${comment._id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ content: "" })
    expect(res.status).toBe(400)
  })

  it("should return 404 if comment does not exist", async () => {
    const res = await request(app)
      .patch(`/api/posts/${postSlug}/comments/000000000000000000000000`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ content: "Updated" })
    expect(res.status).toBe(404)
  })

  it("should return 404 if user does not own the comment", async () => {
    const comment = await createComment(accessToken, postSlug)

    await registerSecondUser()
    const janeLogin = await loginSecondUser()

    const res = await request(app)
      .patch(`/api/posts/${postSlug}/comments/${comment._id}`)
      .set("Authorization", `Bearer ${janeLogin.accessToken}`)
      .send({ content: "Hijacked" })
    expect(res.status).toBe(404)
  })
})
