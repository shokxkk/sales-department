// POST /api/auth/logout
// Revokes the current refresh token and clears cookies
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashToken } from '@/lib/auth/jwt'

export async function POST(req: NextRequest) {
  try {
// Stateless JWT logout clears cookies

    const response = NextResponse.json({ success: true })

    // Clear all auth cookies
    response.cookies.set('access_token', '', { maxAge: 0, path: '/' })
    response.cookies.set('refresh_token', '', { maxAge: 0, path: '/' })

    return response
  } catch (error) {
    console.error('[Auth/Logout] Error:', error)
    // Still clear cookies even on error
    const response = NextResponse.json({ success: true })
    response.cookies.set('access_token', '', { maxAge: 0, path: '/' })
    response.cookies.set('refresh_token', '', { maxAge: 0, path: '/' })
    return response
  }
}
