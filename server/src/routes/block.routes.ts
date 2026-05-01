import { Router } from "express"
import authMiddleware from "../middleware/auth.js"
import requireVerified from "../middleware/requireVerified.js"
import { blockUser, unblockUser, getBlockList } from "../controllers/block.controller.js"

const router = Router()

router.route("/").get(authMiddleware, getBlockList)
router.route("/:username")
  .post(authMiddleware, requireVerified, blockUser)
  .delete(authMiddleware, unblockUser)

export default router
