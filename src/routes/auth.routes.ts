import { Router } from "express";
import authMiddleware from "../middleware/auth.js";
import {
  register,
  login,
  logout,
  verifyEmail,
  forgottenPassword,
  resetPassword
} from "../controllers/auth.controller.js"

const router = Router()

router.route("/register").post(register)
router.route("/login").post(login)
router.route("/logout").post(authMiddleware, logout)
router.route("/verify-email").get(verifyEmail)
router.route("/forgotten-password").post(forgottenPassword)
router.route("/reset-password").post(resetPassword)

export default router