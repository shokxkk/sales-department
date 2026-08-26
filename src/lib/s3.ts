// ─────────────────────────────────────────────────────────────────
//  S3-compatible storage — provider-agnostic (MinIO, R2, AWS S3)
//  All configuration via environment variables only
// ─────────────────────────────────────────────────────────────────
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

let s3Client: S3Client | null = null

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION || 'auto',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    })
  }
  return s3Client
}

const BUCKET = () => {
  const b = process.env.S3_BUCKET
  if (!b) throw new Error('S3_BUCKET environment variable is not set')
  return b
}

const SIGNED_URL_EXPIRES = () =>
  parseInt(process.env.S3_SIGNED_URL_EXPIRES || '900', 10)

/**
 * Upload a file buffer to S3-compatible storage
 * Returns the S3 object key
 */
export async function uploadAudio(params: {
  key: string
  body: Buffer
  mimeType?: string
  companyId: string
}): Promise<string> {
  const client = getS3Client()

  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET(),
      Key: params.key,
      Body: params.body,
      ContentType: params.mimeType || 'audio/wav',
      // Server-side encryption only in production
      ...(process.env.NODE_ENV === 'production' && { ServerSideEncryption: 'AES256' }),
      // Tag for lifecycle management
      Tagging: `company=${params.companyId}`,
    })
  )

  return params.key
}

/**
 * Generate a time-limited pre-signed URL for private audio playback
 * Default: 15 minutes (900 seconds)
 */
export async function getAudioSignedUrl(key: string): Promise<string> {
  const client = getS3Client()

  const command = new GetObjectCommand({
    Bucket: BUCKET(),
    Key: key,
  })

  return getSignedUrl(client, command, {
    expiresIn: SIGNED_URL_EXPIRES(),
  })
}

/**
 * Delete an audio file from S3
 */
export async function deleteAudio(key: string): Promise<void> {
  const client = getS3Client()

  await client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET(),
      Key: key,
    })
  )
}

/**
 * Check if a file exists and get its metadata
 */
export async function getAudioMeta(key: string): Promise<{
  exists: boolean
  size?: number
  contentType?: string
}> {
  const client = getS3Client()

  try {
    const result = await client.send(
      new HeadObjectCommand({
        Bucket: BUCKET(),
        Key: key,
      })
    )

    return {
      exists: true,
      size: result.ContentLength,
      contentType: result.ContentType,
    }
  } catch {
    return { exists: false }
  }
}

/**
 * Build the S3 object key for a call recording
 * Format: {companyId}/recordings/{year}/{month}/{callId}.{ext}
 */
export function buildAudioKey(params: {
  companyId: string
  callId: string
  extension?: string
}): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const ext = params.extension || 'wav'

  return `${params.companyId}/recordings/${year}/${month}/${params.callId}.${ext}`
}
