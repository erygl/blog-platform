import { z } from "zod";

export const getUsersSchema = z.object({
  q: z.string().optional(),
  isVerified: z.enum(["true", "false"]).transform(v => v === "true").optional(),
  isBanned: z.enum(["true", "false"]).transform(v => v === "true").optional(),
  role: z.enum(["user", "admin"], `Role must be "user" or "admin"`).optional(),
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().lte(50).default(10)
})

export const updateUserSchema = z.object({
  isVerified: z.boolean().optional(),
  isBanned: z.boolean().optional(),
  role: z.enum(["user", "admin"]).optional(),
  avatar: z.null().optional()
}).refine(data => Object.keys(data).length > 0, {
  message: "At least one field must be provided"
})

export const getPostsSchema = z.object({
  status: z.enum(["draft", "published", "archived"],
    `Status must be "draft", "published" or "archived"`
  ).optional(),
  author: z.string().optional(),
  sort: z.enum(
    ["createdAt", "publishedAt", "likesCount", "viewsCount", "trendingScore"],
    `Sort must be "createdAt", "publishedAt", "likesCount", "viewsCount" or "trendingScore"`
  ).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().lte(50).default(10)
})

export const getTagsSchema = z.object({
  q: z.string().optional(),
  sort: z.enum(["postCount", "createdAt"], `Sort must be "postCount" or "createdAt"`).default("postCount"),
  order: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().lte(50).default(10)
})

const tagNameSchema = z.string()
  .min(1, "Name is required")
  .max(50, "Name must be less than 50 characters")
  .transform(v => v.replace(/\s+/g, " ").trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase()))

export const createTagSchema = z.object({ name: tagNameSchema })

export const updateTagSchema = z.object({ name: tagNameSchema })

export const getStatsSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional()
}).refine(data => {
  if (data.startDate && data.endDate) return data.startDate <= data.endDate
  return true
}, { message: "startDate must be before or equal to endDate" })