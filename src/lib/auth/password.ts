import * as crypto from 'crypto'

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  if (!hash || !plain) return false

  // 1. Try argon2 dynamic import (may fail on Vercel Serverless if native binaries missing)
  try {
    const argon2 = await import('argon2')
    const isValid = await argon2.verify(hash, plain)
    if (isValid) return true
  } catch (err) {
    console.warn('[Auth/Password] Argon2 verify failed on runtime, falling back:', err)
  }

  // 2. Fallback check: SHA-256 or direct comparison
  const sha256 = crypto.createHash('sha256').update(plain).digest('hex')
  if (hash === sha256 || hash === plain) {
    return true
  }

  return false
}

export async function hashPassword(plain: string): Promise<string> {
  try {
    const argon2 = await import('argon2')
    return await argon2.hash(plain)
  } catch (err) {
    console.warn('[Auth/Password] Argon2 hash failed, using SHA-256 fallback:', err)
    return crypto.createHash('sha256').update(plain).digest('hex')
  }
}
