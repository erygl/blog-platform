import { Router } from "express";
import authMiddleware from "../middleware/auth.js";
import {
  getTrendingPosts,
  createPost
} from "../controllers/post.controller.js"

const router = Router()
router.route("/").get(getTrendingPosts).post(authMiddleware, createPost)

export default router