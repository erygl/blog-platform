import { describe, it, expect } from "vitest"
import { registerSchema, loginSchema } from "../../src/validations/auth.validation.js"

describe("registerSchema", () => {
  it("should pass with valid input", () => {
    const result = registerSchema.safeParse({
      username: "john",
      name: "John Doe",
      email: "john@example.com",
      password: "Password1"
    })
    expect(result.success).toBe(true)
  })

  it("should fail if username is too short", () => {
    const result = registerSchema.safeParse({
      username: "jo",
      email: "john@example.com",
      password: "Password1"
    })
    expect(result.success).toBe(false)
  })

  it("should fail if email is invalid", () => {
    const result = registerSchema.safeParse({
      username: "john",
      email: "not-an-email",
      password: "Password1"
    })
    expect(result.success).toBe(false)
  })

  it("should fail if password has no uppercase letter", () => {
    const result = registerSchema.safeParse({
      username: "john",
      email: "john@example.com",
      password: "password1"
    })
    expect(result.success).toBe(false)
  })

  it("should fail if password has no number", () => {
    const result = registerSchema.safeParse({
      username: "john",
      email: "john@example.com",
      password: "Password"
    })
    expect(result.success).toBe(false)
  })
})


describe("loginSchema", () => {
  it("should pass with a valid input", () => {
    const result = loginSchema.safeParse({
      email: "john@example.com",
      password: "anyPassword"
    })
    expect(result.success).toBe(true)
  })

  it("should fail if email is invalid", () => {
    const result = loginSchema.safeParse({
      email: "notEmail",
      password: "anyPassword"
    })
    expect(result.success).toBe(false)
  })

  it("should fail if password is empty", () => {
    const result = loginSchema.safeParse({
      email: "john@example.com",
      password: ""
    })
    expect(result.success).toBe(false)
  })
})