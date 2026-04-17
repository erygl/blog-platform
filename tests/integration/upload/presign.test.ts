import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { app, cleanDb, loginUser, registerUser, registerSecondUser, loginSecondUser } from "../../helpers/auth.helper.js"
import request from "supertest"

vi.mock("../../../src/utils/email.js", () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined)
}))

vi.mock("../../../src/services/upload.service.js", () => ({
  getPreSignedUploadUrl: vi.fn().mockResolvedValue({
    uploadUrl: "https://r2.example.com/presigned",
    publicUrl: "https://cdn.example.com/images/test.jpeg"
  })
}))

let token: string
let unverifiedToken: string

beforeEach(async () => {
  await registerUser(false)
  const unverifiedRes = await loginUser()
  unverifiedToken = unverifiedRes.accessToken

  await registerSecondUser()
  const res = await loginSecondUser()
  token = res.accessToken
})

afterEach(async () => {
  vi.clearAllMocks()
  await cleanDb()
})

describe("POST /api/upload", () => {
  it("should return 200 with uploadUrl and publicUrl", async () => {
    const res = await request(app)
      .post("/api/upload")
      .set("Authorization", `Bearer ${token}`)
      .send({ contentType: "image/jpeg", contentLength: 1024 })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty("uploadUrl")
    expect(res.body).toHaveProperty("publicUrl")
  })

  it("should return 200 for image/png", async () => {
    const res = await request(app)
      .post("/api/upload")
      .set("Authorization", `Bearer ${token}`)
      .send({ contentType: "image/png", contentLength: 2048 })

    expect(res.status).toBe(200)
  })

  it("should return 200 for image/webp", async () => {
    const res = await request(app)
      .post("/api/upload")
      .set("Authorization", `Bearer ${token}`)
      .send({ contentType: "image/webp", contentLength: 2048 })

    expect(res.status).toBe(200)
  })

  it("should return 400 for unsupported content type", async () => {
    const res = await request(app)
      .post("/api/upload")
      .set("Authorization", `Bearer ${token}`)
      .send({ contentType: "image/gif", contentLength: 1024 })

    expect(res.status).toBe(400)
  })

  it("should return 400 when contentLength exceeds 5MB", async () => {
    const res = await request(app)
      .post("/api/upload")
      .set("Authorization", `Bearer ${token}`)
      .send({ contentType: "image/jpeg", contentLength: 5 * 1024 * 1024 + 1 })

    expect(res.status).toBe(400)
  })

  it("should return 400 when contentLength is zero", async () => {
    const res = await request(app)
      .post("/api/upload")
      .set("Authorization", `Bearer ${token}`)
      .send({ contentType: "image/jpeg", contentLength: 0 })

    expect(res.status).toBe(400)
  })

  it("should return 400 when contentType is missing", async () => {
    const res = await request(app)
      .post("/api/upload")
      .set("Authorization", `Bearer ${token}`)
      .send({ contentLength: 1024 })

    expect(res.status).toBe(400)
  })

  it("should return 400 when contentLength is missing", async () => {
    const res = await request(app)
      .post("/api/upload")
      .set("Authorization", `Bearer ${token}`)
      .send({ contentType: "image/jpeg" })

    expect(res.status).toBe(400)
  })

  it("should return 401 when no auth token is provided", async () => {
    const res = await request(app)
      .post("/api/upload")
      .send({ contentType: "image/jpeg", contentLength: 1024 })

    expect(res.status).toBe(401)
  })

  it("should return 403 for unverified user", async () => {
    const res = await request(app)
      .post("/api/upload")
      .set("Authorization", `Bearer ${unverifiedToken}`)
      .send({ contentType: "image/jpeg", contentLength: 1024 })

    expect(res.status).toBe(403)
  })
})
