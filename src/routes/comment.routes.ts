import { Router } from "express";
import authMiddleware from "../middleware/auth.js";
import {
  getPostComments,
  addComment,
  editComment,
  deleteComment
} from "../controllers/comment.controller.js"

const router = Router()

router.route("/:postSlug/comments")
  .get(getPostComments)
  .post(authMiddleware, addComment)
router.route("/:postSlug/comments/:commentId")
  .patch(authMiddleware, editComment)
  .delete(authMiddleware, deleteComment)

export default router