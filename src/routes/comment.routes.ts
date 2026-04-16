import { Router } from "express";
import authMiddleware from "../middleware/auth.js";
import requireVerified from "../middleware/requireVerified.js";
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
  .post(authMiddleware, requireVerified, addComment)
router.route("/:postSlug/comments/:commentId")
  .patch(authMiddleware, requireVerified, editComment)
  .delete(authMiddleware, deleteComment)
router.route("/:postSlug/comments/:commentId/like")
  .post(authMiddleware, requireVerified, likeComment)
  .delete(authMiddleware, requireVerified, unlikeComment)
router.route("/:postSlug/comments/:commentId/likes")
  .get(authMiddleware, getCommentLikes)
router.route("/:postSlug/comments/:commentId/replies")
  .get(getCommentReplies)
  .post(authMiddleware, requireVerified, addReply)
  
export default router