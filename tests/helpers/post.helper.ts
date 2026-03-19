import request from "supertest"
import app from "../../src/app.js"

export async function createPost(accessToken: string, overrides: Record<string, unknown> = {}) {
  const res = await request(app)
    .post("/api/posts")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      title: "My Test Post Title",
      content: "This is the body of the test post and it is long enough to pass validation.",
      status: "published",
      ...overrides
    })
  return res.body.post
}
