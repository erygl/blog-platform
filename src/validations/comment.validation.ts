import { z } from "zod"

export const commentSchema = z.object({
  content: z.string("Comment can not be empty")
    .min(1, "Comment must be at least 1 character")
    .max(1000, "Comment must be at most 1000 characters")
    .trim()
})