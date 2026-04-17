import { Router } from "express"
import { getPresignedUrl } from "../controllers/upload.controller.js"
import authMiddleware from "../middleware/auth.js"
import requireVerified from "../middleware/requireVerified.js"

const router = Router()
router.route("/").post(authMiddleware, requireVerified, getPresignedUrl)

export default router