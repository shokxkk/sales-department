import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, authErrorResponse, AuthError } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'

function getPeriodRange(period: string | null): { gte: Date; lte: Date } | null {
  const now = new Date()
  const lte = new Date(now)
  if (period === 'today') {
    const gte = new Date(now); gte.setHours(0, 0, 0, 0); lte.setHours(23, 59, 59, 999)
    return { gte, lte }
  }
  if (period === '7d') { const gte = new Date(now); gte.setDate(gte.getDate() - 7); return { gte, lte } }
  if (period === 'month') { return { gte: new Date(now.getFullYear(), now.getMonth(), 1), lte } }
  const gte = new Date(now); gte.setDate(gte.getDate() - 30); return { gte, lte }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { companyId: string } }
) {
  try {
    const { companyId } = params
    await requireAuth(req, { companyId })

    const period = req.nextUrl.searchParams.get('period') || '30d'
    const dateRange = getPeriodRange(period)

    // ─── 1. Refusal reasons from CRM (RefusalReason table) ───────
    const crmRefusalReasons = await prisma.refusalReason.findMany({
      where: { companyId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })

    // Count of lost deals per refusal reason in period
    const dealRefusalStats = await prisma.deal.groupBy({
      by: ['refusalReasonId'],
      where: {
        companyId,
        status: 'lost',
        refusalReasonId: { not: null },
        ...(dateRange ? { crmCreatedAt: dateRange } : {}),
      },
      _count: { id: true },
      _sum: { budget: true },
      orderBy: { _count: { id: 'desc' } },
    })

    const reasonNameMap = new Map(crmRefusalReasons.map((r) => [r.id, r.name]))
    const totalCrmRefusals = dealRefusalStats.reduce((s, r) => s + r._count.id, 0)

    const crmRefusals = dealRefusalStats
      .filter((r) => r.refusalReasonId)
      .map((r) => ({
        id: r.refusalReasonId!,
        name: reasonNameMap.get(r.refusalReasonId!) ?? '—',
        count: r._count.id,
        lostRevenue: Number(r._sum?.budget ?? 0),
        share: totalCrmRefusals > 0 ? Math.round((r._count.id / totalCrmRefusals) * 100) : 0,
      }))

    // ─── 2. Lost deals WITHOUT refusal reason ────────────────────
    const lostNoReason = await prisma.deal.count({
      where: {
        companyId,
        status: 'lost',
        refusalReasonId: null,
        ...(dateRange ? { crmCreatedAt: dateRange } : {}),
      },
    })

    // ─── 3. Total lost deals ──────────────────────────────────────
    const totalLostDeals = await prisma.deal.count({
      where: {
        companyId,
        status: 'lost',
        ...(dateRange ? { crmCreatedAt: dateRange } : {}),
      },
    })

    // ─── 4. Total won deals (for context) ─────────────────────────
    const totalWonDeals = await prisma.deal.count({
      where: {
        companyId,
        status: 'won',
        ...(dateRange ? { crmCreatedAt: dateRange } : {}),
      },
    })

    // ─── 5. AI-detected refusal categories from Audit ────────────
    // Audits where refusalCategory is set (AI detected reason in transcript)
    const auditRefusals = await prisma.audit.groupBy({
      by: ['refusalCategory'],
      where: {
        companyId,
        refusalCategory: { not: null },
        ...(dateRange ? { createdAt: dateRange } : {}),
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    })

    const totalAiRefusals = auditRefusals.reduce((s, r) => s + r._count.id, 0)
    const aiRefusals = auditRefusals
      .filter((r) => r.refusalCategory)
      .map((r) => ({
        category: r.refusalCategory!,
        count: r._count.id,
        share: totalAiRefusals > 0 ? Math.round((r._count.id / totalAiRefusals) * 100) : 0,
      }))

    // ─── 6. Refusal trend by week ─────────────────────────────────
    const lostByDay = await prisma.deal.findMany({
      where: {
        companyId,
        status: 'lost',
        crmCreatedAt: { not: null },
        ...(dateRange ? { crmCreatedAt: dateRange } : {}),
      },
      select: { crmCreatedAt: true },
      orderBy: { crmCreatedAt: 'asc' },
    })

    // Group by week
    const weekMap = new Map<string, number>()
    lostByDay.forEach((d) => {
      if (!d.crmCreatedAt) return
      const week = d.crmCreatedAt.toISOString().slice(0, 10)
      weekMap.set(week, (weekMap.get(week) ?? 0) + 1)
    })
    const trend = [...weekMap.entries()].map(([date, count]) => ({ date, count }))

    // ─── 7. Lost revenue ──────────────────────────────────────────
    const lostRevenueAgg = await prisma.deal.aggregate({
      where: {
        companyId,
        status: 'lost',
        budget: { gt: 0 },
        ...(dateRange ? { crmCreatedAt: dateRange } : {}),
      },
      _sum: { budget: true },
    })

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalLostDeals,
          totalWonDeals,
          totalDeals: totalLostDeals + totalWonDeals,
          lostRevenue: Number(lostRevenueAgg._sum?.budget ?? 0),
          lostWithReason: totalCrmRefusals,
          lostNoReason,
          period,
        },
        crmRefusals,          // From CRM refusal_reasons linked to lost deals
        aiRefusals,           // From AI audit analysis (refusalCategory field)
        trend,                // Daily lost deal count for chart
      },
    })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    console.error('[API/Refusals] Error:', err)
    return NextResponse.json({ success: false, error: 'Сервер хатоси' }, { status: 500 })
  }
}
