// GET /api/auth/me — Returns current user info from JWT
import { NextRequest, NextResponse } from 'next/server'
import { getTokenPayload } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'

export async function GET(req: NextRequest) {
  try {
    const payload = await getTokenPayload(req)

    let companyId = payload.companyId

    if (!companyId && payload.role === UserRole.SUPER_ADMIN) {
      const activeCompany = await prisma.company.findFirst({
        where: { status: 'ACTIVE' },
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      })
      if (activeCompany) {
        companyId = activeCompany.id
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        role: payload.role,
        companyId,
      },
    })
  } catch {
    return NextResponse.json({ success: false, error: 'Авторизация талаб қилинади' }, { status: 401 })
  }
}

