// ─────────────────────────────────────────────────────────────────
//  Server-side auth helpers
//  - Extract user from request (access token in Authorization header)
//  - Validate company membership and role
//  - Multi-tenant guard: companyId in URL must match user's context
// ─────────────────────────────────────────────────────────────────
import { NextRequest } from 'next/server'
import { verifyAccessToken, AccessTokenPayload } from './jwt'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'

export class AuthError extends Error {
  constructor(
    public message: string,
    public status: number = 401
  ) {
    super(message)
    this.name = 'AuthError'
  }
}

/**
 * Extract and verify JWT from Authorization: Bearer <token>
 */
export async function getTokenPayload(
  req: NextRequest
): Promise<AccessTokenPayload> {
  const authHeader = req.headers.get('authorization')
  const cookieToken = req.cookies.get('access_token')?.value

  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : cookieToken

  if (!token) {
    throw new AuthError('Авторизация талаб қилинади', 401)
  }

  try {
    return await verifyAccessToken(token)
  } catch {
    throw new AuthError('Токен муддати тугаган ёки нотўғри', 401)
  }
}

/**
 * Full authentication + multi-tenant guard
 *
 * Validates:
 * 1. JWT is valid
 * 2. User exists and is active
 * 3. User belongs to the requested company (unless SUPER_ADMIN)
 * 4. User has required role (if specified)
 * 5. Company exists and is not blocked
 */
export async function requireAuth(
  req: NextRequest,
  options: {
    companyId?: string      // Route param company ID — must match
    allowedRoles?: UserRole[]
    allowSuperAdmin?: boolean  // SUPER_ADMIN bypasses company check
  } = {}
): Promise<AccessTokenPayload & { userId: string }> {
  const payload = await getTokenPayload(req)
  const userId = payload.sub

  // Load user from DB to verify they're still active
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isActive: true, email: true },
  })

  if (!user || !user.isActive) {
    throw new AuthError('Фойдаланувчи топилмади ёки блокланган', 401)
  }

  // SUPER_ADMIN has global access (no company restriction)
  if (payload.role === UserRole.SUPER_ADMIN) {
    const { allowSuperAdmin = true } = options
    if (!allowSuperAdmin) {
      throw new AuthError('Рухсат йўқ', 403)
    }
    return { ...payload, userId }
  }

  // For company-scoped routes: validate company membership
  if (options.companyId) {
    const requestedCompanyId = options.companyId

    // The user's session company must match the route's company
    if (payload.companyId !== requestedCompanyId) {
      throw new AuthError('Бошқа компанияга кириш рухсати йўқ', 403)
    }

    // Verify DB-level membership (double-check session isn't stale)
    const membership = await prisma.companyUser.findUnique({
      where: {
        userId_companyId: {
          userId,
          companyId: requestedCompanyId,
        },
      },
      include: {
        company: { select: { status: true } },
      },
    })

    if (!membership || !membership.isActive) {
      throw new AuthError('Компанияга рухсат йўқ', 403)
    }

    if (membership.company.status === 'BLOCKED') {
      throw new AuthError('Компания блокланган', 403)
    }

    // Check role if required
    if (options.allowedRoles && !options.allowedRoles.includes(payload.role)) {
      throw new AuthError('Бу амал учун рол рухсати йўқ', 403)
    }
  }

  return { ...payload, userId }
}

/**
 * SUPER_ADMIN only guard
 */
export async function requireSuperAdmin(
  req: NextRequest
): Promise<AccessTokenPayload & { userId: string }> {
  const payload = await getTokenPayload(req)

  if (payload.role !== UserRole.SUPER_ADMIN) {
    throw new AuthError('Фақат бош администратор учун', 403)
  }

  return { ...payload, userId: payload.sub }
}

/**
 * Role hierarchy check
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.SUPER_ADMIN]: 100,
  [UserRole.COMPANY_ADMIN]: 80,
  [UserRole.OWNER]: 70,
  [UserRole.SALES_DIRECTOR]: 60,
  [UserRole.QUALITY_CONTROL]: 40,
}

export function hasMinRole(userRole: UserRole, minRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole]
}

/**
 * Standard API error response
 */
export function authErrorResponse(error: AuthError) {
  return Response.json(
    { success: false, error: error.message },
    { status: error.status }
  )
}
