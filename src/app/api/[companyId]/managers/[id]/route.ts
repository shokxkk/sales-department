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
  { params }: { params: { companyId: string; id: string } }
) {
  try {
    const { companyId, id } = params
    await requireAuth(req, { companyId })

    const period = req.nextUrl.searchParams.get('period') || '30d'
    const dateRange = getPeriodRange(period)
    const callDateFilter = dateRange ? { startedAt: dateRange } : {}
    const dealDateFilter = dateRange ? { crmCreatedAt: dateRange } : {}

    const manager = await prisma.manager.findFirst({ where: { id, companyId } })
    if (!manager) {
      return NextResponse.json({ success: false, error: 'Ходим топилмади' }, { status: 404 })
    }

    const [
      // Aggregate KPI counts (accurate, no limit)
      callKpiAgg,
      answeredKpiAgg,
      avgTalkAgg,
      auditKpiAgg,
      // Display lists (limited)
      recentCallsList,
      auditsRaw,
      wonDeals,
      allDeals,
      revenueAgg,
    ] = await Promise.all([
      // Total calls count in period
      prisma.call.count({
        where: { managerId: id, companyId, ...callDateFilter },
      }),

      // Answered calls count
      prisma.call.count({
        where: { managerId: id, companyId, status: 'ANSWERED', ...callDateFilter },
      }),

      // Average talk duration
      prisma.call.aggregate({
        where: { managerId: id, companyId, status: 'ANSWERED', ...callDateFilter },
        _avg: { talkDurationSeconds: true },
      }),

      // Audit stats (avg score + count)
      prisma.call.aggregate({
        where: { managerId: id, companyId, analysisStatus: 'COMPLETED', ...callDateFilter },
        _avg: { aiScore: true },
        _count: { id: true },
      }),

      // Recent calls for display (last 8)
      prisma.call.findMany({
        where: { managerId: id, companyId, ...callDateFilter },
        orderBy: { startedAt: 'desc' },
        take: 8,
        select: {
          id: true,
          startedAt: true,
          direction: true,
          status: true,
          talkDurationSeconds: true,
          analysisStatus: true,
          aiScore: true,
          callType: true,
          customer: { select: { name: true } },
        },
      }),

      // Audits for this manager (via calls) — for chart and strengths/mistakes
      prisma.audit.findMany({
        where: {
          companyId,
          call: { managerId: id, ...callDateFilter },
        },
        orderBy: { completedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          finalScore: true,
          aiScore: true,
          maxPossibleScore: true,
          summary: true,
          callType: true,
          completedAt: true,
          strengthsJson: true,
          mistakesJson: true,
          call: {
            select: {
              id: true,
              startedAt: true,
              talkDurationSeconds: true,
              customer: { select: { name: true } },
            },
          },
        },
      }),

      // Won deals (for display)
      prisma.deal.findMany({
        where: { managerId: id, companyId, status: 'won', ...dealDateFilter },
        select: { id: true, budget: true, closedAt: true, name: true },
        orderBy: { closedAt: 'desc' },
        take: 5,
      }),

      // All deals count + won count
      prisma.deal.groupBy({
        by: ['status'],
        where: { managerId: id, companyId, ...dealDateFilter },
        _count: { id: true },
        _sum: { budget: true },
      }),

      // Revenue aggregate
      prisma.deal.aggregate({
        where: { managerId: id, companyId, status: 'won', budget: { gt: 0 }, ...dealDateFilter },
        _sum: { budget: true },
      }),
    ])

    // ── Compute KPIs from aggregates (accurate counts) ────────────
    const totalCalls = callKpiAgg
    const answeredCalls = answeredKpiAgg
    const missedCalls = totalCalls - answeredCalls
    const avgTalkDuration = Math.round(avgTalkAgg._avg.talkDurationSeconds ?? 0)
    const auditedCallsCount = auditKpiAgg._count.id
    const avgAuditScore = auditKpiAgg._avg.aiScore ? Math.round(auditKpiAgg._avg.aiScore) : 0

    const dealsByStatus = new Map(allDeals.map((d) => [d.status, { count: d._count.id, sum: Number(d._sum?.budget ?? 0) }]))
    const wonCount = dealsByStatus.get('won')?.count ?? 0
    const lostCount = dealsByStatus.get('lost')?.count ?? 0
    const openCount = dealsByStatus.get('open')?.count ?? 0
    const totalDeals = wonCount + lostCount + openCount
    const conversionRate = totalDeals > 0 ? Math.round((wonCount / totalDeals) * 100) : 0
    const revenue = Number(revenueAgg._sum?.budget ?? 0)

    // ── Aggregate strengths/mistakes from audits ──────────────────
    const parseJson = (v: unknown): string[] => {
      if (Array.isArray(v)) return v
      if (typeof v === 'string') { try { const p = JSON.parse(v); return Array.isArray(p) ? p : [] } catch { return [] } }
      return []
    }

    const calls = recentCallsList  // alias for rest of code

    const strengthFreq = new Map<string, number>()
    const mistakeFreq = new Map<string, number>()
    auditsRaw.forEach((a) => {
      parseJson(a.strengthsJson).forEach((s: string) => strengthFreq.set(s, (strengthFreq.get(s) ?? 0) + 1))
      parseJson(a.mistakesJson).forEach((m: string) => mistakeFreq.set(m, (mistakeFreq.get(m) ?? 0) + 1))
    })

    const topStrengths = [...strengthFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([text]) => text)
    const topMistakes = [...mistakeFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([text]) => text)

    // ── Call activity by day (for mini chart — based on recent calls list) ─
    const callsByDay: Record<string, number> = {}
    recentCallsList.forEach((c) => {
      const day = c.startedAt.toISOString().slice(0, 10)
      callsByDay[day] = (callsByDay[day] ?? 0) + 1
    })
    const callActivity = Object.entries(callsByDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }))

    // ── Audit score trend ─────────────────────────────────────────
    const auditTrend = auditsRaw
      .slice(0, 10)
      .reverse()
      .map((a) => ({
        date: a.completedAt.toISOString().slice(0, 10),
        score: a.finalScore,
        maxScore: a.maxPossibleScore,
      }))

    // ── Recent calls (last 8) ─────────────────────────────────────
    const recentCalls = calls.slice(0, 8).map((c) => ({
      id: c.id,
      startedAt: c.startedAt,
      direction: c.direction,
      status: c.status,
      talkDurationSeconds: c.talkDurationSeconds,
      analysisStatus: c.analysisStatus,
      aiScore: c.aiScore,
      callType: c.callType,
      customerName: c.customer?.name ?? null,
    }))

    // ── Recent audits (last 5) ────────────────────────────────────
    const recentAudits = auditsRaw.slice(0, 5).map((a) => ({
      id: a.id,
      callId: a.call.id,
      finalScore: a.finalScore,
      aiScore: a.aiScore,
      maxPossibleScore: a.maxPossibleScore,
      summary: a.summary,
      callType: a.callType,
      completedAt: a.completedAt,
      customerName: a.call.customer?.name ?? null,
      talkDurationSeconds: a.call.talkDurationSeconds,
    }))

    return NextResponse.json({
      success: true,
      data: {
        manager: {
          id: manager.id,
          name: manager.name,
          email: manager.email,
          phone: manager.phone,
          position: manager.position,
          department: manager.department,
          avatarUrl: manager.avatarUrl,
          isActive: manager.isActive,
        },
        kpi: {
          totalCalls,
          answeredCalls,
          missedCalls,
          avgTalkDurationSeconds: avgTalkDuration,
          avgAuditScore,
          auditedCallsCount,
          wonDealsCount: wonCount,
          lostDealsCount: lostCount,
          openDealsCount: openCount,
          totalDealsCount: totalDeals,
          conversionRate,
          revenue,
        },
        topStrengths,
        topMistakes,
        callActivity,
        auditTrend,
        recentCalls,
        recentAudits,
        period,
      },
    })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    console.error('[API/ManagerDetail] Error:', err)
    return NextResponse.json({ success: false, error: 'Сервер хатоси' }, { status: 500 })
  }
}
