// ─────────────────────────────────────────────────────────────────
//  JWT Auth — Access + Refresh tokens
//  Access token: 15 min (short-lived, stateless)
//  Refresh token: 7 days (stored hash in DB for rotation/revocation)
// ─────────────────────────────────────────────────────────────────
import { SignJWT, jwtVerify } from 'jose'
import { createHash, randomBytes } from 'crypto'
import { UserRole } from '@prisma/client'

// ─── Types ────────────────────────────────────────────────────────

export interface AccessTokenPayload {
  sub: string       // userId
  email: string
  name: string
  role: UserRole
  companyId: string | null  // null for SUPER_ADMIN without company context
  iat?: number
  exp?: number
}

export interface RefreshTokenPayload {
  sub: string       // userId
  jti: string       // unique token ID (matches DB)
  companyId: string | null
  iat?: number
  exp?: number
}

// ─── Keys ─────────────────────────────────────────────────────────

function getAccessKey(): Uint8Array {
  const secret = process.env.JWT_ACCESS_SECRET
  if (!secret) throw new Error('JWT_ACCESS_SECRET is not set')
  return new TextEncoder().encode(secret)
}

function getRefreshKey(): Uint8Array {
  const secret = process.env.JWT_REFRESH_SECRET
  if (!secret) throw new Error('JWT_REFRESH_SECRET is not set')
  return new TextEncoder().encode(secret)
}

// ─── Access Token ─────────────────────────────────────────────────

export async function signAccessToken(payload: AccessTokenPayload): Promise<string> {
  const expiresIn = process.env.JWT_ACCESS_EXPIRES_IN || '7d'

  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getAccessKey())
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, getAccessKey())
  return payload as unknown as AccessTokenPayload
}

// ─── Refresh Token ────────────────────────────────────────────────

export async function signRefreshToken(params: {
  userId: string
  companyId: string | null
}): Promise<{ token: string; jti: string; hash: string }> {
  const jti = randomBytes(32).toString('hex')
  const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d'

  const token = await new SignJWT({ sub: params.userId, jti, companyId: params.companyId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getRefreshKey())

  // Only store hash in DB — never the raw token
  const hash = hashToken(token)

  return { token, jti, hash }
}

export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
  const { payload } = await jwtVerify(token, getRefreshKey())
  return payload as unknown as RefreshTokenPayload
}

// ─── Utilities ────────────────────────────────────────────────────

/**
 * SHA-256 hash of a token — stored in DB instead of plaintext
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Parse expiry string to Date for DB storage
 */
export function expiryStringToDate(expiresIn: string): Date {
  const now = Date.now()
  const match = expiresIn.match(/^(\d+)([smhd])$/)
  if (!match) throw new Error(`Invalid expiry format: ${expiresIn}`)

  const [, amount, unit] = match
  const ms = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  }[unit as 's' | 'm' | 'h' | 'd']!

  return new Date(now + parseInt(amount) * ms)
}
