import { Router } from "express";
import { search } from "../controllers/search.controller.js"

const router = Router()
router.route("/").get(search)

export default router