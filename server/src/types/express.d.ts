import "express"
import type { AccessTokenPayload } from "../utils/token.js"

declare module "express" {
  interface Request {
    user?: AccessTokenPayload
  }
}
