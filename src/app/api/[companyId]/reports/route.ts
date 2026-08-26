import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, authErrorResponse, AuthError } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'

function getPeriodRange(period: string | null): { gte: Date; lte: Date } | null {
  const now = new Date()
  const lte = new Date(now)
  if (period === '7d') { const gte = new Date(now); gte.setDate(gte.getDate() - 7); return { gte, lte } }
  if (period === 'month') { return { gte: new Date(now.getFullYear(), now.getMonth(), 1), lte } }
  if (period === '3month') { return { gte: new Date(now.getFullYear(), now.getMonth() - 3, 1), lte } }
  const gte = new Date(now); gte.setDate(gte.getDate() - 30); return { gte, lte }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { companyId: string } }
) {
  try {
    const { companyId } = params
    await requireAuth(req, { companyId })

    const { searchParams } = req.nextUrl
    const period = searchParams.get('period') || '30d'
    const reportType = searchParams.get('type') || 'summary'  // summary | calls | deals | audits
    const dateRange = getPeriodRange(period)
    const callFilter = dateRange ? { startedAt: dateRange } : {}
    const dealFilter = dateRange ? { crmCreatedAt: dateRange } : {}

    if (reportType === 'calls') {
      // ─── Export-ready calls list ───────────────────────────────
      const calls = await prisma.call.findMany({
        where: { companyId, ...callFilter },
        orderBy: { startedAt: 'desc' },
        take: 500,
        select: {
          id: true, startedAt: true, direction: true, status: true,
          talkDurationSeconds: true, analysisStatus: true, aiScore: true, callType: true,
          manager: { select: { name: true } },
          customer: { select: { name: true, phone: true } },
        },
      })
      return NextResponse.json({ success: true, type: 'calls', data: calls.map((c) => ({
        id: c.id,
        date: c.startedAt,
        direction: c.direction,
        status: c.status,
        duration: c.talkDurationSeconds,
        analysisStatus: c.analysisStatus,
        aiScore: c.aiScore,
        callType: c.callType,
        managerName: c.manager?.name ?? '',
        customerName: c.customer?.name ?? '',
        customerPhone: c.customer?.phone ?? '',
      })) })
    }

    if (reportType === 'deals') {
      // ─── Export-ready deals list ───────────────────────────────
      const deals = await prisma.deal.findMany({
        where: { companyId, ...dealFilter },
        orderBy: { crmCreatedAt: 'desc' },
        take: 500,
        select: {
          id: true, name: true, budget: true, currency: true, status: true,
          crmCreatedAt: true, closedAt: true, source: true,
          pipeline: { select: { name: true } },
          stage: { select: { name: true } },
          manager: { select: { name: true } },
          customer: { select: { name: true } },
          refusalReason: { select: { name: true } },
        },
      })
      return NextResponse.json({ success: true, type: 'deals', data: deals.map((d) => ({
        id: d.id,
        name: d.name,
        budget: Number(d.budget ?? 0),
        currency: d.currency,
        status: d.status,
        pipelineName: d.pipeline?.name ?? '',
        stageName: d.stage?.name ?? '',
        managerName: d.manager?.name ?? '',
        customerName: d.customer?.name ?? '',
        refusalReason: d.refusalReason?.name ?? '',
        source: d.source,
        crmCreatedAt: d.crmCreatedAt,
        closedAt: d.closedAt,
      })) })
    }

    if (reportType === 'audits') {
      // ─── Export-ready audits list ──────────────────────────────
      const audits = await prisma.audit.findMany({
        where: { companyId, ...(dateRange ? { createdAt: dateRange } : {}) },
        orderBy: { createdAt: 'desc' },
        take: 300,
        select: {
          id: true, finalScore: true, aiScore: true, maxPossibleScore: true,
          summary: true, callType: true, completedAt: true, createdAt: true,
          call: {
            select: {
              id: true, startedAt: true, talkDurationSeconds: true,
              manager: { select: { name: true } },
              customer: { select: { name: true } },
            },
          },
        },
      })
      return NextResponse.json({ success: true, type: 'audits', data: audits.map((a) => ({
        id: a.id,
        callId: a.call.id,
        date: a.call.startedAt,
        managerName: a.call.manager?.name ?? '',
        customerName: a.call.customer?.name ?? '',
        duration: a.call.talkDurationSeconds,
        finalScore: a.finalScore,
        maxPossibleScore: a.maxPossibleScore,
        aiScore: a.aiScore,
        callType: a.callType,
        summary: a.summary,
        completedAt: a.completedAt,
      })) })
    }

    // ─── Summary report (default) ─────────────────────────────────
    const [
      callAgg, answeredAgg, auditAgg,
      wonDealsAgg, lostDealsAgg,
      topManagers, callsByDay, dealsByDay,
    ] = await Promise.all([
      prisma.call.count({ where: { companyId, ...callFilter } }),
      prisma.call.count({ where: { companyId, status: 'ANSWERED', ...callFilter } }),
      prisma.call.aggregate({ where: { companyId, analysisStatus: 'COMPLETED', ...callFilter }, _avg: { aiScore: true }, _count: { id: true } }),

      prisma.deal.aggregate({ where: { companyId, status: 'won', ...dealFilter }, _count: { id: true }, _sum: { budget: true } }),
      prisma.deal.aggregate({ where: { companyId, status: 'lost', ...dealFilter }, _count: { id: true } }),

      prisma.deal.groupBy({
        by: ['managerId'],
        where: { companyId, status: 'won', managerId: { not: null }, ...dealFilter },
        _count: { id: true }, _sum: { budget: true },
        orderBy: { _sum: { budget: 'desc' } }, take: 5,
      }),

      prisma.call.findMany({ where: { companyId, ...callFilter }, select: { startedAt: true }, orderBy: { startedAt: 'asc' } }),
      prisma.deal.findMany({ where: { companyId, status: 'won', ...dealFilter }, select: { crmCreatedAt: true }, orderBy: { crmCreatedAt: 'asc' } }),
    ])

    // Manager names for top managers
    const mIds = topManagers.map((m) => m.managerId!).filter(Boolean)
    const mNames = await prisma.manager.findMany({ where: { id: { in: mIds } }, select: { id: true, name: true } })
    const mNameMap = new Map(mNames.map((m) => [m.id, m.name]))

    // Daily call trend
    const callDailyMap = new Map<string, number>()
    callsByDay.forEach((c) => { const d = c.startedAt.toISOString().slice(0, 10); callDailyMap.set(d, (callDailyMap.get(d) ?? 0) + 1) })
    const callTrend = [...callDailyMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count }))

    // Daily won deal trend
    const dealDailyMap = new Map<string, number>()
    dealsByDay.forEach((d) => { if (!d.crmCreatedAt) return; const k = d.crmCreatedAt.toISOString().slice(0, 10); dealDailyMap.set(k, (dealDailyMap.get(k) ?? 0) + 1) })
    const dealTrend = [...dealDailyMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count }))

    return NextResponse.json({
      success: true, type: 'summary',
      data: {
        summary: {
          totalCalls: callAgg,
          answeredCalls: answeredAgg,
          auditedCalls: auditAgg._count.id,
          avgAuditScore: auditAgg._avg.aiScore ? Math.round(auditAgg._avg.aiScore) : 0,
          wonDeals: wonDealsAgg._count.id,
          lostDeals: lostDealsAgg._count.id,
          totalRevenue: Number(wonDealsAgg._sum?.budget ?? 0),
          conversionRate: wonDealsAgg._count.id + lostDealsAgg._count.id > 0
            ? Math.round((wonDealsAgg._count.id / (wonDealsAgg._count.id + lostDealsAgg._count.id)) * 100) : 0,
          period,
        },
        topManagers: topManagers.map((m) => ({
          managerId: m.managerId, managerName: m.managerId ? mNameMap.get(m.managerId) ?? '—' : '—',
          wonDeals: m._count.id, revenue: Number(m._sum?.budget ?? 0),
        })),
        callTrend,
        dealTrend,
      },
    })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    console.error('[API/Reports] Error:', err)
    return NextResponse.json({ success: false, error: 'Сервер хатоси' }, { status: 500 })
  }
}
