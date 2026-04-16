import { Router } from "express";
import authMiddleware from "../middleware/auth.js";
import requireVerified from "../middleware/requireVerified.js";
import {
  getMyProfile,
  updateProfile,
  deleteMyProfile,
  getLikedPosts,
  updateEmail,
  updatePassword,
  getPublicProfile,
  getPostsByUsername,
  followUser,
  unfollowUser,
  getFollowersList,
  getFollowingList
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
router.route("/:username/follow")
  .post(authMiddleware, requireVerified, followUser)
  .delete(authMiddleware, unfollowUser)
router.route("/:username/followers").get(authMiddleware, getFollowersList)
router.route("/:username/following").get(authMiddleware, getFollowingList)

export default router