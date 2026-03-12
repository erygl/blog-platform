import { Router } from "express";
import authMiddleware from "../middleware/auth.js";
import {
  register,
  login,
  logout,
  verifyEmail
} from "../controllers/auth.controller.js"

const router = Router()

router.route("/register").post(register)
router.route("/login").post(login)
router.route("/logout").post(authMiddleware, logout)
router.route("/verify-email").get(verifyEmail)

export default router