import { afterEach, vi, describe, it, expect } from "vitest"
import { app, request, cleanDb, registerUser, loginUser } from "../../helpers/auth.helper.js"

vi.mock("../../../src/utils/email.js", () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined)
}))

afterEach(async () => {
  vi.clearAllMocks()
  await cleanDb()
})

describe("PATCH api/users/me", () => {
  it("should return 200 with valid fields", async () => {
    await registerUser()
    const { accessToken } = await loginUser()
    const res = await request(app)
      .patch("/api/users/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ username: "john2", name: "John Updated", bio: "I am John2", avatar: "https://example.com/avatar.png" })
    expect(res.status).toBe(200)
    expect(res.body.user.username).toBe("john2")
    expect(res.body.user.name).toBe("John Updated")
    expect(res.body.user.bio).toBe("I am John2")
  })

  it("should return 200 with partial fields", async () => {
    await registerUser()
    const { accessToken } = await loginUser()
    const res = await request(app)
      .patch("/api/users/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ bio: "Just a bio update" })
    expect(res.status).toBe(200)
    expect(res.body.user.bio).toBe("Just a bio update")
    expect(res.body.user.username).toBe("john")
    expect(res.body.user.name).toBe("John Doe")
  })

  it("should return 409 on duplicate username", async () => {
    await request(app).post("/api/auth/register").send({
      username: "taken",
      name: "Taken User",
      email: "taken@example.com",
      password: "Password1"
    })
    await registerUser()
    const { accessToken } = await loginUser()
    const res = await request(app)
      .patch("/api/users/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ username: "taken" })
    expect(res.status).toBe(409)
  })

  it("should return 401 if no auth token", async () => {
    const res = await request(app)
      .patch("/api/users/me")
      .send({ bio: "no auth" })
    expect(res.status).toBe(401)
  })
})
