import { Router } from "express";
import optionalAuth from "../middleware/optionalAuth.js";
import {
  getPopularTags,
  getTagWithPosts
} from "../controllers/tag.controller.js"

const router = Router()

router.route("/").get(getPopularTags)
router.route("/:tagSlug").get(optionalAuth, getTagWithPosts)

export default router