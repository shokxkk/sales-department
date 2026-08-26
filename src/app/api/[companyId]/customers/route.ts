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

    const { searchParams } = req.nextUrl
    const period = searchParams.get('period') || '30d'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '25', 10))
    const skip = (page - 1) * limit

    const dateRange = getPeriodRange(period)
    const dateFilter = dateRange ? { createdAt: dateRange } : {}

    // Pagination count
    const totalCount = await prisma.customer.count({
      where: { companyId, ...dateFilter },
    })

    // Fetch customers
    const customers = await prisma.customer.findMany({
      where: { companyId, ...dateFilter },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        createdAt: true,
      },
    })

    const customerIds = customers.map((c) => c.id)

    // Aggregate calls per customer
    const callAgg = await prisma.call.groupBy({
      by: ['customerId'],
      where: { companyId, customerId: { in: customerIds } },
      _count: { id: true },
      _sum: { talkDurationSeconds: true },
    })

    // Aggregate deals per customer
    const dealAgg = await prisma.deal.groupBy({
      by: ['customerId'],
      where: { companyId, customerId: { in: customerIds } },
      _count: { id: true },
    })

    // Aggregate won deals revenue per customer
    const wonDealAgg = await prisma.deal.groupBy({
      by: ['customerId'],
      where: { companyId, customerId: { in: customerIds }, status: 'won' },
      _count: { id: true },
      _sum: { budget: true },
    })

    const callMap = new Map(callAgg.map((a) => [a.customerId, { count: a._count.id, duration: a._sum.talkDurationSeconds ?? 0 }]))
    const dealMap = new Map(dealAgg.map((a) => [a.customerId, { count: a._count.id }]))
    const wonMap = new Map(wonDealAgg.map((a) => [a.customerId, { count: a._count.id, revenue: Number(a._sum.budget ?? 0) }]))

    // Format data
    const data = customers.map((c) => ({
      ...c,
      metrics: {
        calls: callMap.get(c.id)?.count ?? 0,
        talkDuration: callMap.get(c.id)?.duration ?? 0,
        deals: dealMap.get(c.id)?.count ?? 0,
        wonDeals: wonMap.get(c.id)?.count ?? 0,
        revenue: wonMap.get(c.id)?.revenue ?? 0,
      },
    }))

    // General KPI
    const totalCallsAgg = await prisma.call.count({ where: { companyId, ...(dateRange ? { startedAt: dateRange } : {}) } })
    const totalWonAgg = await prisma.deal.aggregate({ 
      where: { companyId, status: 'won', ...(dateRange ? { crmCreatedAt: dateRange } : {}) },
      _count: { id: true },
      _sum: { budget: true }
    })

    return NextResponse.json({
      success: true,
      data,
      summary: {
        totalCustomers: totalCount,
        totalCalls: totalCallsAgg,
        totalWonDeals: totalWonAgg._count.id,
        totalRevenue: Number(totalWonAgg._sum.budget ?? 0),
        period,
      },
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    console.error('[API/Customers] Error:', err)
    return NextResponse.json({ success: false, error: 'Сервер хатоси' }, { status: 500 })
  }
}
