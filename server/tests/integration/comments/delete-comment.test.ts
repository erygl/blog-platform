import { afterEach, beforeEach, vi, describe, it, expect } from "vitest"
import { app, request, cleanDb, registerUser, loginUser, registerSecondUser, loginSecondUser } from "../../helpers/auth.helper.js"
import { createPost } from "../../helpers/post.helper.js"
import { createComment, createReply } from "../../helpers/comment.helper.js"
import Post from "../../../src/models/Post.js"
import Comment from "../../../src/models/Comment.js"
import Like from "../../../src/models/Like.js"
import User from "../../../src/models/User.js"

vi.mock("../../../src/utils/email.js", async (importOriginal) => ({
  ...await importOriginal(),
  sendEmail: vi.fn().mockResolvedValue(undefined)
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

describe("DELETE /api/posts/:postSlug/comments/:commentId", () => {
  it("should delete comment and return 204", async () => {
    const comment = await createComment(accessToken, postSlug)
    const res = await request(app)
      .delete(`/api/posts/${postSlug}/comments/${comment._id}`)
      .set("Authorization", `Bearer ${accessToken}`)
    expect(res.status).toBe(204)
  })

  it("should decrement post commentsCount", async () => {
    const comment = await createComment(accessToken, postSlug)
    await request(app)
      .delete(`/api/posts/${postSlug}/comments/${comment._id}`)
      .set("Authorization", `Bearer ${accessToken}`)

    const post = await Post.findOne({ slug: postSlug }).lean()
    expect(post!.commentsCount).toBe(0)
  })

  it("should cascade delete replies and their likes", async () => {
    const comment = await createComment(accessToken, postSlug)
    const reply = await createReply(accessToken, postSlug, comment._id)

    const user = await User.findOne({ username: "john" })
    await Like.create({ user: user!._id, comment: reply._id, type: "comment" })

    await request(app)
      .delete(`/api/posts/${postSlug}/comments/${comment._id}`)
      .set("Authorization", `Bearer ${accessToken}`)

    const replies = await Comment.find({ parentComment: comment._id })
    expect(replies).toHaveLength(0)

    const likes = await Like.find({ comment: reply._id })
    expect(likes).toHaveLength(0)
  })

  it("should delete a reply and decrement parent repliesCount", async () => {
    const comment = await createComment(accessToken, postSlug)
    const reply = await createReply(accessToken, postSlug, comment._id)

    await request(app)
      .delete(`/api/posts/${postSlug}/comments/${reply._id}`)
      .set("Authorization", `Bearer ${accessToken}`)

    const parent = await Comment.findById(comment._id).lean()
    expect(parent!.repliesCount).toBe(0)
  })

  it("should return 401 if no auth token", async () => {
    const comment = await createComment(accessToken, postSlug)
    const res = await request(app)
      .delete(`/api/posts/${postSlug}/comments/${comment._id}`)
    expect(res.status).toBe(401)
  })

  it("should return 404 if comment does not exist", async () => {
    const res = await request(app)
      .delete(`/api/posts/${postSlug}/comments/000000000000000000000000`)
      .set("Authorization", `Bearer ${accessToken}`)
    expect(res.status).toBe(404)
  })

  it("should return 404 if user does not own the comment", async () => {
    const comment = await createComment(accessToken, postSlug)

    await registerSecondUser()
    const janeLogin = await loginSecondUser()

    const res = await request(app)
      .delete(`/api/posts/${postSlug}/comments/${comment._id}`)
      .set("Authorization", `Bearer ${janeLogin.accessToken}`)
    expect(res.status).toBe(404)
  })
})
