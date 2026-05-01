import type { Request, Response } from "express"
import { getPreSignedUploadUrl } from "../services/upload.service.js"
import { getPresignedUrlSchema } from "../validations/upload.validation.js"

const getPresignedUrl = async (req: Request, res: Response) => {
  const { contentType, contentLength } = getPresignedUrlSchema.parse(req.body)
  const { uploadUrl, publicUrl } = await getPreSignedUploadUrl(contentType, contentLength)
  res.status(200).json({ uploadUrl, publicUrl })
}

export { getPresignedUrl }