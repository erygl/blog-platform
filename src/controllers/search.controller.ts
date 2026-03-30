import type { Request, Response } from "express"
import * as searchValidation from "../validations/search.validation.js"
import * as searchService from "../services/search.service.js"

const search = async (req: Request, res: Response) => {
  const { q, type } = searchValidation.searchSchema.parse(req.query)
  const page = Number(req.query.page) || 1
  const limit = Number(req.query.limit) || 10
  const { results, hasMore } = await searchService.search(type, q, page, limit)
  res.status(200).json({ results, hasMore })
}

export { search }