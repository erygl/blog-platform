import { Router } from "express";
import {
  getPopularTags,
  getTagWithPosts
} from "../controllers/tag.controller.js"

const router = Router()

router.route("/").get(getPopularTags)
router.route("/:tagSlug").get(getTagWithPosts)

export default router