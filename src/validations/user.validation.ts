import { z } from "zod"

export const updateProfileSchema = z.object({
  username: z.string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .optional(),
  bio: z.string()
    .max(160, "Bio must be at most 160 characters")
    .optional(),
  avatar: z.string().optional()
})

export const updateEmailSchema = z.object({
  password: z.string("Password is required"),
  email: z.email({
    error: (iss) =>
      iss.input === undefined ? "Email is required" : "Invalid email format"
  })
})

export const updatePasswordSchema = z.object({
  oldPassword: z.string("Old password is required"),
  newPassword: z
    .string("New password is required")
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[0-9]/, "Password must contain a number"),
})