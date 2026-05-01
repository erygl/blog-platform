import { describe, it, expect } from "vitest"
import { createPostSchema, updatePostSchema } from "../../src/validations/post.validation.js"

describe("createPostSchema", () => {
  it("should pass with valid input", () => {
    const result = createPostSchema.safeParse({
      title: "My Valid Post Title",
      content: "This is the body of the post and it is long enough to pass validation.",
      status: "draft"
    })
    expect(result.success).toBe(true)
  })

  it("should default status to draft if not provided", () => {
    const result = createPostSchema.safeParse({
      title: "My Valid Post Title",
      content: "This is the body of the post and it is long enough to pass validation."
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.status).toBe("draft")
  })

  it("should fail if title is missing", () => {
    const result = createPostSchema.safeParse({
      content: "This is the body of the post and it is long enough to pass validation.",
      status: "draft"
    })
    expect(result.success).toBe(false)
  })

  it("should fail if title is too short", () => {
    const result = createPostSchema.safeParse({
      title: "Hi",
      content: "This is the body of the post and it is long enough to pass validation.",
      status: "draft"
    })
    expect(result.success).toBe(false)
  })

  it("should fail if title is too long", () => {
    const result = createPostSchema.safeParse({
      title: "A".repeat(101),
      content: "This is the body of the post and it is long enough to pass validation.",
      status: "draft"
    })
    expect(result.success).toBe(false)
  })

  it("should fail if content is missing", () => {
    const result = createPostSchema.safeParse({
      title: "My Valid Post Title",
      status: "draft"
    })
    expect(result.success).toBe(false)
  })

  it("should fail if content is too short", () => {
    const result = createPostSchema.safeParse({
      title: "My Valid Post Title",
      content: "Too short.",
      status: "draft"
    })
    expect(result.success).toBe(false)
  })

  it("should fail if status is invalid", () => {
    const result = createPostSchema.safeParse({
      title: "My Valid Post Title",
      content: "This is the body of the post and it is long enough to pass validation.",
      status: "archived"
    })
    expect(result.success).toBe(false)
  })

  it("should fail if coverImage is not a valid URL", () => {
    const result = createPostSchema.safeParse({
      title: "My Valid Post Title",
      content: "This is the body of the post and it is long enough to pass validation.",
      status: "draft",
      coverImage: "not-a-url"
    })
    expect(result.success).toBe(false)
  })

  it("should fail if tags exceed 5", () => {
    const result = createPostSchema.safeParse({
      title: "My Valid Post Title",
      content: "This is the body of the post and it is long enough to pass validation.",
      status: "draft",
      tags: ["a", "b", "c", "d", "e", "f"]
    })
    expect(result.success).toBe(false)
  })
})

describe("updatePostSchema", () => {
  it("should pass with all fields optional (empty object)", () => {
    const result = updatePostSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it("should pass with partial fields", () => {
    const result = updatePostSchema.safeParse({ title: "Updated Title" })
    expect(result.success).toBe(true)
  })

  it("should fail if provided title is too short", () => {
    const result = updatePostSchema.safeParse({ title: "Hi" })
    expect(result.success).toBe(false)
  })

  it("should fail if provided content is too short", () => {
    const result = updatePostSchema.safeParse({ content: "Too short." })
    expect(result.success).toBe(false)
  })
})
