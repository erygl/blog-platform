import request from "supertest"
import app from "../../src/app.js"
import mongoose from "mongoose"
import User from "../../src/models/User.js"

export { app, request }

export async function cleanDb() {
  const collections = mongoose.connection.collections
  for (const key in collections) {
    await collections[key].deleteMany({})
  }
}

export async function registerUser(verified = true) {
  const data = {
    username: "john",
    name: "John Doe",
    email: "john@example.com",
    password: "Password1"
  }
  await request(app).post("/api/auth/register").send(data)
  if (verified) {
    await User.updateOne({ email: data.email }, { isVerified: true })
  }
  return data
}

export async function loginUser() {
  const res = await request(app)
    .post("/api/auth/login")
    .send({
      email: "john@example.com",
      password: "Password1"
    })
  return {
    accessToken: res.body.accessToken as string,
    refreshToken: res.headers["set-cookie"] as unknown as string[]
  }
}

export async function registerSecondUser() {
  const data = {
    username: "jane",
    name: "Jane Doe",
    email: "jane@example.com",
    password: "Password1"
  }
  await request(app).post("/api/auth/register").send(data)
  await User.updateOne({ email: data.email }, { isVerified: true })
  return data
}

export async function loginSecondUser() {
  const res = await request(app)
    .post("/api/auth/login")
    .send({
      email: "jane@example.com",
      password: "Password1"
    })
  return {
    accessToken: res.body.accessToken as string,
    refreshToken: res.headers["set-cookie"] as unknown as string[]
  }
}