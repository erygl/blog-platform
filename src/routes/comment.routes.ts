import { Router } from "express";
import authMiddleware from "../middleware/auth.js";
import {
  getPostComments,
  addComment,
  editComment,
  deleteComment,
  likeComment,
  unlikeComment,
  getCommentLikes,
  getCommentReplies,
  addReply
} from "../controllers/comment.controller.js"

const router = Router()

router.route("/:postSlug/comments")
  .get(getPostComments)
  .post(authMiddleware, addComment)
router.route("/:postSlug/comments/:commentId")
  .patch(authMiddleware, editComment)
  .delete(authMiddleware, deleteComment)
router.route("/:postSlug/comments/:commentId/like")
  .post(authMiddleware, likeComment)
  .delete(authMiddleware, unlikeComment)
router.route("/:postSlug/comments/:commentId/likes")
  .get(authMiddleware, getCommentLikes)
router.route("/:postSlug/comments/:commentId/replies")
  .get(getCommentReplies)
  .post(authMiddleware, addReply)
  
export default router