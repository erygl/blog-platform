import { z } from "zod"

export const createPostSchema = z.object({
  title: z.string("Title is required")
    .min(5, "Title must be at least 5 characters")
    .max(100, "Title must be at most 100 characters")
    .trim(),
  content: z.string("Content is required")
    .min(50, "Content must be at least 50 characters"),
  coverImage: z.url("Cover image must be a valid URL").optional(),
  tags: z.array(
    z.string()
      .min(1, "Tag cannot be empty")
      .max(50, "Tag must be at most 50 characters")
      .trim()
  )
    .max(5, "Tags can include at most 5 different tags")
    .optional(),
  status: z.enum(["draft", "published"], `Status must be "draft" or "published"`)
    .default("draft")
})


export const updatePostSchema = z.object({
  title: z.string()
    .min(5, "Title must be at least 5 characters")
    .max(100, "Title must be at most 100 characters")
    .trim()
    .optional(),
  content: z.string()
    .min(50, "Content must be at least 50 characters")
    .optional(),
  coverImage: z.url("Cover image must be a valid URL").optional(),
  tags: z.array(
    z.string()
      .min(1, "Tag cannot be empty")
      .max(50, "Tag must be at most 50 characters")
      .trim()
  )
    .max(5, "Tags can include at most 5 different tags")
    .optional(),
  status: z.enum(["draft", "published"], `Status must be "draft" or "published"`)
    .optional()
})