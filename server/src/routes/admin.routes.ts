import { Router } from "express"
import {
  getUsers,
  getSingleUser,
  forceUpdateUser,
  forceDeleteUser,
  getPosts,
  getSinglePost,
  forceDeletePost,
  forceDeleteComment,
  getTags,
  createTag,
  updateTag,
  deleteTag,
  getStats
} from "../controllers/admin.controller.js"

const router = Router()
router.route("/users").get(getUsers)
router.route("/users/:userId")
  .get(getSingleUser)
  .patch(forceUpdateUser)
  .delete(forceDeleteUser)
router.route("/posts").get(getPosts)
router.route("/posts/:postId")
  .get(getSinglePost)
  .delete(forceDeletePost)
router.route("/comments/:commentId").delete(forceDeleteComment)
router.route("/tags").get(getTags).post(createTag)
router.route("/tags/:tagId").patch(updateTag).delete(deleteTag)
router.route("/stats").get(getStats)

export default router