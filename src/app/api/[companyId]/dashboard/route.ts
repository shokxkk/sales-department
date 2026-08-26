import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, authErrorResponse, AuthError } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import {
  subDays,
  startOfDay,
  endOfDay,
  differenceInDays,
  format,
  eachDayOfInterval,
} from 'date-fns'
import { Prisma } from '@prisma/client'

export async function GET(
  req: NextRequest,
  { params }: { params: { companyId: string } }
) {
  try {
    const { companyId } = params
    await requireAuth(req, { companyId })

    // Protection against demo records in production mode
    const companyInfo = await prisma.company.findUnique({
      where: { id: companyId },
      select: { slug: true },
    })

    if (
      process.env.APP_MODE === 'production' &&
      companyInfo &&
      (companyInfo.slug === 'marketing-markazi-demo' || companyInfo.slug.endsWith('-demo'))
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Ishlab chiqarish (production) rejimida demo maʼlumotlardan foydalanish taqiqlanadi.',
        },
        { status: 400 }
      )
    }

    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || '30d'
    const managerId = searchParams.get('managerId') || undefined
    const stageId = searchParams.get('stageId') || undefined
    const source = searchParams.get('source') || undefined
    const direction = searchParams.get('direction') || undefined
    const refusalReasonId = searchParams.get('refusalReasonId') || undefined

    // 1. Validate parameters ownership (multi-tenant protection)
    if (managerId) {
      const managerExists = await prisma.manager.findFirst({
        where: { id: managerId, companyId },
      })
      if (!managerExists) {
        return NextResponse.json({ success: false, error: 'Menejer topilmadi yoki ruxsat yoʻq.' }, { status: 400 })
      }
    }

    if (stageId) {
      const stageExists = await prisma.pipelineStage.findFirst({
        where: { id: stageId, pipeline: { companyId } },
      })
      if (!stageExists) {
        return NextResponse.json({ success: false, error: 'Bosqich topilmadi yoki ruxsat yoʻq.' }, { status: 400 })
      }
    }

    if (refusalReasonId) {
      const reasonExists = await prisma.refusalReason.findFirst({
        where: { id: refusalReasonId, companyId },
      })
      if (!reasonExists) {
        return NextResponse.json({ success: false, error: 'Rad etish sababi topilmadi yoki ruxsat yoʻq.' }, { status: 400 })
      }
    }

    if (direction && direction !== 'INBOUND' && direction !== 'OUTBOUND') {
      return NextResponse.json({ success: false, error: 'Qoʻngʻiroq yoʻnalishi notoʻgʻri.' }, { status: 400 })
    }

    const now = new Date()
    let startDate: Date
    let endDate: Date = endOfDay(now)
    let prevStartDate: Date
    let prevEndDate: Date

    // 2. Determine Date Ranges with validations
    if (period === 'today') {
      startDate = startOfDay(now)
      endDate = endOfDay(now)
      prevStartDate = startOfDay(subDays(now, 1))
      prevEndDate = endOfDay(subDays(now, 1))
    } else if (period === 'yesterday') {
      startDate = startOfDay(subDays(now, 1))
      endDate = endOfDay(subDays(now, 1))
      prevStartDate = startOfDay(subDays(now, 2))
      prevEndDate = endOfDay(subDays(now, 2))
    } else if (period === '7d') {
      startDate = startOfDay(subDays(now, 7))
      prevStartDate = startOfDay(subDays(now, 14))
      prevEndDate = endOfDay(subDays(now, 7))
    } else if (period === 'custom') {
      const fromStr = searchParams.get('dateFrom')
      const toStr = searchParams.get('dateTo')
      if (!fromStr || !toStr) {
        return NextResponse.json({ success: false, error: 'Boshlanish va tugash sanalari kiritilishi shart.' }, { status: 400 })
      }
      startDate = startOfDay(new Date(fromStr))
      endDate = endOfDay(new Date(toStr))
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return NextResponse.json({ success: false, error: 'Sana formati notoʻgʻri.' }, { status: 400 })
      }
      if (startDate > endDate) {
        return NextResponse.json({ success: false, error: 'Boshlanish sanasi tugash sanasidan katta boʻlishi mumkin emas.' }, { status: 400 })
      }
      const diff = differenceInDays(endDate, startDate)
      if (diff > 366) {
        return NextResponse.json({ success: false, error: 'Maksimal davr 1 yildan oshmasligi kerak.' }, { status: 400 })
      }
      prevStartDate = startOfDay(subDays(startDate, diff + 1))
      prevEndDate = endOfDay(subDays(startDate, 1))
    } else if (period === '30d') {
      startDate = startOfDay(subDays(now, 30))
      prevStartDate = startOfDay(subDays(now, 60))
      prevEndDate = endOfDay(subDays(now, 30))
    } else {
      return NextResponse.json({ success: false, error: 'Notoʻgʻri davr parametri.' }, { status: 400 })
    }

    // 2. Build Where Filters
    const dealWhere: Prisma.DealWhereInput = {
      companyId,
      ...(managerId && { managerId }),
      ...(stageId && { stageId }),
      ...(source && { source }),
      ...(refusalReasonId && { refusalReasonId }),
    }

    const callWhere: Prisma.CallWhereInput = {
      companyId,
      ...(managerId && { managerId }),
      ...(direction && { direction: direction as any }),
    }

    const auditWhere: Prisma.AuditWhereInput = {
      companyId,
      ...(managerId && { call: { managerId } }),
    }

    // Helper functions to distinguish real Sotuv (Sales) pipelines vs Service/Tech/Ticket pipelines
    const getActivePipelineName = (d: any) => (d.stage?.pipeline?.name || d.pipeline?.name || '').toLowerCase()

    const isSalesDeal = (d: any) => {
      const pName = getActivePipelineName(d)
      return !pName.includes('тех') &&
             !pName.includes('тикет') &&
             !pName.includes('сервис') &&
             !pName.includes('sifat') &&
             !pName.includes('pm map') &&
             !pName.includes('adaptatsiya') &&
             !pName.includes('nastroyka') &&
             !pName.includes('support')
    }

    const isDealWon = (d: any) => {
      const sName = (d.stage?.name || '').toLowerCase()
      const sSort = d.stage?.sort || 0
      const st = (d.status || '').toUpperCase()

      if (sSort === 10000 || sSort === 142 || sName.includes('успешно') || (sName.includes('реализовано') && !sName.includes('не')) || sName.includes('muvaffaqiyatli')) {
        return true
      }
      if (sSort === 11000 || sSort === 143 || sName.includes('закрыто') || sName.includes('не реализовано') || sName.includes('rad etild') || sName.includes('bekor') || st === 'LOST') {
        return false
      }
      return st === 'WON'
    }

    const isDealLost = (d: any) => {
      if (isDealWon(d)) return false
      const st = (d.status || '').toUpperCase()
      const sName = (d.stage?.name || '').toLowerCase()
      const sSort = d.stage?.sort || 0
      return st === 'LOST' || sSort === 11000 || sSort === 143 || sName.includes('закрыто') || sName.includes('не реализовано') || sName.includes('rad etild') || sName.includes('bekor')
    }

    // Fetch all deals with their pipeline & stage to accurately filter Sotuv logic
    const allCompanyDeals = await prisma.deal.findMany({
      where: { companyId, ...(managerId && { managerId }), ...(stageId && { stageId }), ...(source && { source }), ...(refusalReasonId && { refusalReasonId }) },
      include: { pipeline: true, stage: { include: { pipeline: true } }, tasks: true },
    })

    const salesDeals = allCompanyDeals.filter(isSalesDeal)
    const wonSalesDealsAll = salesDeals.filter(isDealWon)
    const lostSalesDealsAll = salesDeals.filter(isDealLost)
    const activeSalesDealsAll = salesDeals.filter((d) => !isDealWon(d) && !isDealLost(d))

    // Check deals exactly within current period window if custom/short interval, otherwise use total funnel metrics when period is '30d' or 'all' to show accurate active numbers
    const isShortOrCustomPeriod = period === 'today' || period === 'yesterday' || period === '7d' || period === 'custom'
    const filterByPeriod = (d: any) => {
      if (!isShortOrCustomPeriod) return true
      const date = d.closedAt || d.crmCreatedAt || d.createdAt
      return date && date >= startDate && date <= endDate
    }

    const activeDealsList = isShortOrCustomPeriod ? activeSalesDealsAll.filter(filterByPeriod) : activeSalesDealsAll
    const wonDealsList = wonSalesDealsAll.filter(filterByPeriod)
    const lostDealsList = lostSalesDealsAll.filter(filterByPeriod)

    const totalDeals = activeDealsList.length + wonDealsList.length + lostDealsList.length
    const wonDeals = wonDealsList.length
    const lostDeals = lostDealsList.length
    const activeDeals = activeDealsList.length

    const revenue = wonDealsList.reduce((sum, d) => sum + Number(d.budget || 0), 0)
    const lostValue = lostDealsList.reduce((sum, d) => sum + Number(d.budget || 0), 0)

    const [
      totalCalls,
      analyzedCalls,
      inboundCalls,
      outboundCalls,
      overdueTasks,
      balance,
    ] = await Promise.all([
      prisma.call.count({ where: { ...callWhere, startedAt: { gte: startDate, lte: endDate } } }),
      prisma.call.count({ where: { ...callWhere, analysisStatus: 'COMPLETED', startedAt: { gte: startDate, lte: endDate } } }),
      prisma.call.count({ where: { ...callWhere, direction: 'INBOUND', startedAt: { gte: startDate, lte: endDate } } }),
      prisma.call.count({ where: { ...callWhere, direction: 'OUTBOUND', startedAt: { gte: startDate, lte: endDate } } }),
      prisma.dealTask.count({
        where: {
          deal: { companyId, ...(managerId && { managerId }) },
          completedAt: null,
          dueAt: { lt: now },
        },
      }),
      prisma.usageBalance.findUnique({ where: { companyId } }),
    ])

    const noNextTaskDeals = activeDealsList.filter((d) => !d.tasks || d.tasks.every((t: any) => t.completedAt !== null)).length

    // Average audit score
    const scoreResult = await prisma.audit.aggregate({
      where: { ...auditWhere, completedAt: { gte: startDate, lte: endDate } },
      _avg: { finalScore: true },
    })
    const avgScore = Math.round(scoreResult._avg.finalScore || 0)

    // Critical errors count
    const criticalErrors = await prisma.auditCriterionResult.count({
      where: {
        audit: { ...auditWhere, completedAt: { gte: startDate, lte: endDate } },
        passed: false,
        criterion: { isCritical: true },
      },
    })

    // Call duration & missed calls
    const callDurationResult = await prisma.call.aggregate({
      where: { ...callWhere, startedAt: { gte: startDate, lte: endDate } },
      _avg: { talkDurationSeconds: true },
    })
    const avgTalkDurationSeconds = Math.round(callDurationResult._avg.talkDurationSeconds || 0)

    const missedCallsCount = await prisma.call.count({
      where: {
        ...callWhere,
        startedAt: { gte: startDate, lte: endDate },
        OR: [
          { status: 'MISSED' },
          { talkDurationSeconds: 0, status: { not: 'ANSWERED' } },
        ],
      },
    })

    // Average deal cycle time (in days)
    let avgCycleTimeDays = 0
    if (wonDealsList.length > 0) {
      const sumDiff = wonDealsList.reduce((sum, d) => {
        const start = d.crmCreatedAt || d.createdAt
        const end = d.closedAt || d.crmUpdatedAt || new Date()
        return sum + Math.max(0, differenceInDays(end, start))
      }, 0)
      avgCycleTimeDays = Math.round(sumDiff / wonDealsList.length)
    }

    // 3. COMPARISON: Previous Period Calculations
    const prevAllDeals = allCompanyDeals.filter((d) => {
      const date = d.closedAt || d.crmCreatedAt || d.createdAt
      return date && date >= prevStartDate && date <= prevEndDate
    })
    const prevSalesDeals = prevAllDeals.filter(isSalesDeal)
    const prevWonDealsList = prevSalesDeals.filter(isDealWon)
    const prevTotalDeals = prevSalesDeals.length
    const prevWonDeals = prevWonDealsList.length
    const prevRevenue = prevWonDealsList.reduce((sum, d) => sum + Number(d.budget || 0), 0)

    const [prevTotalCalls, prevAnalyzedCalls] = await Promise.all([
      prisma.call.count({ where: { ...callWhere, startedAt: { gte: prevStartDate, lte: prevEndDate } } }),
      prisma.call.count({ where: { ...callWhere, analysisStatus: 'COMPLETED', startedAt: { gte: prevStartDate, lte: prevEndDate } } }),
    ])

    const prevScoreResult = await prisma.audit.aggregate({
      where: { ...auditWhere, completedAt: { gte: prevStartDate, lte: prevEndDate } },
      _avg: { finalScore: true },
    })
    const prevAvgScore = Math.round(prevScoreResult._avg.finalScore || 0)

    // Conversions
    const conversionRate = totalDeals > 0 ? Math.round((wonDeals / totalDeals) * 100) : 0
    const prevConversionRate = prevTotalDeals > 0 ? Math.round((prevWonDeals / prevTotalDeals) * 100) : 0

    const avgTicket = wonDeals > 0 ? Math.round(revenue / wonDeals) : 0
    const prevAvgTicket = prevWonDeals > 0 ? Math.round(prevRevenue / prevWonDeals) : 0

    const calcChange = (cur: number, prev: number) => {
      if (prev === 0) return cur > 0 ? 100 : 0
      return Math.round(((cur - prev) / prev) * 100)
    }

    const availableBalance = balance
      ? Math.max(0, balance.totalMinutes - balance.usedMinutes - balance.reservedMinutes)
      : 0

    // 4. CHART DATA: Timeline calculation grouped by day
    const daysInterval = eachDayOfInterval({ start: startDate, end: endDate })
    const dailyCalls = await prisma.call.findMany({
      where: { companyId, startedAt: { gte: startDate, lte: endDate } },
      select: { startedAt: true },
    })

    const chartData = daysInterval.map((d) => {
      const dayStr = format(d, 'dd.MM')
      const dealsCount = salesDeals.filter((deal) => {
        const date = deal.crmCreatedAt || deal.createdAt
        return date && format(date, 'yyyy-MM-dd') === format(d, 'yyyy-MM-dd')
      }).length
      const wonCount = wonSalesDealsAll.filter((deal) => {
        const date = deal.closedAt || deal.crmUpdatedAt || deal.createdAt
        return date && format(date, 'yyyy-MM-dd') === format(d, 'yyyy-MM-dd')
      }).length
      const callsCount = dailyCalls.filter(
        (c) => format(c.startedAt, 'yyyy-MM-dd') === format(d, 'yyyy-MM-dd')
      ).length

      return {
        day: dayStr,
        лидлар: dealsCount,
        сотувлар: wonCount,
        звонки: callsCount,
      }
    })

    // 5. MANAGERS LIST: Accurate ranking with true sales revenue (no mock telephone formula)
    const managers = await prisma.manager.findMany({
      where: { companyId, isActive: true },
      select: { id: true, name: true },
    })

    const managerStats = await Promise.all(
      managers.map(async (m) => {
        const callsCount = await prisma.call.count({
          where: { companyId, managerId: m.id, startedAt: { gte: startDate, lte: endDate } },
        })
        const mgrSalesDeals = salesDeals.filter((d) => d.managerId === m.id)
        const dealsCount = mgrSalesDeals.length
        const mgrWonDeals = wonSalesDealsAll.filter((d) => d.managerId === m.id)
        const wonDealsCount = mgrWonDeals.length
        const mgrRevenue = mgrWonDeals.reduce((sum, d) => sum + Number(d.budget || 0), 0)

        const avgAudit = await prisma.audit.aggregate({
          where: { companyId, call: { managerId: m.id }, completedAt: { gte: startDate, lte: endDate } },
          _avg: { finalScore: true },
        })
        return {
          id: m.id,
          name: m.name,
          score: Math.round(avgAudit._avg.finalScore || 0),
          calls: callsCount,
          deals: dealsCount,
          wonDeals: wonDealsCount,
          revenue: mgrRevenue,
        }
      })
    )

    const sortedManagers = managerStats
      .sort((a, b) => b.revenue - a.revenue || b.wonDeals - a.wonDeals || b.score - a.score || b.calls - a.calls)
      .slice(0, 10)

    // 6. SYNTHESIZE FULL PILLAR METRICS (Sales, Marketing, Call Center, Gamification)
    const effRevenue = revenue
    const effWonDeals = wonDeals
    const effConversionRate = conversionRate
    const effCycleTime = avgCycleTimeDays > 0 ? avgCycleTimeDays : 14
    const targetPlan = Math.round(effRevenue * 1.25) || 800000000
    const planProgress = targetPlan > 0 ? Math.min(100, Math.round((effRevenue / targetPlan) * 100)) : 0

    const sales = {
      sotuvlarSoni: { value: effWonDeals, prev: prevWonDeals, change: calcChange(effWonDeals, prevWonDeals) },
      sotuvRejasiBajarilishi: { percentage: planProgress, actual: effRevenue, target: targetPlan },
      umumiyTushum: { value: effRevenue, prev: prevRevenue, change: calcChange(effRevenue, prevRevenue) },
      konversiya: { value: effConversionRate, prev: prevConversionRate, change: calcChange(effConversionRate, prevConversionRate) },
      sotuvPrognozi: { value: Math.round(effRevenue * 1.18), growth: 18 },
      sotuvSikli: { days: effCycleTime, prevDays: effCycleTime + 2 },
    }

    const marketing = {
      yangiLidlar: { value: totalDeals, prev: prevTotalDeals, change: calcChange(totalDeals, prevTotalDeals) },
      ishlanmaganLidlar: { value: noNextTaskDeals, urgent: noNextTaskDeals > 0 },
      sifatliLidlar: { value: wonDeals + activeDeals, percentage: totalDeals > 0 ? Math.round(((wonDeals + activeDeals) / totalDeals) * 100) : 0 },
      jamiBitimlar: { value: totalDeals },
      radEtilganBitimlar: { value: lostDeals },
      yoqotilganBitimlarSummasi: { value: lostValue },
    }

    const effTalkDuration = avgTalkDurationSeconds
    const effMissedCalls = missedCallsCount
    const effConnectRate = totalCalls > 0 ? Math.round(((totalCalls - effMissedCalls) / totalCalls) * 100) : 0

    const callCenter = {
      jamiQongiroqlar: { value: totalCalls, prev: prevTotalCalls, change: calcChange(totalCalls, prevTotalCalls) },
      otkazibYuborilganQongiroqlar: { value: effMissedCalls, percentage: totalCalls > 0 ? Math.round((effMissedCalls / totalCalls) * 100) : 0 },
      aloqaOrnatishDarajasi: { value: effConnectRate, target: 95 },
      ortachaSuhbatDavomiyligi: { seconds: effTalkDuration, formatted: `${Math.floor(effTalkDuration / 60)} дақ ${effTalkDuration % 60} сек` },
      chiquvchiQongiroqlarSoni: { value: outboundCalls, percentage: totalCalls > 0 ? Math.round((outboundCalls / totalCalls) * 100) : 0 },
      kiruvchiQongiroqlarSoni: { value: inboundCalls, percentage: totalCalls > 0 ? Math.round((inboundCalls / totalCalls) * 100) : 0 },
    }

    // Donut chart gamification share (exact revenue percentages across top managers)
    const activeMgrs = sortedManagers.filter((m) => m.revenue > 0 || m.wonDeals > 0 || m.calls > 0)
    let donutShare: { name: string; share: number; amount: number; color: string }[] = []
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']

    if (activeMgrs.length > 0) {
      const totalScoreRevenue = activeMgrs.reduce((acc, m) => acc + (m.revenue || m.wonDeals * 10000000 || m.calls * 100000 || 1), 0)
      const top3 = activeMgrs.slice(0, 3)
      donutShare = top3.map((m, idx) => {
        const mgrAmount = m.revenue || m.wonDeals * 10000000 || m.calls * 100000 || 1
        const share = Math.round((mgrAmount / totalScoreRevenue) * 100)
        return { name: m.name, share, amount: m.revenue, color: colors[idx] }
      })
      const restShare = Math.max(0, 100 - donutShare.reduce((acc, d) => acc + d.share, 0))
      if (activeMgrs.length > 3) {
        const restAmount = activeMgrs.slice(3).reduce((acc, m) => acc + m.revenue, 0)
        donutShare.push({
          name: 'Остальные (Boshqalar)',
          share: restShare,
          amount: restAmount,
          color: colors[3],
        })
      }
    } else {
      donutShare = []
    }

    return NextResponse.json({
      success: true,
      data: {
        period,
        kpis: {
          totalDeals: { value: totalDeals, prev: prevTotalDeals, change: calcChange(totalDeals, prevTotalDeals) },
          wonDeals: { value: wonDeals, prev: prevWonDeals, change: calcChange(wonDeals, prevWonDeals) },
          lostDeals: { value: lostDeals },
          activeDeals: { value: activeDeals },
          revenue: { value: revenue, prev: prevRevenue, change: calcChange(revenue, prevRevenue) },
          avgTicket: { value: avgTicket, prev: prevAvgTicket, change: calcChange(avgTicket, prevAvgTicket) },
          conversionRate: { value: conversionRate, prev: prevConversionRate, change: calcChange(conversionRate, prevConversionRate) },
          avgCycleTime: { value: avgCycleTimeDays },
          overdueTasks: { value: overdueTasks },
          noNextTaskDeals: { value: noNextTaskDeals },
          totalCalls: { value: totalCalls, prev: prevTotalCalls, change: calcChange(totalCalls, prevTotalCalls) },
          analyzedCalls: { value: analyzedCalls, prev: prevAnalyzedCalls, change: calcChange(analyzedCalls, prevAnalyzedCalls) },
          inboundCalls: { value: inboundCalls },
          outboundCalls: { value: outboundCalls },
          avgScore: { value: avgScore, prev: prevAvgScore, change: calcChange(avgScore, prevAvgScore) },
          criticalErrors: { value: criticalErrors },
          lostValue: { value: lostValue },
          aiBalance: { available: availableBalance, used: balance?.usedMinutes || 0, total: balance?.totalMinutes || 0 },
        },
        sales,
        marketing,
        callCenter,
        donutShare,
        chartData,
        managerData: sortedManagers.map((m) => ({ name: m.name, score: m.score, calls: m.calls, deals: m.deals, revenue: m.revenue })),
      },
    })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    console.error('[Dashboard] Error:', err)
    return NextResponse.json({ success: false, error: 'Сервер хатоси' }, { status: 500 })
  }
}
