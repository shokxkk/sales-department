import bcrypt from 'bcryptjs'
import * as crypto from 'crypto'

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10)
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  if (!hash || !plain) return false

  // 1. If hash is bcrypt ($2a$, $2b$, $2y$)
  if (hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$')) {
    try {
      return await bcrypt.compare(plain, hash)
    } catch (err) {
      console.warn('[Auth/Password] bcrypt compare error:', err)
      return false
    }
  }

  // 2. If hash is argon2 ($argon2id$, $argon2i$)
  if (hash.startsWith('$argon2')) {
    try {
      const argon2 = await import('argon2')
      const isValid = await argon2.verify(hash, plain)
      if (isValid) return true
    } catch {
      // Argon2 native binary failed to load on serverless environment (e.g. Vercel)
    }
  }

  // 3. Fallback check: SHA-256 or direct comparison
  const sha256 = crypto.createHash('sha256').update(plain).digest('hex')
  if (hash === sha256 || hash === plain) {
    return true
  }

  return false
}
