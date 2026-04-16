import { Router } from "express";
import authMiddleware from "../middleware/auth.js";
import requireVerified from "../middleware/requireVerified.js";
import {
  getTrendingPosts,
  createPost,
  getFeed,
  getDrafts,
  getSingleDraft,
  getSinglePost,
  updatePost,
  deletePost,
  likePost,
  unlikePost,
  getPostLikes
} from "../controllers/post.controller.js"

const router = Router()
router.route("/")
  .get(getTrendingPosts)
  .post(authMiddleware, requireVerified, createPost)
router.route("/feed").get(authMiddleware, getFeed)
router.route("/me/drafts").get(authMiddleware, getDrafts)
router.route("/me/drafts/:postSlug").get(authMiddleware, getSingleDraft)
router.route("/:postSlug")
  .get(getSinglePost)
  .put(authMiddleware, requireVerified, updatePost)
  .delete(authMiddleware, deletePost)
router.route("/:postSlug/like")
  .post(authMiddleware, requireVerified, likePost)
  .delete(authMiddleware, requireVerified, unlikePost)
router.route("/:postSlug/likes").get(authMiddleware, getPostLikes)

export default router