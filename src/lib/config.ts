import { z } from 'zod'

if (typeof window !== 'undefined') {
  throw new Error('Config file can only be imported on the server-side')
}

const configSchema = z.object({
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  REDIS_URL: z.string().url('REDIS_URL must be a valid URL'),
  ENCRYPTION_KEY: z
    .string()
    .length(64, 'ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)'),
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),
  AMOCRM_CLIENT_ID: z.string().min(1, 'AMOCRM_CLIENT_ID is required'),
  AMOCRM_CLIENT_SECRET: z.string().min(1, 'AMOCRM_CLIENT_SECRET is required'),
  AMOCRM_REDIRECT_URI: z.string().url('AMOCRM_REDIRECT_URI must be a valid URL'),
  ONLINEPBX_API_KEY: z.string().min(1, 'ONLINEPBX_API_KEY is required'),
  ONLINEPBX_WEBHOOK_SECRET: z.string().min(1, 'ONLINEPBX_WEBHOOK_SECRET is required'),
  S3_ENDPOINT: z.string().url('S3_ENDPOINT must be a valid URL'),
  S3_REGION: z.string().min(1, 'S3_REGION is required'),
  S3_BUCKET: z.string().min(1, 'S3_BUCKET is required'),
  S3_ACCESS_KEY_ID: z.string().min(1, 'S3_ACCESS_KEY_ID is required'),
  S3_SECRET_ACCESS_KEY: z.string().min(1, 'S3_SECRET_ACCESS_KEY is required'),
  S3_FORCE_PATH_STYLE: z.preprocess((val) => val === 'true', z.boolean()),
  APP_URL: z.string().url('APP_URL must be a valid URL'),
  APP_MODE: z.enum(['development', 'demo', 'production']).default('production'),
})

export type Config = z.infer<typeof configSchema>

// Clean values for schema validation
const rawEnv = {
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL,
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  AMOCRM_CLIENT_ID: process.env.AMOCRM_CLIENT_ID,
  AMOCRM_CLIENT_SECRET: process.env.AMOCRM_CLIENT_SECRET,
  AMOCRM_REDIRECT_URI: process.env.AMOCRM_REDIRECT_URI,
  ONLINEPBX_API_KEY: process.env.ONLINEPBX_API_KEY,
  ONLINEPBX_WEBHOOK_SECRET: process.env.ONLINEPBX_WEBHOOK_SECRET,
  S3_ENDPOINT: process.env.S3_ENDPOINT,
  S3_REGION: process.env.S3_REGION,
  S3_BUCKET: process.env.S3_BUCKET,
  S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
  S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
  S3_FORCE_PATH_STYLE: process.env.S3_FORCE_PATH_STYLE,
  APP_URL: process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL,
  APP_MODE: process.env.APP_MODE || 'production',
}

const result = configSchema.safeParse(rawEnv)

if (!result.success) {
  const missingKeys = result.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`)
  console.error('❌ Environment configuration error. Missing or invalid keys:')
  missingKeys.forEach((key) => console.error(`  - ${key}`))
  throw new Error('Environment configuration validation failed')
}

// Export parsed config
export const config = result.data
