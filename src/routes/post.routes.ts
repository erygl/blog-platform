import { Router } from "express";
import authMiddleware from "../middleware/auth.js";
import {
  getTrendingPosts,
  createPost,
  getFeed,
  getDrafts
} from "../controllers/post.controller.js"

const router = Router()
router.route("/").get(getTrendingPosts).post(authMiddleware, createPost)
router.route("/feed").get(authMiddleware, getFeed)
router.route("/me/drafts").get(authMiddleware, getDrafts)

export default router