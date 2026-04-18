export const encode = (data: object) => {
  return Buffer.from(JSON.stringify(data)).toString("base64url")
}

export const decode = <T>(cursor: string) => {
  return JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as T
}

export const paginate = <T extends { _id: unknown }>(
  items: T[],
  limit: number,
  cursorKeyFn: (last: T) => object
) => {
  const hasMore = items.length > limit
  const sliced = items.slice(0, limit)
  const last = sliced[sliced.length - 1]
  const nextCursor = hasMore && last ? encode(cursorKeyFn(last)) : undefined
  return { data: sliced, hasMore, nextCursor }
}