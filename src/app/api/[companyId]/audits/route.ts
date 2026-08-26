import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, authErrorResponse, AuthError } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: { companyId: string } }
) {
  try {
    const { companyId } = params
    await requireAuth(req, { companyId })

    const { searchParams } = new URL(req.url)
    const managerId = searchParams.get('managerId') || undefined
    const dateFrom = searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined
    const dateTo = searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined

    const audits = await prisma.audit.findMany({
      where: {
        companyId,
        ...(managerId && {
          call: { managerId },
        }),
        ...(dateFrom || dateTo
          ? {
              createdAt: {
                ...(dateFrom && { gte: dateFrom }),
                ...(dateTo && { lte: dateTo }),
              },
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        callId: true,
        aiScore: true,
        finalScore: true,
        maxPossibleScore: true,
        callType: true,
        hasCriticalFails: true,  // OKK: critical fail badge
        callResult: true,         // OKK: call outcome
        saleProbability: true,
        createdAt: true,
        updatedAt: true,
        call: {
          select: {
            customerPhone: true,
            talkDurationSeconds: true,
            analysisStatus: true,
            manager: { select: { name: true } },
            customer: { select: { name: true } },
          },
        },
      },
    })

    return NextResponse.json({ success: true, data: audits })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    console.error('[API/Audits] Error:', err)
    return NextResponse.json({ success: false, error: 'Сервер хатоси' }, { status: 500 })
  }
}
