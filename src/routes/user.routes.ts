import { Router } from "express";
import authMiddleware from "../middleware/auth.js";
import {
  getMyProfile,
  updateProfile,
  deleteMyProfile,
  getLikedPosts,
  updateEmail,
  updatePassword,
  getPublicProfile,
  getPostsByUsername
} from "../controllers/user.controller.js"

const router = Router()

router.route("/me")
  .get(authMiddleware, getMyProfile)
  .patch(authMiddleware, updateProfile)
  .delete(authMiddleware, deleteMyProfile)
router.route("/me/likes").get(authMiddleware, getLikedPosts)
router.route("/me/email").patch(authMiddleware, updateEmail)
router.route("/me/password").patch(authMiddleware, updatePassword)
router.route("/:username").get(getPublicProfile)
router.route("/:username/posts").get(getPostsByUsername)

export default router