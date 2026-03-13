import { z } from "zod"

export const registerSchema = z.object({
  username: z
    .string({ error: "Username is required" })
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters"),
  email: z.email("Invalid email format"),
  password: z
    .string({ error: "Password is required" })
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[0-9]/, "Password must contain a number"),
  bio: z.string().optional(),
  avatar: z.string().optional()
})

export const loginSchema = z.object({
  email: z.email("Invalid email format"),
  password: z.string({ error: "Password is required" })
    .min(1, "Password is required")
})

export const forgetPasswordSchema = z.object({
  email: z.email("Invalid email format")
})

export const resetPasswordSchema = z.object({
  password: z
    .string({ error: "Password is required" })
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[0-9]/, "Password must contain a number"),
})