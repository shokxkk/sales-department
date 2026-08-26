import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin, authErrorResponse, AuthError } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin(req)

    const tariffs = await prisma.tariff.findMany({
      orderBy: { priceMonthly: 'asc' },
    })

    return NextResponse.json({ success: true, data: tariffs })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    console.error('[API/Admin/Tariffs] Error:', err)
    return NextResponse.json({ success: false, error: 'Сервер хатоси' }, { status: 500 })
  }
}
