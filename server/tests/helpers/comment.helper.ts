import request from "supertest"
import app from "../../src/app.js"

export async function createComment(accessToken: string, postSlug: string, overrides: Record<string, unknown> = {}) {
  const res = await request(app)
    .post(`/api/posts/${postSlug}/comments`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      content: "This is a test comment.",
      ...overrides
    })
  return res.body.comment
}

export async function createReply(accessToken: string, postSlug: string, commentId: string, overrides: Record<string, unknown> = {}) {
  const res = await request(app)
    .post(`/api/posts/${postSlug}/comments/${commentId}/replies`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      content: "This is a test reply.",
      ...overrides
    })
  return res.body.reply
}
