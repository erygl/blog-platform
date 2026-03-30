import { z } from "zod"

export const searchSchema = z.object({
  q: z.string("Query is required")
    .min(2, "Query must be at least 2 characters")
    .trim(),
  type: z.enum(["users", "posts", "tags"], `Type must be "users", "posts" or "tags"`)
    .default("posts")
})