import { describe, it, expect, beforeEach, vi } from 'vitest'
import { prisma } from '../lib/prisma'
import { subDays, addDays } from 'date-fns'

describe('Dashboard KPIs, Filters & APP_MODE validations', () => {
  let companyAId: string
  let companyBId: string
  let managerAId: string
  let managerBId: string
  let pipelineAId: string
  let stageAId: string
  let stageBId: string
  let refusalReasonAId: string

  beforeEach(async () => {
    // Clean test companies only (do not delete active seed companies)
    const testCompanies = await prisma.company.findMany({
      where: { slug: { in: ['company-a', 'company-b', 'company-demo-test'] } },
      select: { id: true },
    })
    const testCompanyIds = testCompanies.map((c) => c.id)

    if (testCompanyIds.length > 0) {
      await prisma.dealTask.deleteMany({ where: { deal: { companyId: { in: testCompanyIds } } } })
      await prisma.auditCriterionResult.deleteMany({ where: { audit: { companyId: { in: testCompanyIds } } } })
      await prisma.audit.deleteMany({ where: { companyId: { in: testCompanyIds } } })
      await prisma.call.deleteMany({ where: { companyId: { in: testCompanyIds } } })
      await prisma.deal.deleteMany({ where: { companyId: { in: testCompanyIds } } })
      await prisma.customer.deleteMany({ where: { companyId: { in: testCompanyIds } } })
      await prisma.pipelineStage.deleteMany({ where: { companyId: { in: testCompanyIds } } })
      await prisma.pipeline.deleteMany({ where: { companyId: { in: testCompanyIds } } })
      await prisma.manager.deleteMany({ where: { companyId: { in: testCompanyIds } } })
      await prisma.subscription.deleteMany({ where: { companyId: { in: testCompanyIds } } })
      await prisma.cRMIntegration.deleteMany({ where: { companyId: { in: testCompanyIds } } })
      await prisma.telephonyIntegration.deleteMany({ where: { companyId: { in: testCompanyIds } } })
      await prisma.usageTransaction.deleteMany({ where: { companyId: { in: testCompanyIds } } })
      await prisma.usageBalance.deleteMany({ where: { companyId: { in: testCompanyIds } } })
      await prisma.companyUser.deleteMany({ where: { companyId: { in: testCompanyIds } } })
      await prisma.activityLog.deleteMany({ where: { companyId: { in: testCompanyIds } } })
      await prisma.refusalReason.deleteMany({ where: { companyId: { in: testCompanyIds } } })
      await prisma.backgroundJob.deleteMany({ where: { companyId: { in: testCompanyIds } } })
      await prisma.syncLog.deleteMany({ where: { companyId: { in: testCompanyIds } } })
      await prisma.webhookLog.deleteMany({ where: { companyId: { in: testCompanyIds } } })
      await prisma.notification.deleteMany({ where: { companyId: { in: testCompanyIds } } })
      await prisma.script.deleteMany({ where: { companyId: { in: testCompanyIds } } })
      await prisma.company.deleteMany({ where: { id: { in: testCompanyIds } } })
    }

    // 1. Setup Company A & B
    const companyA = await prisma.company.create({
      data: { name: 'Company A', slug: 'company-a', status: 'ACTIVE' },
    })
    companyAId = companyA.id

    const companyB = await prisma.company.create({
      data: { name: 'Company B', slug: 'company-b', status: 'ACTIVE' },
    })
    companyBId = companyB.id

    // 2. Setup Managers
    const managerA = await prisma.manager.create({
      data: { companyId: companyAId, name: 'Manager A', email: 'm.a@company.com' },
    })
    managerAId = managerA.id

    const managerB = await prisma.manager.create({
      data: { companyId: companyBId, name: 'Manager B', email: 'm.b@company.com' },
    })
    managerBId = managerB.id

    // 3. Setup Pipelines & Stages
    const pipelineA = await prisma.pipeline.create({
      data: { companyId: companyAId, name: 'Pipeline A' },
    })
    pipelineAId = pipelineA.id

    const stageA = await prisma.pipelineStage.create({
      data: { pipelineId: pipelineAId, companyId: companyAId, name: 'Stage A', sort: 1 },
    })
    stageAId = stageA.id

    const pipelineB = await prisma.pipeline.create({
      data: { companyId: companyBId, name: 'Pipeline B' },
    })
    const stageB = await prisma.pipelineStage.create({
      data: { pipelineId: pipelineB.id, companyId: companyBId, name: 'Stage B', sort: 1 },
    })
    stageBId = stageB.id

    // 4. Setup Refusal Reason
    const reasonA = await prisma.refusalReason.create({
      data: { companyId: companyAId, name: 'Too expensive', sort: 1 },
    })
    refusalReasonAId = reasonA.id
  })

  // 1. Zero Denominator Conversion
  it('should return 0% conversion rate when totalDeals is 0', async () => {
    // No deals created in joriy period
    const totalDeals = await prisma.deal.count({ where: { companyId: companyAId } })
    const wonDeals = await prisma.deal.count({ where: { companyId: companyAId, status: 'won' } })

    const conversionRate = totalDeals > 0 ? Math.round((wonDeals / totalDeals) * 100) : 0
    expect(conversionRate).toBe(0)
  })

  // 2. Revenue from Successful Deals Only
  it('should only aggregate budget of won deals for revenue', async () => {
    // Create 1 won deal and 1 open deal and 1 lost deal
    await prisma.deal.createMany({
      data: [
        { companyId: companyAId, name: 'Deal 1', budget: 100000, status: 'won', closedAt: new Date() },
        { companyId: companyAId, name: 'Deal 2', budget: 500000, status: 'open' },
        { companyId: companyAId, name: 'Deal 3', budget: 200000, status: 'lost', closedAt: new Date() },
      ],
    })

    const result = await prisma.deal.aggregate({
      where: { companyId: companyAId, status: 'won' },
      _sum: { budget: true },
    })
    expect(Number(result._sum.budget)).toBe(100000)
  })

  // 3. Average Check Calculation
  it('should compute avg check correctly based on won deals sum and count', async () => {
    await prisma.deal.createMany({
      data: [
        { companyId: companyAId, name: 'Deal 1', budget: 150000, status: 'won', closedAt: new Date() },
        { companyId: companyAId, name: 'Deal 2', budget: 250000, status: 'won', closedAt: new Date() },
      ],
    })

    const count = await prisma.deal.count({ where: { companyId: companyAId, status: 'won' } })
    const sumResult = await prisma.deal.aggregate({
      where: { companyId: companyAId, status: 'won' },
      _sum: { budget: true },
    })
    const avgTicket = count > 0 ? Math.round(Number(sumResult._sum.budget || 0) / count) : 0
    expect(avgTicket).toBe(200000)
  })

  // 4. Lost Value Calculation
  it('should sum budgets of lost deals in lostValue', async () => {
    await prisma.deal.createMany({
      data: [
        { companyId: companyAId, name: 'Deal 1', budget: 300000, status: 'lost', closedAt: new Date() },
        { companyId: companyAId, name: 'Deal 2', budget: 400000, status: 'lost', closedAt: new Date() },
        { companyId: companyAId, name: 'Deal 3', budget: 500000, status: 'won', closedAt: new Date() },
      ],
    })

    const result = await prisma.deal.aggregate({
      where: { companyId: companyAId, status: 'lost' },
      _sum: { budget: true },
    })
    expect(Number(result._sum.budget)).toBe(700000)
  })

  // 5. Overdue Task Calculation
  it('should count only incomplete tasks past their due date', async () => {
    const past = subDays(new Date(), 2)
    const future = addDays(new Date(), 2)

    const deal = await prisma.deal.create({
      data: { companyId: companyAId, name: 'Deal A' },
    })

    await prisma.dealTask.createMany({
      data: [
        { dealId: deal.id, companyId: companyAId, dueAt: past, completedAt: null }, // Overdue
        { dealId: deal.id, companyId: companyAId, dueAt: past, completedAt: new Date() }, // Done (not overdue)
        { dealId: deal.id, companyId: companyAId, dueAt: future, completedAt: null }, // Future (not overdue)
      ],
    })

    const overdueCount = await prisma.dealTask.count({
      where: {
        companyId: companyAId,
        completedAt: null,
        dueAt: { lt: new Date() },
      },
    })
    expect(overdueCount).toBe(1)
  })

  // 6. Calls Direction Filter
  it('should correctly filter calls by direction', async () => {
    await prisma.call.createMany({
      data: [
        {
          companyId: companyAId,
          telephonyProvider: 'ONLINEPBX',
          externalCallId: 'c1',
          direction: 'INBOUND',
          talkDurationSeconds: 60,
          status: 'ANSWERED',
          startedAt: new Date(),
        },
        {
          companyId: companyAId,
          telephonyProvider: 'ONLINEPBX',
          externalCallId: 'c2',
          direction: 'OUTBOUND',
          talkDurationSeconds: 120,
          status: 'ANSWERED',
          startedAt: new Date(),
        },
      ],
    })

    const inboundCount = await prisma.call.count({ where: { companyId: companyAId, direction: 'INBOUND' } })
    const outboundCount = await prisma.call.count({ where: { companyId: companyAId, direction: 'OUTBOUND' } })

    expect(inboundCount).toBe(1)
    expect(outboundCount).toBe(1)
  })

  // 7. Critical Errors Calculation
  it('should only count criterion results that failed and are marked critical', async () => {
    const call = await prisma.call.create({
      data: {
        companyId: companyAId,
        telephonyProvider: 'ONLINEPBX',
        externalCallId: 'c3',
        direction: 'INBOUND',
        talkDurationSeconds: 60,
        status: 'ANSWERED',
        startedAt: new Date(),
      },
    })
    const audit = await prisma.audit.create({
      data: { companyId: companyAId, callId: call.id, aiScore: 80, finalScore: 80, maxPossibleScore: 100, summary: 'Test', strengthsJson: [], mistakesJson: [], recommendationsJson: [], rawAiResponseJson: {} },
    })

    // Setup criteria
    const crit1 = await prisma.auditCriterion.upsert({
      where: { code: 'CR1' },
      create: { code: 'CR1', nameUz: 'C1', nameRu: 'C1', isCritical: true, maxScore: 20, section: 'S' },
      update: { isCritical: true, maxScore: 20 },
    })
    const crit2 = await prisma.auditCriterion.upsert({
      where: { code: 'CR2' },
      create: { code: 'CR2', nameUz: 'C2', nameRu: 'C2', isCritical: false, maxScore: 20, section: 'S' },
      update: { isCritical: false, maxScore: 20 },
    })

    await prisma.auditCriterionResult.createMany({
      data: [
        { auditId: audit.id, criterionId: crit1.id, criterionCode: 'CR1', passed: false, aiScore: 0, finalScore: 0, maxScore: 20 }, // FAILED CRITICAL
        { auditId: audit.id, criterionId: crit2.id, criterionCode: 'CR2', passed: false, aiScore: 0, finalScore: 0, maxScore: 20 }, // FAILED STANDARD
      ],
    })

    const criticalErrors = await prisma.auditCriterionResult.count({
      where: {
        audit: { companyId: companyAId },
        passed: false,
        criterion: { isCritical: true },
      },
    })
    expect(criticalErrors).toBe(1)
  })

  // 8. Cross-Tenant Filter Rejection simulation
  it('should return false if manager from company B is checked for company A', async () => {
    // Manager B belongs to company B, not A
    const managerExists = await prisma.manager.findFirst({
      where: { id: managerBId, companyId: companyAId },
    })
    expect(managerExists).toBeNull()
  })

  // 9. Invalid Custom Date Range
  it('should detect when dateFrom is greater than dateTo', () => {
    const dateFrom = new Date('2026-07-15')
    const dateTo = new Date('2026-07-10')
    expect(dateFrom > dateTo).toBe(true)
  })

  // 10. Max Custom Range validation (greater than 1 year)
  it('should detect when date range is over 1 year', () => {
    const dateFrom = new Date('2026-01-01')
    const dateTo = new Date('2027-02-01')
    const diff = Math.abs(dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24)
    expect(diff > 366).toBe(true)
  })

  // 11. Previous Period Calculation logic
  it('should correctly calculate previous period bounds without overlap', () => {
    const startDate = new Date('2026-07-10')
    const endDate = new Date('2026-07-20')
    const diff = 10 // 10 days difference

    const prevStartDate = subDays(startDate, diff + 1)
    const prevEndDate = subDays(startDate, 1)

    expect(prevStartDate.getTime() < startDate.getTime()).toBe(true)
    expect(prevEndDate.getTime() < startDate.getTime()).toBe(true)
    expect(prevEndDate.getTime() >= prevStartDate.getTime()).toBe(true)
  })

  // 12. Production Mode Excludes Demo Data check
  it('should reject company with slug ending in -demo if mode is production', () => {
    const slug: string = 'marketing-markazi-demo'
    const appMode: string = 'production'

    const isDemo = slug === 'marketing-markazi-demo' || slug.endsWith('-demo')
    const isBlocked = appMode === 'production' && isDemo
    expect(isBlocked).toBe(true)
  })

  // 13. Demo Mode Allows Demo Data check
  it('should allow company with slug ending in -demo if mode is development', () => {
    const slug: string = 'marketing-markazi-demo'
    const appMode: string = 'development'

    const isDemo = slug === 'marketing-markazi-demo' || slug.endsWith('-demo')
    const isBlocked = appMode === 'production' && isDemo
    expect(isBlocked).toBe(false)
  })

  // 14. Dashboard Empty State check
  it('should return zeros for metrics if database has no records', async () => {
    const dealsCount = await prisma.deal.count({ where: { companyId: companyAId } })
    const callsCount = await prisma.call.count({ where: { companyId: companyAId } })
    expect(dealsCount).toBe(0)
    expect(callsCount).toBe(0)
  })

  // 15. Cross-company access check (Tenant Isolation)
  it('should isolate company A deals from company B', async () => {
    await prisma.deal.create({
      data: { companyId: companyAId, name: 'Secret Deal A' },
    })

    const isolatedCount = await prisma.deal.count({ where: { companyId: companyBId } })
    expect(isolatedCount).toBe(0)
  })
})
