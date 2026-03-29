import { afterEach, beforeEach, vi, describe, it, expect } from "vitest"
import { app, request, cleanDb, registerUser, loginUser } from "../../helpers/auth.helper.js"
import { createPost } from "../../helpers/post.helper.js"
import { createComment, createReply } from "../../helpers/comment.helper.js"
import Comment from "../../../src/models/Comment.js"
import Post from "../../../src/models/Post.js"

vi.mock("../../../src/utils/email.js", () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined)
}))

let accessToken: string
let postSlug: string
let commentId: string

beforeEach(async () => {
  await registerUser()
  const res = await loginUser()
  accessToken = res.accessToken
  const post = await createPost(accessToken)
  postSlug = post.slug
  const comment = await createComment(accessToken, postSlug)
  commentId = comment._id
})

afterEach(async () => {
  vi.clearAllMocks()
  await cleanDb()
})

describe("POST /api/posts/:postSlug/comments/:commentId/replies", () => {
  it("should add a reply and return 201", async () => {
    const res = await request(app)
      .post(`/api/posts/${postSlug}/comments/${commentId}/replies`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ content: "Nice comment!" })
    expect(res.status).toBe(201)
    expect(res.body.reply.content).toBe("Nice comment!")
    expect(res.body.message).toBe("Reply created successfully")
  })

  it("should increment comment repliesCount and post commentsCount", async () => {
    await createReply(accessToken, postSlug, commentId)

    const comment = await Comment.findById(commentId).lean()
    expect(comment!.repliesCount).toBe(1)

    const post = await Post.findOne({ slug: postSlug }).lean()
    expect(post!.commentsCount).toBe(2)
  })

  it("should return 400 when replying to a reply", async () => {
    const reply = await createReply(accessToken, postSlug, commentId)
    const res = await request(app)
      .post(`/api/posts/${postSlug}/comments/${reply._id}/replies`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ content: "Nested reply" })
    expect(res.status).toBe(400)
  })

  it("should return 401 if no auth token", async () => {
    const res = await request(app)
      .post(`/api/posts/${postSlug}/comments/${commentId}/replies`)
      .send({ content: "Nice comment!" })
    expect(res.status).toBe(401)
  })

  it("should return 404 if comment does not exist", async () => {
    const res = await request(app)
      .post(`/api/posts/${postSlug}/comments/000000000000000000000000/replies`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ content: "Nice comment!" })
    expect(res.status).toBe(404)
  })
})
