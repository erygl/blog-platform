import { PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { env } from "../config/env.js"
import { s3client } from "../config/s3.js"

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/webp": "webp"
}

export const getPreSignedUploadUrl = async (
  contentType: string,
  contentLength: number
) => {
  const randomId = crypto.randomUUID()
  const key = `images/${randomId}.${EXTENSIONS[contentType]}`

  const command = new PutObjectCommand({
    Bucket: env.r2BucketName,
    Key: key,
    ContentType: contentType,
    ContentLength: contentLength
  })

  const uploadUrl = await getSignedUrl(s3client, command, { expiresIn: 300 })
  const publicUrl = `${env.r2PublicUrl}/${key}`
  return { uploadUrl, publicUrl }
}