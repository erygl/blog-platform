import { s3client } from "../config/s3.js"
import { ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3"
import { env } from "../config/env.js"
import User from "../models/User.js"
import Post from "../models/Post.js"

export const cleanupOrphanImages = async () => {
  try {
    let totalOrphansDeleted = 0
    let continuationToken: string | undefined
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

    // 1. Get all keys from R2 that are older than 24 hours
    do {
      const command = new ListObjectsV2Command({
        Bucket: env.r2BucketName,
        ContinuationToken: continuationToken
      })
      const response = await s3client.send(command)
      const pageKeys = response.Contents
        ?.filter(obj => obj.Key && !!obj.LastModified && obj.LastModified < oneDayAgo)
        .map(obj => obj.Key) ?? []

      const pageUrls = pageKeys.map(k => `${env.r2PublicUrl}/${k}`)

      const [usedAvatars, usedCovers] = await Promise.all([
        User.find({ avatar: { $in: pageUrls } }).select("avatar").lean(),
        Post.find({ coverImage: { $in: pageUrls } }).select("coverImage").lean()
      ])

      const usedUrls = new Set([
        ...usedAvatars.map(u => u.avatar!),
        ...usedCovers.map(p => p.coverImage!)
      ])

      const orphans = pageKeys.filter(k => !usedUrls.has(`${env.r2PublicUrl}/${k}`))
      totalOrphansDeleted += orphans.length

      if (orphans.length > 0) {
        await s3client.send(new DeleteObjectsCommand({
          Bucket: env.r2BucketName,
          Delete: {
            Objects: orphans.map(key => ({ Key: key }))
          }
        }))
      }

      continuationToken = response.IsTruncated
        ? response.NextContinuationToken
        : undefined
    } while (continuationToken)

    console.log(`cleanupOrphanImages: deleted ${totalOrphansDeleted} orphan(s) 
      at ${new Date().toISOString()}`)
  } catch (error) {
    console.error("cleanupOrphanImages failed", error)
  }
}