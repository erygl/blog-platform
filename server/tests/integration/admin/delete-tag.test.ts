import { afterEach, beforeEach, vi, describe, it, expect } from "vitest"
import { app, request, cleanDb, registerUser, loginUser } from "../../helpers/auth.helper.js"
import { registerAdmin, loginAdmin } from "../../helpers/admin.helper.js"
import { createPost } from "../../helpers/post.helper.js"
import Tag from "../../../src/models/Tag.js"
import Post from "../../../src/models/Post.js"

vi.mock("../../../src/utils/email.js", async (importOriginal) => ({
  ...await importOriginal(),
  sendEmail: vi.fn().mockResolvedValue(undefined)
}))

let adminToken: string
let userToken: string

beforeEach(async () => {
  await registerAdmin()
  adminToken = await loginAdmin()
  await registerUser()
  const res = await loginUser()
  userToken = res.accessToken
})

afterEach(async () => {
  vi.clearAllMocks()
  await cleanDb()
})

describe("DELETE /api/admin/tags/:tagId", () => {
  it("should delete tag and return 204", async () => {
    const tag = await Tag.create({ name: "Javascript", slug: "javascript" })
    const res = await request(app)
      .delete(`/api/admin/tags/${tag._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
    expect(res.status).toBe(204)
    const deleted = await Tag.findById(tag._id)
    expect(deleted).toBeNull()
  })

  it("should remove deleted tag from posts that referenced it", async () => {
    const tag = await Tag.create({ name: "Javascript", slug: "javascript" })
    const post = await createPost(userToken, { tags: ["Javascript"] })
    const dbPost = await Post.findOne({ slug: post.slug })
    expect(dbPost!.tags.map(t => t.toString())).toContain(tag._id.toString())

    await request(app)
      .delete(`/api/admin/tags/${tag._id}`)
      .set("Authorization", `Bearer ${adminToken}`)

    const updatedPost = await Post.findOne({ slug: post.slug })
    expect(updatedPost!.tags.map(t => t.toString())).not.toContain(tag._id.toString())
  })

  it("should only remove the deleted tag and leave other tags on the post", async () => {
    const tag1 = await Tag.create({ name: "Javascript", slug: "javascript" })
    const tag2 = await Tag.create({ name: "Typescript", slug: "typescript" })
    const post = await createPost(userToken, { tags: ["Javascript", "Typescript"] })
    const dbPost = await Post.findOne({ slug: post.slug })
    expect(dbPost!.tags).toHaveLength(2)

    await request(app)
      .delete(`/api/admin/tags/${tag1._id}`)
      .set("Authorization", `Bearer ${adminToken}`)

    const updatedPost = await Post.findOne({ slug: post.slug })
    expect(updatedPost!.tags).toHaveLength(1)
    expect(updatedPost!.tags.map(t => t.toString())).toContain(tag2._id.toString())
  })

  it("should return 404 if tag not found", async () => {
    const res = await request(app)
      .delete("/api/admin/tags/000000000000000000000001")
      .set("Authorization", `Bearer ${adminToken}`)
    expect(res.status).toBe(404)
  })

  it("should return 401 if no auth token", async () => {
    const tag = await Tag.create({ name: "Javascript", slug: "javascript" })
    const res = await request(app).delete(`/api/admin/tags/${tag._id}`)
    expect(res.status).toBe(401)
  })
})
