// GET /api/auth/me — Returns current user info from JWT
import { NextRequest, NextResponse } from 'next/server'
import { getTokenPayload } from '@/lib/auth/server'

export async function GET(req: NextRequest) {
  try {
    const payload = await getTokenPayload(req)

    return NextResponse.json({
      success: true,
      user: {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        role: payload.role,
        companyId: payload.companyId,
      },
    })
  } catch {
    return NextResponse.json({ success: false, error: 'Авторизация талаб қилинади' }, { status: 401 })
  }
}
