import request from "supertest"
import app from "../../src/app.js"

export const blockUser = (accessToken: string, username: string) =>
  request(app).post(`/api/blocks/${username}`).set("Authorization", `Bearer ${accessToken}`)
