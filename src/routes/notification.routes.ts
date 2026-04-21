import { Router } from "express";
import authMiddleware from "../middleware/auth.js";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  streamNotifications,
  getUnreadCount
} from "../controllers/notification.controller.js"
const router = Router()

router.route("/").get(authMiddleware, getNotifications)
router.route("/unread-count").get(authMiddleware, getUnreadCount)
router.route("/read-all").patch(authMiddleware, markAllAsRead)
router.route("/stream").get(authMiddleware, streamNotifications)
router.route("/:notificationId/read").patch(authMiddleware, markAsRead)

export default router