import { Router } from "express";
import authMiddleware from "../middleware/auth.js";
import {
  updateProfile,
  updateEmail,
  updatePassword
} from "../controllers/user.controller.js"

const router = Router()

router.route("/me").patch(authMiddleware, updateProfile)
router.route("/me/email").patch(authMiddleware, updateEmail)
router.route("/me/password").patch(authMiddleware, updatePassword)

export default router