import { Router } from "express";
import optionalAuth from "../middleware/optionalAuth.js";
import { search } from "../controllers/search.controller.js"

const router = Router()
router.route("/").get(optionalAuth, search)

export default router