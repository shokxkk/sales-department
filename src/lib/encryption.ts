// ─────────────────────────────────────────────────────────────────
//  AES-256-GCM encryption for CRM/telephony tokens at rest
//  Key: 32-byte hex string from ENCRYPTION_KEY env var
// ─────────────────────────────────────────────────────────────────
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key || key.length !== 64) {
    throw new Error(
      'ENCRYPTION_KEY must be a 64-character hex string (32 bytes). ' +
        'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    )
  }
  return Buffer.from(key, 'hex')
}

/**
 * Encrypts plaintext using AES-256-GCM
 * Returns: "iv:authTag:ciphertext" (all hex-encoded)
 */
export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(12) // 96-bit IV for GCM
  const cipher = createCipheriv(ALGORITHM, key, iv)

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])

  const authTag = cipher.getAuthTag()

  return [iv.toString('hex'), authTag.toString('hex'), encrypted.toString('hex')].join(':')
}

/**
 * Decrypts a value produced by encrypt()
 */
export function decrypt(stored: string): string {
  const key = getKey()
  const parts = stored.split(':')

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted value format')
  }

  const [ivHex, authTagHex, ciphertextHex] = parts
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const ciphertext = Buffer.from(ciphertextHex, 'hex')

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])

  return decrypted.toString('utf8')
}

/**
 * Encrypt a JSON-serializable object
 */
export function encryptJson(obj: unknown): string {
  return encrypt(JSON.stringify(obj))
}

/**
 * Decrypt and parse a JSON-encrypted value
 */
export function decryptJson<T = Record<string, unknown>>(stored: string): T {
  return JSON.parse(decrypt(stored)) as T
}
