import { afterEach, vi, describe, it, expect } from "vitest"
import * as emailUtils from "../../../src/utils/email.js"
import { app, request, cleanDb } from "../../helpers/auth.helper.js"

vi.mock("../../../src/utils/email.js", () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined)
}))

afterEach(async () => {
  vi.clearAllMocks()
  await cleanDb()
})

describe("POST api/auth/register", () => {
  it("should register a new user and return 201", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        username: "john",
        email: "john@example.com",
        password: "Password1"
      })
    expect(res.status).toBe(201)
    expect(res.body.user).toHaveProperty("email", "john@example.com")
    expect(res.body.user).toHaveProperty("username", "john")
    expect(res.body.user).not.toHaveProperty("password")
    expect(emailUtils.sendVerificationEmail).toHaveBeenCalledWith(
      "john@example.com",
      expect.any(String)
    )
  })

  it("should return 409, if email already exists ", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({
        username: "john",
        email: "john@example.com",
        password: "Password1"
      })
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        username: "john2",
        email: "john@example.com",
        password: "Password1"
      })
    expect(res.status).toBe(409)
  })

  it("should return 409, if username already exists ", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({
        username: "john",
        email: "john@example.com",
        password: "Password1"
      })
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        username: "john",
        email: "john2@example.com",
        password: "Password1"
      })
    expect(res.status).toBe(409)
  })

  it("should return 400 if body is invalid", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        username: "jo",
        email: "not-an-email",
        password: "weak"
      })
    expect(res.status).toBe(400)
  })
})