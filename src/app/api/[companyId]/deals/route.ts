import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, authErrorResponse, AuthError } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'

// ─── Period helper ────────────────────────────────────────────────
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

    const { searchParams } = req.nextUrl
    const period = searchParams.get('period') || '30d'
    const statusFilter = searchParams.get('status') || 'all'   // all | won | lost | open
    const managerId = searchParams.get('managerId') || null
    const pipelineId = searchParams.get('pipelineId') || null
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '25', 10))
    const skip = (page - 1) * limit

    const dateRange = getPeriodRange(period)

    // ─── Sales pipelines only (not service/technical) ─────────────
    // A "sales" deal: either pipeline isMain=true OR we include all if no main pipeline
    const salesPipelines = await prisma.pipeline.findMany({
      where: { companyId, isDeleted: false },
      select: { id: true, isMain: true, name: true },
    })

    // If any pipeline is marked isMain, use only those; else all pipelines are "sales"
    const mainPipelines = salesPipelines.filter((p) => p.isMain)
    const salesPipelineIds = mainPipelines.length > 0
      ? mainPipelines.map((p) => p.id)
      : salesPipelines.map((p) => p.id)

    // ─── Build deal filter ────────────────────────────────────────
    const where: Record<string, unknown> = {
      companyId,
      pipelineId: { in: salesPipelineIds },
    }

    if (statusFilter !== 'all') where['status'] = statusFilter
    if (managerId) where['managerId'] = managerId
    if (pipelineId && salesPipelineIds.includes(pipelineId)) where['pipelineId'] = pipelineId

    // Date filter: try closedAt for won, crmCreatedAt for all others
    if (dateRange) {
      where['crmCreatedAt'] = dateRange
    }

    // ─── Aggregate KPIs (across ALL pages, without pagination) ────
    const [
      wonAgg,
      lostAgg,
      openAgg,
      totalCountAll,
    ] = await Promise.all([
      prisma.deal.aggregate({
        where: { ...where, status: 'won' },
        _count: { id: true },
        _sum: { budget: true },
        _avg: { budget: true },
      }),
      prisma.deal.aggregate({
        where: { ...where, status: 'lost' },
        _count: { id: true },
        _sum: { budget: true },
      }),
      prisma.deal.aggregate({
        where: { ...where, status: 'open' },
        _count: { id: true },
        _sum: { budget: true },
      }),
      prisma.deal.count({ where }),
    ])

    const wonCount = wonAgg._count.id
    const lostCount = lostAgg._count.id
    const openCount = openAgg._count.id
    const totalDeals = wonCount + lostCount + openCount
    const conversionRate = totalDeals > 0 ? Math.round((wonCount / totalDeals) * 100) : 0
    const totalRevenue = Number(wonAgg._sum?.budget ?? 0)
    const avgDealSize = Number(wonAgg._avg?.budget ?? 0)

    // Estimated pipeline value (open deals)
    const pipelineValue = Number(openAgg._sum?.budget ?? 0)

    // ─── Paginated deal list ──────────────────────────────────────
    const deals = await prisma.deal.findMany({
      where,
      orderBy: { crmCreatedAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        budget: true,
        currency: true,
        status: true,
        source: true,
        crmCreatedAt: true,
        closedAt: true,
        crmId: true,
        pipeline: { select: { id: true, name: true } },
        stage: { select: { id: true, name: true, isSuccess: true, color: true } },
        manager: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true } },
        refusalReason: { select: { id: true, name: true } },
      },
    })

    // ─── Revenue by manager (top 5) ───────────────────────────────
    const revenueByManager = await prisma.deal.groupBy({
      by: ['managerId'],
      where: { ...where, status: 'won', managerId: { not: null } },
      _count: { id: true },
      _sum: { budget: true },
      orderBy: { _sum: { budget: 'desc' } },
      take: 5,
    })

    const managerIds = revenueByManager.map((r) => r.managerId!).filter(Boolean)
    const managerNames = await prisma.manager.findMany({
      where: { id: { in: managerIds } },
      select: { id: true, name: true },
    })
    const managerNameMap = new Map(managerNames.map((m) => [m.id, m.name]))

    const topManagers = revenueByManager.map((r) => ({
      managerId: r.managerId,
      managerName: r.managerId ? managerNameMap.get(r.managerId) ?? '—' : '—',
      wonDeals: r._count.id,
      revenue: Number(r._sum?.budget ?? 0),
    }))

    // ─── Revenue by pipeline ──────────────────────────────────────
    const revenueByPipeline = await prisma.deal.groupBy({
      by: ['pipelineId'],
      where: { ...where, status: 'won', pipelineId: { not: null } },
      _count: { id: true },
      _sum: { budget: true },
    })

    const pipelineNameMap = new Map(salesPipelines.map((p) => [p.id, p.name]))
    const pipelineBreakdown = revenueByPipeline.map((r) => ({
      pipelineId: r.pipelineId,
      pipelineName: r.pipelineId ? pipelineNameMap.get(r.pipelineId) ?? '—' : '—',
      wonDeals: r._count.id,
      revenue: Number(r._sum?.budget ?? 0),
    }))

    return NextResponse.json({
      success: true,
      data: deals.map((d) => ({
        ...d,
        budget: Number(d.budget ?? 0),
      })),
      summary: {
        wonCount,
        lostCount,
        openCount,
        totalDeals,
        conversionRate,
        totalRevenue,
        avgDealSize: Math.round(avgDealSize),
        pipelineValue,
        period,
      },
      analytics: {
        topManagers,
        pipelineBreakdown,
      },
      pagination: {
        page,
        limit,
        total: totalCountAll,
        totalPages: Math.ceil(totalCountAll / limit),
      },
    })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    console.error('[API/Deals] Error:', err)
    return NextResponse.json({ success: false, error: 'Сервер хатоси' }, { status: 500 })
  }
}
