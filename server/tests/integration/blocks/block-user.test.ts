import { afterEach, beforeEach, vi, describe, it, expect } from "vitest"
import { app, request, cleanDb, registerUser, loginUser, registerSecondUser, loginSecondUser } from "../../helpers/auth.helper.js"
import User from "../../../src/models/User.js"
import Follow from "../../../src/models/Follow.js"
import Post from "../../../src/models/Post.js"
import Comment from "../../../src/models/Comment.js"
import Like from "../../../src/models/Like.js"
import Bookmark from "../../../src/models/Bookmark.js"
import { createPost } from "../../helpers/post.helper.js"
import { createComment, createReply } from "../../helpers/comment.helper.js"

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

describe("POST /api/blocks/:username", () => {
  it("should block a user successfully", async () => {
    await registerSecondUser()

    const res = await request(app)
      .post("/api/blocks/jane")
      .set("Authorization", `Bearer ${accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.message).toContain("blocked")
  })

  it("should return 401 if no auth token", async () => {
    await registerSecondUser()

    const res = await request(app).post("/api/blocks/jane")

    expect(res.status).toBe(401)
  })

  it("should return 403 if user is not verified", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ username: "bob", name: "Bob", email: "bob@example.com", password: "Password1" })
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "bob@example.com", password: "Password1" })
    const unverifiedToken = loginRes.body.accessToken

    const res = await request(app)
      .post("/api/blocks/john")
      .set("Authorization", `Bearer ${unverifiedToken}`)

    expect(res.status).toBe(403)
  })

  it("should return 404 if target user does not exist", async () => {
    const res = await request(app)
      .post("/api/blocks/nonexistent")
      .set("Authorization", `Bearer ${accessToken}`)

    expect(res.status).toBe(404)
  })

  it("should return 400 if trying to block yourself", async () => {
    const res = await request(app)
      .post("/api/blocks/john")
      .set("Authorization", `Bearer ${accessToken}`)

    expect(res.status).toBe(400)
  })

  it("should return 409 if user is already blocked", async () => {
    await registerSecondUser()

    await request(app)
      .post("/api/blocks/jane")
      .set("Authorization", `Bearer ${accessToken}`)

    const res = await request(app)
      .post("/api/blocks/jane")
      .set("Authorization", `Bearer ${accessToken}`)

    expect(res.status).toBe(409)
  })

  it("should remove mutual follows when blocking", async () => {
    await registerSecondUser()

    const john = await User.findOne({ username: "john" }).lean()
    const jane = await User.findOne({ username: "jane" }).lean()

    await Follow.create({ follower: john!._id, following: jane!._id })
    await Follow.create({ follower: jane!._id, following: john!._id })
    await User.findByIdAndUpdate(john!._id, { followingCount: 1, followersCount: 1 })
    await User.findByIdAndUpdate(jane!._id, { followingCount: 1, followersCount: 1 })

    await request(app)
      .post("/api/blocks/jane")
      .set("Authorization", `Bearer ${accessToken}`)

    const updatedJohn = await User.findById(john!._id).lean()
    const updatedJane = await User.findById(jane!._id).lean()
    const followExists = await Follow.exists({ follower: john!._id, following: jane!._id })
    const followBackExists = await Follow.exists({ follower: jane!._id, following: john!._id })

    expect(followExists).toBeNull()
    expect(followBackExists).toBeNull()
    expect(updatedJohn!.followingCount).toBe(0)
    expect(updatedJohn!.followersCount).toBe(0)
    expect(updatedJane!.followingCount).toBe(0)
    expect(updatedJane!.followersCount).toBe(0)
  })

  describe("cascade cleanup", () => {
    let janeToken: string
    let johnId: string, janeId: string
    let johnPost: { slug: string, _id: string }
    let janePost: { slug: string, _id: string }

    beforeEach(async () => {
      const john = await User.findOne({ username: "john" }).select("_id").lean()
      johnId = john!._id.toString()

      await registerSecondUser()
      const janeRes = await loginSecondUser()
      janeToken = janeRes.accessToken
      const jane = await User.findOne({ username: "jane" }).select("_id").lean()
      janeId = jane!._id.toString()

      johnPost = await createPost(accessToken)
      janePost = await createPost(janeToken)
    })

    it("should remove post likes in both directions and adjust likesCount", async () => {
      await request(app).post(`/api/posts/${janePost.slug}/like`).set("Authorization", `Bearer ${accessToken}`)
      await request(app).post(`/api/posts/${johnPost.slug}/like`).set("Authorization", `Bearer ${janeToken}`)

      await request(app).post("/api/blocks/jane").set("Authorization", `Bearer ${accessToken}`)

      const updatedJanePost = await Post.findById(janePost._id).lean()
      const updatedJohnPost = await Post.findById(johnPost._id).lean()
      const johnLike = await Like.exists({ user: johnId, post: janePost._id, type: "post" })
      const janeLike = await Like.exists({ user: janeId, post: johnPost._id, type: "post" })

      expect(johnLike).toBeNull()
      expect(janeLike).toBeNull()
      expect(updatedJanePost!.likesCount).toBe(0)
      expect(updatedJohnPost!.likesCount).toBe(0)
    })

    it("should remove comment likes in both directions", async () => {
      const janeComment = await createComment(janeToken, johnPost.slug)
      const johnComment = await createComment(accessToken, janePost.slug)

      await request(app).post(`/api/posts/${johnPost.slug}/comments/${janeComment._id}/like`).set("Authorization", `Bearer ${accessToken}`)
      await request(app).post(`/api/posts/${janePost.slug}/comments/${johnComment._id}/like`).set("Authorization", `Bearer ${janeToken}`)

      await request(app).post("/api/blocks/jane").set("Authorization", `Bearer ${accessToken}`)

      const johnLike = await Like.exists({ user: johnId, comment: janeComment._id, type: "comment" })
      const janeLike = await Like.exists({ user: janeId, comment: johnComment._id, type: "comment" })

      expect(johnLike).toBeNull()
      expect(janeLike).toBeNull()
    })

    it("should remove blocker's comments on blocked's post and adjust commentsCount", async () => {
      await createComment(accessToken, janePost.slug)
      await createComment(accessToken, janePost.slug)

      await request(app).post("/api/blocks/jane").set("Authorization", `Bearer ${accessToken}`)

      const remaining = await Comment.find({ post: janePost._id, author: johnId }).lean()
      const updatedJanePost = await Post.findById(janePost._id).lean()

      expect(remaining).toHaveLength(0)
      expect(updatedJanePost!.commentsCount).toBe(0)
    })

    it("should remove blocked's comments and blocker's replies on blocker's post and adjust counts", async () => {
      const janeComment = await createComment(janeToken, johnPost.slug)
      await createReply(accessToken, johnPost.slug, janeComment._id)

      await request(app).post("/api/blocks/jane").set("Authorization", `Bearer ${accessToken}`)

      const remaining = await Comment.find({ post: johnPost._id }).lean()
      const updatedJohnPost = await Post.findById(johnPost._id).lean()

      expect(remaining).toHaveLength(0)
      expect(updatedJohnPost!.commentsCount).toBe(0)
    })

    it("should remove cross-post reply on blocked's comment and adjust counts without removing the parent comment", async () => {
      await request(app).post("/api/auth/register").send({ username: "bob", name: "Bob", email: "bob@example.com", password: "Password1" })
      await User.updateOne({ username: "bob" }, { isVerified: true })
      const bobLoginRes = await request(app).post("/api/auth/login").send({ email: "bob@example.com", password: "Password1" })
      const bobPost = await createPost(bobLoginRes.body.accessToken)

      const janeComment = await createComment(janeToken, bobPost.slug)
      await createReply(accessToken, bobPost.slug, janeComment._id)

      await request(app).post("/api/blocks/jane").set("Authorization", `Bearer ${accessToken}`)

      const johnReply = await Comment.findOne({ author: johnId, parentComment: janeComment._id }).lean()
      const survivingJaneComment = await Comment.findById(janeComment._id).lean()
      const updatedBobPost = await Post.findById(bobPost._id).lean()

      expect(johnReply).toBeNull()
      expect(survivingJaneComment).not.toBeNull()
      expect(survivingJaneComment!.repliesCount).toBe(0)
      expect(updatedBobPost!.commentsCount).toBe(1)
    })

    it("should remove bookmarks of each other's posts", async () => {
      await request(app).post(`/api/bookmarks/${janePost.slug}`).set("Authorization", `Bearer ${accessToken}`)
      await request(app).post(`/api/bookmarks/${johnPost.slug}`).set("Authorization", `Bearer ${janeToken}`)

      await request(app).post("/api/blocks/jane").set("Authorization", `Bearer ${accessToken}`)

      const johnBookmark = await Bookmark.exists({ user: johnId, post: janePost._id })
      const janeBookmark = await Bookmark.exists({ user: janeId, post: johnPost._id })

      expect(johnBookmark).toBeNull()
      expect(janeBookmark).toBeNull()
    })
  })
})
