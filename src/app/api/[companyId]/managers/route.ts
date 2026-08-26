import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, authErrorResponse, AuthError } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'

// ─── Period helper ────────────────────────────────────────────────
function getPeriodRange(period: string | null): { gte: Date; lte: Date } | null {
  const now = new Date()
  const lte = new Date(now)

  if (period === 'today') {
    const gte = new Date(now)
    gte.setHours(0, 0, 0, 0)
    lte.setHours(23, 59, 59, 999)
    return { gte, lte }
  }
  if (period === '7d') {
    const gte = new Date(now)
    gte.setDate(gte.getDate() - 7)
    return { gte, lte }
  }
  if (period === 'month') {
    const gte = new Date(now.getFullYear(), now.getMonth(), 1)
    return { gte, lte }
  }
  // '30d' or default
  const gte = new Date(now)
  gte.setDate(gte.getDate() - 30)
  return { gte, lte }
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
    const dateRange = getPeriodRange(period)

    // Fetch all active managers
    const managers = await prisma.manager.findMany({
      where: { companyId, isActive: true },
      orderBy: { name: 'asc' },
    })

    // Aggregate per-manager stats in parallel (single batch)
    const [
      callCountMap,
      answeredCallMap,
      avgTalkDurationMap,
      auditScoreMap,
      wonDealsMap,
      totalDealsMap,
      revenueMap,
    ] = await Promise.all([
      // Total calls in period
      prisma.call.groupBy({
        by: ['managerId'],
        where: {
          companyId,
          managerId: { in: managers.map((m) => m.id) },
          ...(dateRange ? { startedAt: dateRange } : {}),
        },
        _count: { id: true },
      }),

      // Answered calls in period
      prisma.call.groupBy({
        by: ['managerId'],
        where: {
          companyId,
          managerId: { in: managers.map((m) => m.id) },
          status: 'ANSWERED',
          ...(dateRange ? { startedAt: dateRange } : {}),
        },
        _count: { id: true },
      }),

      // Average talk duration
      prisma.call.groupBy({
        by: ['managerId'],
        where: {
          companyId,
          managerId: { in: managers.map((m) => m.id) },
          status: 'ANSWERED',
          ...(dateRange ? { startedAt: dateRange } : {}),
        },
        _avg: { talkDurationSeconds: true },
      }),

      // Average audit final score (COMPLETED audits only)
      prisma.call.groupBy({
        by: ['managerId'],
        where: {
          companyId,
          managerId: { in: managers.map((m) => m.id) },
          analysisStatus: 'COMPLETED',
          ...(dateRange ? { startedAt: dateRange } : {}),
        },
        _avg: { aiScore: true },
        _count: { id: true },
      }),

      // Won deals in period
      prisma.deal.groupBy({
        by: ['managerId'],
        where: {
          companyId,
          managerId: { in: managers.map((m) => m.id) },
          status: 'won',
          ...(dateRange ? { closedAt: dateRange } : {}),
        },
        _count: { id: true },
        _sum: { budget: true },
      }),

      // Total deals assigned in period
      prisma.deal.groupBy({
        by: ['managerId'],
        where: {
          companyId,
          managerId: { in: managers.map((m) => m.id) },
          status: { not: null },
          ...(dateRange ? { crmCreatedAt: dateRange } : {}),
        },
        _count: { id: true },
      }),

      // Revenue (won deals budget sum per manager)
      prisma.deal.groupBy({
        by: ['managerId'],
        where: {
          companyId,
          managerId: { in: managers.map((m) => m.id) },
          status: 'won',
          budget: { gt: 0 },
          ...(dateRange ? { closedAt: dateRange } : {}),
        },
        _sum: { budget: true },
      }),
    ])

    // Build lookup maps
    const byManagerId = <T extends { managerId: string | null }>(arr: T[]) =>
      new Map(arr.filter((x) => x.managerId).map((x) => [x.managerId as string, x]))

    const callsMap = byManagerId(callCountMap)
    const answeredMap = byManagerId(answeredCallMap)
    const avgTalkMap = byManagerId(avgTalkDurationMap)
    const auditMap = byManagerId(auditScoreMap)
    const wonMap = byManagerId(wonDealsMap)
    const totalDealMap = byManagerId(totalDealsMap)
    const revMap = byManagerId(revenueMap)

    // Build aggregate KPIs
    let totalCallsAll = 0
    let totalRevenueAll = 0
    let totalAuditSum = 0
    let auditManagerCount = 0

    const data = managers.map((m) => {
      const calls = callsMap.get(m.id)?._count?.id ?? 0
      const answered = answeredMap.get(m.id)?._count?.id ?? 0
      const avgTalk = Math.round(avgTalkMap.get(m.id)?._avg?.talkDurationSeconds ?? 0)
      const auditEntry = auditMap.get(m.id)
      const avgAudit = auditEntry?._avg?.aiScore ? Math.round(auditEntry._avg.aiScore) : 0
      const auditedCalls = auditEntry?._count?.id ?? 0
      const won = wonMap.get(m.id)?._count?.id ?? 0
      const totalDeals = totalDealMap.get(m.id)?._count?.id ?? 0
      const revenue = Number(revMap.get(m.id)?._sum?.budget ?? 0)
      const conversion = totalDeals > 0 ? Math.round((won / totalDeals) * 100) : 0

      totalCallsAll += calls
      totalRevenueAll += revenue
      if (avgAudit > 0) {
        totalAuditSum += avgAudit
        auditManagerCount++
      }

      return {
        id: m.id,
        name: m.name,
        email: m.email || '',
        position: m.position || '',
        isActive: m.isActive,
        callsCount: calls,
        answeredCallsCount: answered,
        avgTalkDurationSeconds: avgTalk,
        avgAuditScore: avgAudit,
        auditedCallsCount: auditedCalls,
        wonDealsCount: won,
        totalDealsCount: totalDeals,
        revenue,
        conversionRate: conversion,
      }
    })

    // Summary KPIs
    const summary = {
      totalManagers: managers.length,
      activeManagers: managers.filter((m) => m.isActive).length,
      totalCalls: totalCallsAll,
      avgAuditScore: auditManagerCount > 0 ? Math.round(totalAuditSum / auditManagerCount) : 0,
      totalRevenue: totalRevenueAll,
      period,
    }

    return NextResponse.json({ success: true, data, summary })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    console.error('[API/Managers] Error:', err)
    return NextResponse.json({ success: false, error: 'Сервер хатоси' }, { status: 500 })
  }
}
