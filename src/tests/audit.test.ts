import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'

describe('Audit Score Override & History Tests', () => {
  let companyId: string
  let userId: string
  let managerId: string
  let callId: string
  let auditId: string
  let criterionId: string

  beforeAll(async () => {
    // 1. Create company
    const company = await prisma.company.create({
      data: {
        name: 'Audit Override Test Co',
        slug: `audit-test-${Date.now()}`,
        status: 'ACTIVE',
      },
    })
    companyId = company.id

    // 2. Create user
    const user = await prisma.user.create({
      data: {
        email: `tester-${Date.now()}@demo.uz`,
        name: 'Score Override Tester',
        passwordHash: 'hashed_password',
      },
    })
    userId = user.id

    // Link user to company
    await prisma.companyUser.create({
      data: {
        companyId,
        userId,
        role: UserRole.COMPANY_ADMIN,
      },
    })

    // 3. Create manager
    const manager = await prisma.manager.create({
      data: {
        companyId,
        crmId: 'mgr-test',
        name: 'Demo Manager',
      },
    })
    managerId = manager.id

    // 4. Create call
    const call = await prisma.call.create({
      data: {
        companyId,
        telephonyProvider: 'ONLINEPBX',
        externalCallId: `call-test-${Date.now()}`,
        direction: 'INBOUND',
        status: 'ANSWERED',
        customerPhone: '+998901111111',
        startedAt: new Date(),
        talkDurationSeconds: 120,
      },
    })
    callId = call.id

    // 5. Create checklist criterion
    const criterion = await prisma.auditCriterion.create({
      data: {
        code: `crit-test-${Date.now()}`,
        section: 'greeting',
        nameUz: 'Саломлашди',
        nameRu: 'Поприветствовал',
        maxScore: 10,
        sort: 1,
      },
    })
    criterionId = criterion.id

    // 6. Create audit with results
    const audit = await prisma.audit.create({
      data: {
        callId,
        companyId,
        aiScore: 8,
        finalScore: 8,
        maxPossibleScore: 10,
        summary: 'Test summary',
        strengthsJson: ['Good'],
        mistakesJson: ['None'],
        recommendationsJson: ['Keep it up'],
        rawAiResponseJson: {},
        criterionResults: {
          create: {
            criterionId,
            criterionCode: criterion.code,
            aiScore: 8,
            finalScore: 8,
            maxScore: 10,
            passed: true,
            explanationUz: 'Excelent greeting',
          },
        },
      },
    })
    auditId = audit.id
  })

  afterAll(async () => {
    // Clean up
    await prisma.auditScoreHistory.deleteMany({ where: { auditId } }).catch(() => null)
    await prisma.auditCriterionResult.deleteMany({ where: { auditId } }).catch(() => null)
    await prisma.audit.delete({ where: { id: auditId } }).catch(() => null)
    await prisma.auditCriterion.delete({ where: { id: criterionId } }).catch(() => null)
    await prisma.call.delete({ where: { id: callId } }).catch(() => null)
    await prisma.manager.delete({ where: { id: managerId } }).catch(() => null)
    await prisma.companyUser.deleteMany({ where: { companyId } }).catch(() => null)
    await prisma.user.delete({ where: { id: userId } }).catch(() => null)
    await prisma.company.delete({ where: { id: companyId } }).catch(() => null)
  })

  test('Should override score, recalculate total, and log history', async () => {
    const newScore = 10

    const updatedTotal = await prisma.$transaction(async (tx) => {
      // Fetch Criterion Result
      const cr = await tx.auditCriterionResult.findUnique({
        where: { auditId_criterionId: { auditId, criterionId } },
      })
      expect(cr).toBeDefined()
      expect(cr!.finalScore).toBe(8)

      // Update Result score
      await tx.auditCriterionResult.update({
        where: { id: cr!.id },
        data: { finalScore: newScore },
      })

      // Recalculate
      const allResults = await tx.auditCriterionResult.findMany({
        where: { auditId },
      })
      const scoreSum = allResults.reduce((sum, r) => sum + r.finalScore, 0)

      await tx.audit.update({
        where: { id: auditId },
        data: { finalScore: scoreSum },
      })

      // Log History
      await tx.auditScoreHistory.create({
        data: {
          auditId,
          criterionId,
          changedBy: userId,
          oldScore: cr!.finalScore,
          newScore,
          comment: 'Improved score manually',
        },
      })

      return scoreSum
    })

    expect(updatedTotal).toBe(10)

    // Verify history logs
    const history = await prisma.auditScoreHistory.findFirst({
      where: { auditId, criterionId },
    })
    expect(history).toBeDefined()
    expect(history!.oldScore).toBe(8)
    expect(history!.newScore).toBe(10)
    expect(history!.changedBy).toBe(userId)
    expect(history!.comment).toBe('Improved score manually')
  })
})
