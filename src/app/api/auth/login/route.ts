// POST /api/auth/login
// Authenticates user, returns access token + sets refresh token cookie
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyPassword } from '@/lib/auth/password'
import { prisma } from '@/lib/prisma'
import {
  signAccessToken,
  signRefreshToken,
  expiryStringToDate,
  AccessTokenPayload,
} from '@/lib/auth/jwt'
import { UserRole } from '@prisma/client'

const loginSchema = z.object({
  email: z.string().email('Нотўғри email формати'),
  password: z.string().min(1, 'Парол киритинг'),
  companyId: z.string().uuid().optional(), // Optional: login into specific company
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = loginSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    const { email, password, companyId } = parsed.data

    // Find user with their company memberships
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        companyUsers: {
          where: { isActive: true },
          include: {
            company: { select: { id: true, name: true, status: true } },
          },
        },
      },
    })

    if (!user || !user.isActive) {
      return NextResponse.json(
        { success: false, error: 'Email ёки парол нотўғри' },
        { status: 401 }
      )
    }

    // Verify password safely
    const passwordValid = await verifyPassword(user.passwordHash, password)
    if (!passwordValid) {
      return NextResponse.json(
        { success: false, error: 'Email ёки парол нотўғри' },
        { status: 401 }
      )
    }

    // Determine company context
    let selectedCompanyId: string | null = null
    let selectedRole: UserRole = UserRole.SUPER_ADMIN

    // Check if user is SUPER_ADMIN (no company membership required)
    const isSuperAdmin = user.companyUsers.length === 0 && !companyId

    if (!isSuperAdmin) {
      // Regular user: determine which company to log into
      if (companyId) {
        const membership = user.companyUsers.find((cu) => cu.companyId === companyId)
        if (!membership) {
          return NextResponse.json(
            { success: false, error: 'Бу компанияга рухсат йўқ' },
            { status: 403 }
          )
        }
        if (membership.company.status === 'BLOCKED') {
          return NextResponse.json(
            { success: false, error: 'Компания блокланган' },
            { status: 403 }
          )
        }
        selectedCompanyId = membership.companyId
        selectedRole = membership.role
      } else if (user.companyUsers.length === 1) {
        // Auto-select if user belongs to exactly one company
        const cu = user.companyUsers[0]
        selectedCompanyId = cu.companyId
        selectedRole = cu.role
      } else if (user.companyUsers.length > 1) {
        // Return list of companies to let user choose
        return NextResponse.json({
          success: true,
          requiresCompanySelection: true,
          companies: user.companyUsers.map((cu) => ({
            id: cu.companyId,
            name: cu.company.name,
            role: cu.role,
          })),
        })
      } else {
        return NextResponse.json(
          { success: false, error: 'Компанияга тегишли эмас' },
          { status: 403 }
        )
      }
    }

    // Build token payload
    const tokenPayload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: selectedRole,
      companyId: selectedCompanyId,
    }

    // Sign tokens
    const accessToken = await signAccessToken(tokenPayload)
    const {
      token: refreshToken,
      hash: refreshTokenHash,
    } = await signRefreshToken({
      userId: user.id,
      companyId: selectedCompanyId,
    })

    // Update last login timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    // Set secure HttpOnly refresh token cookie
    const response = NextResponse.json({
      success: true,
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: selectedRole,
        companyId: selectedCompanyId,
        passwordChangeRequired: user.passwordChangeRequired,
      },
    })

    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
      path: '/',
    })

    // Also set access_token in cookie for middleware
    response.cookies.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
      path: '/',
    })

    return response
  } catch (error) {
    console.error('[Auth/Login] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Сервер хатоси' },
      { status: 500 }
    )
  }
}
