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
  verificationTokenSecret: getEnv("VERIFICATION_TOKEN_SECRET"),
  resendApiKey: getEnv("RESEND_API_KEY"),
  appUrl: getEnv("APP_URL"),
  r2AccountId: getEnv("R2_ACCOUNT_ID"),
  r2AccessKeyId: getEnv("R2_ACCESS_KEY_ID"),
  r2SecretAccessKey: getEnv("R2_SECRET_ACCESS_KEY"),
  r2BucketName: getEnv("R2_BUCKET_NAME"),
  r2PublicUrl: getEnv("R2_PUBLIC_URL"),
}