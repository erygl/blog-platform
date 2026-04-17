import { Router } from "express";
import authMiddleware from "../middleware/auth.js";
import requireVerified from "../middleware/requireVerified.js";
import {
  addBookmark,
  removeBookmark,
  getBookmarks
} from "../controllers/bookmark.controller.js"

const router = Router()
router.route("/").get(authMiddleware, getBookmarks)
router.route("/:postSlug")
  .post(authMiddleware, requireVerified, addBookmark)
  .delete(authMiddleware, requireVerified, removeBookmark)

export default router