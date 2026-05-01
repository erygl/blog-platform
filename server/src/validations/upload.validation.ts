import { z } from "zod"

export const getPresignedUrlSchema = z.object({
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"],
    `Content type must be "image/jpeg", "image/png" or "image/webp"`),
  contentLength: z.number()
    .int()
    .positive()
    .max(5 * 1024 * 1024, "File must be under 5MB") // 5MB cap
})