import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin, authErrorResponse, AuthError } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin(req)

    const jobs = await prisma.backgroundJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return NextResponse.json({ success: true, data: jobs })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    console.error('[API/Admin/Monitor] Error:', err)
    return NextResponse.json({ success: false, error: 'Сервер хатоси' }, { status: 500 })
  }
}
