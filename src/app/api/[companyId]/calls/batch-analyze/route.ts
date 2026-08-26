import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, authErrorResponse, AuthError } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { analyzeCallDirectly } from '@/lib/ai/direct-analyzer'

export async function POST(
  req: NextRequest,
  { params }: { params: { companyId: string } }
) {
  try {
    const { companyId } = params
    await requireAuth(req, { companyId })

    const body = await req.json().catch(() => ({}))
    const limit = Math.min(Number(body.limit || 5), 10)

    // Find recent answered calls with talk duration > 0 that haven't been audited
    const calls = await prisma.call.findMany({
      where: {
        companyId,
        status: 'ANSWERED',
        talkDurationSeconds: { gt: 0 },
        audit: null,
      },
      take: limit,
      orderBy: { startedAt: 'desc' },
    })

    if (calls.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Таҳлил қилиш учун янги қўнғироқлар топилмади',
        analyzedCount: 0,
      })
    }

    const results = []
    for (const call of calls) {
      const res = await analyzeCallDirectly({ callId: call.id, companyId })
      results.push({ callId: call.id, ...res })
    }

    return NextResponse.json({
      success: true,
      message: `${results.filter((r) => r.success).length} та қўнғироқ AI аудит қилинди`,
      analyzedCount: results.filter((r) => r.success).length,
      results,
    })
  } catch (err: any) {
    if (err instanceof AuthError) return authErrorResponse(err)
    console.error('[API/Calls/BatchAnalyze] Error:', err)
    return NextResponse.json({ success: false, error: err.message || 'Сервер хатоси' }, { status: 500 })
  }
}
