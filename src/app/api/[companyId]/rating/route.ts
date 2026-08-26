import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, authErrorResponse, AuthError } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'

// ─── Rating weights (adjustable per company in future) ────────────
const WEIGHTS = {
  sales: 0.35,       // Conversion rate (deals won / total deals)
  revenue: 0.25,     // Revenue share among team
  audit: 0.25,       // Average audit score (0–100)
  activity: 0.15,    // Call activity (answered calls / avg)
} as const

function getPeriodRange(period: string | null): { gte: Date; lte: Date } | null {
  const now = new Date()
  const lte = new Date(now)
  if (period === 'today') { const gte = new Date(now); gte.setHours(0, 0, 0, 0); lte.setHours(23, 59, 59, 999); return { gte, lte } }
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
    const callDateFilter = dateRange ? { startedAt: dateRange } : {}
    const dealDateFilter = dateRange ? { crmCreatedAt: dateRange } : {}

    // ─── Get all active managers ───────────────────────────────────
    const managers = await prisma.manager.findMany({
      where: { companyId, isActive: true },
      select: { id: true, name: true, position: true },
      orderBy: { name: 'asc' },
    })

    if (managers.length === 0) {
      return NextResponse.json({ success: true, data: [], weights: WEIGHTS, period })
    }

    const mIds = managers.map((m) => m.id)

    // ─── Batch aggregate all metrics ──────────────────────────────
    const [
      callCounts,
      answeredCounts,
      auditScores,
      wonDeals,
      allDeals,
      revenues,
    ] = await Promise.all([
      prisma.call.groupBy({ by: ['managerId'], where: { companyId, managerId: { in: mIds }, ...callDateFilter }, _count: { id: true } }),
      prisma.call.groupBy({ by: ['managerId'], where: { companyId, managerId: { in: mIds }, status: 'ANSWERED', ...callDateFilter }, _count: { id: true } }),
      prisma.call.groupBy({ by: ['managerId'], where: { companyId, managerId: { in: mIds }, analysisStatus: 'COMPLETED', ...callDateFilter }, _avg: { aiScore: true }, _count: { id: true } }),
      prisma.deal.groupBy({ by: ['managerId'], where: { companyId, managerId: { in: mIds }, status: 'won', ...dealDateFilter }, _count: { id: true }, _sum: { budget: true } }),
      prisma.deal.groupBy({ by: ['managerId'], where: { companyId, managerId: { in: mIds }, status: { not: null }, ...dealDateFilter }, _count: { id: true } }),
      prisma.deal.groupBy({ by: ['managerId'], where: { companyId, managerId: { in: mIds }, status: 'won', budget: { gt: 0 }, ...dealDateFilter }, _sum: { budget: true } }),
    ])

    const mk = <T extends { managerId: string | null }>(arr: T[]) => new Map(arr.filter((x) => x.managerId).map((x) => [x.managerId!, x]))
    const callMap = mk(callCounts)
    const answeredMap = mk(answeredCounts)
    const auditMap = mk(auditScores)
    const wonMap = mk(wonDeals)
    const allDealMap = mk(allDeals)
    const revMap = mk(revenues)

    // ─── Max values for normalization ─────────────────────────────
    const allAnswered = managers.map((m) => answeredMap.get(m.id)?._count?.id ?? 0)
    const maxAnswered = Math.max(...allAnswered, 1)
    const totalRevenue = managers.reduce((s, m) => s + Number(revMap.get(m.id)?._sum?.budget ?? 0), 0)

    // ─── Build rating entries ──────────────────────────────────────
    const entries = managers.map((m) => {
      const calls = callMap.get(m.id)?._count?.id ?? 0
      const answered = answeredMap.get(m.id)?._count?.id ?? 0
      const avgAudit = auditMap.get(m.id)?._avg?.aiScore ?? 0
      const auditedCount = auditMap.get(m.id)?._count?.id ?? 0
      const won = wonMap.get(m.id)?._count?.id ?? 0
      const total = allDealMap.get(m.id)?._count?.id ?? 0
      const revenue = Number(revMap.get(m.id)?._sum?.budget ?? 0)

      // Normalized component scores (0–100)
      const salesScore = total > 0 ? (won / total) * 100 : 0
      const revenueScore = totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0
      const auditScore = avgAudit  // already 0–100
      const activityScore = maxAnswered > 0 ? (answered / maxAnswered) * 100 : 0

      // Weighted total (0–100)
      const totalScore = Math.round(
        salesScore * WEIGHTS.sales +
        revenueScore * WEIGHTS.revenue +
        auditScore * WEIGHTS.audit +
        activityScore * WEIGHTS.activity
      )

      return {
        managerId: m.id,
        managerName: m.name,
        position: m.position,
        metrics: {
          calls,
          answeredCalls: answered,
          avgAuditScore: Math.round(avgAudit),
          auditedCallsCount: auditedCount,
          wonDeals: won,
          totalDeals: total,
          conversionRate: total > 0 ? Math.round((won / total) * 100) : 0,
          revenue,
        },
        scores: {
          salesScore: Math.round(salesScore),
          revenueScore: Math.round(revenueScore),
          auditScore: Math.round(auditScore),
          activityScore: Math.round(activityScore),
          total: totalScore,
        },
      }
    })

    // ─── Sort by total score desc ──────────────────────────────────
    entries.sort((a, b) => b.scores.total - a.scores.total)

    // ─── Add rank ─────────────────────────────────────────────────
    const ranked = entries.map((e, i) => ({ ...e, rank: i + 1 }))

    return NextResponse.json({
      success: true,
      data: ranked,
      weights: WEIGHTS,
      period,
    })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    console.error('[API/Rating] Error:', err)
    return NextResponse.json({ success: false, error: 'Сервер хатоси' }, { status: 500 })
  }
}
