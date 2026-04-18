export const encode = (data: object) => {
  return Buffer.from(JSON.stringify(data)).toString("base64url")
}

export const decode = <T>(cursor: string) => {
  return JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as T
}