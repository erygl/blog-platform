export const estimatedReadTime = (content: string): number => {
  const wordCount = content.trim().split(/\s+/).length
  return Math.ceil(wordCount / 200)
}
