import { describe, it, expect } from "vitest"
import { createAccessToken, verifyAccessToken } from "../../src/utils/token.js"
import { UnauthorizedError } from "../../src/errors/index.js"


describe("accessToken", () => {
  it("should decode token and return the payload", () => {
    const payload = { userId: "123", userRole: "user" as const }
    const token = createAccessToken(payload)
    const decoded = verifyAccessToken(token)

    expect(decoded.userId).toBe("123")
    expect(decoded.userRole).toBe("user")
  })
  it("should return UnAuthorizedError for invalid token", () => {
    expect(() => verifyAccessToken("notValidToken")).toThrow(UnauthorizedError)
  })
})