import request from "supertest"
import app from "../../src/app.js"
import User from "../../src/models/User.js"

export async function registerAdmin() {
  await request(app).post("/api/auth/register").send({
    username: "adminuser",
    name: "Admin User",
    email: "admin@example.com",
    password: "Password1"
  })
  await User.findOneAndUpdate(
    { email: "admin@example.com" },
    { role: "admin", isVerified: true }
  )
}

export async function loginAdmin(): Promise<string> {
  const res = await request(app).post("/api/auth/login").send({
    email: "admin@example.com",
    password: "Password1"
  })
  return res.body.accessToken as string
}
