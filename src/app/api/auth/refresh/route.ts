// POST /api/auth/refresh
// Rotates refresh token and issues new access token
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  verifyRefreshToken,
  signAccessToken,
  signRefreshToken,
  hashToken,
  expiryStringToDate,
  AccessTokenPayload,
} from '@/lib/auth/jwt'
import { UserRole } from '@prisma/client'

export async function POST(req: NextRequest) {
  try {
    const refreshToken = req.cookies.get('refresh_token')?.value

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, error: 'Refresh token топилмади' },
        { status: 401 }
      )
    }

    // Verify the JWT signature
    let payload
    try {
      payload = await verifyRefreshToken(refreshToken)
    } catch {
      return NextResponse.json(
        { success: false, error: 'Refresh token муддати тугаган' },
        { status: 401 }
      )
    }

    const tokenHash = hashToken(refreshToken)

    // Look up in DB — must exist and not be revoked
    const storedToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            companyUsers: {
              where: {
                companyId: payload.companyId || undefined,
                isActive: true,
              },
            },
          },
        },
      },
    })

    if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Refresh token нотўғри ёки бекор қилинган' },
        { status: 401 }
      )
    }

    const { user } = storedToken

    if (!user.isActive) {
      return NextResponse.json(
        { success: false, error: 'Фойдаланувчи блокланган' },
        { status: 401 }
      )
    }

    // Determine role for new token
    let role: UserRole = UserRole.SUPER_ADMIN
    if (payload.companyId && user.companyUsers.length > 0) {
      role = user.companyUsers[0].role
    }

    // Build new access token payload
    const tokenPayload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role,
      companyId: payload.companyId,
    }

    const newAccessToken = await signAccessToken(tokenPayload)
    const {
      token: newRefreshToken,
      hash: newRefreshTokenHash,
    } = await signRefreshToken({
      userId: user.id,
      companyId: payload.companyId,
    })

    const expiresAt = expiryStringToDate(process.env.JWT_REFRESH_EXPIRES_IN || '7d')

    // Rotate: revoke old, create new
    await prisma.$transaction([
      prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revokedAt: new Date() },
      }),
      prisma.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: newRefreshTokenHash,
          companyId: payload.companyId,
          expiresAt,
          ipAddress: req.headers.get('x-forwarded-for'),
          userAgent: req.headers.get('user-agent'),
        },
      }),
    ])

    const response = NextResponse.json({
      success: true,
      accessToken: newAccessToken,
    })

    response.cookies.set('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    response.cookies.set('access_token', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 15,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('[Auth/Refresh] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Сервер хатоси' },
      { status: 500 }
    )
  }
}
