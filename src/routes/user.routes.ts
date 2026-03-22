import { Router } from "express";
import authMiddleware from "../middleware/auth.js";
import {
  getMyProfile,
  updateProfile,
  deleteMyProfile,
  updateEmail,
  updatePassword
} from "../controllers/user.controller.js"

const router = Router()

router.route("/me")
  .get(authMiddleware, getMyProfile)
  .patch(authMiddleware, updateProfile)
  .delete(authMiddleware, deleteMyProfile)
router.route("/me/email").patch(authMiddleware, updateEmail)
router.route("/me/password").patch(authMiddleware, updatePassword)

export default router