import { Router } from "express";
import authMiddleware from "../middleware/auth.js";
import {
  getTrendingPosts,
  createPost,
  getFeed,
  getDrafts,
  getSingleDraft,
  getSinglePost,
  updatePost
} from "../controllers/post.controller.js"

const router = Router()
router.route("/").get(getTrendingPosts).post(authMiddleware, createPost)
router.route("/feed").get(authMiddleware, getFeed)
router.route("/me/drafts").get(authMiddleware, getDrafts)
router.route("/me/drafts/:postSlug").get(authMiddleware, getSingleDraft)
router.route("/:postSlug")
  .get(getSinglePost)
  .put(authMiddleware, updatePost)

export default router