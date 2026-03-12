import "dotenv/config"

const getEnv = (key: string): string => {
  const value = process.env[key]
  if (!value) throw new Error(`Missing environment variable ${key}`)
  return value
}

export const env = {
  dbUrl: getEnv("MONGO_URI"),
  port: Number(process.env.PORT) || 5000,
  accessTokenSecret: getEnv("ACCESS_TOKEN_SECRET"),
  refreshTokenSecret: getEnv("REFRESH_TOKEN_SECRET"),
}