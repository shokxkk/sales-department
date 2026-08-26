import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from '@/lib/prisma'

describe('Balance Transaction & Reservation Tests', () => {
  let companyId: string

  beforeAll(async () => {
    // Create a temporary test company
    const company = await prisma.company.create({
      data: {
        name: 'Balance Test Company',
        slug: `balance-test-${Date.now()}`,
        status: 'ACTIVE',
      },
    })
    companyId = company.id

    // Initialize balance
    await prisma.usageBalance.create({
      data: {
        companyId,
        totalMinutes: 100,
        usedMinutes: 0,
        reservedMinutes: 0,
      },
    })
  })

  afterAll(async () => {
    // Clean up
    await prisma.usageTransaction.deleteMany({ where: { companyId } }).catch(() => null)
    await prisma.usageBalance.delete({ where: { companyId } }).catch(() => null)
    await prisma.company.delete({ where: { id: companyId } }).catch(() => null)
  })

  test('Should reserve minutes and log transaction correctly', async () => {
    const requiredMinutes = 10

    // Reserve inside a transaction
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT * FROM usage_balances WHERE "companyId" = ${companyId} FOR UPDATE`

      const balance = await tx.usageBalance.findUnique({
        where: { companyId },
      })

      expect(balance).toBeDefined()
      const available = balance!.totalMinutes - balance!.usedMinutes - balance!.reservedMinutes
      expect(available).toBe(100)

      await tx.usageBalance.update({
        where: { companyId },
        data: { reservedMinutes: { increment: requiredMinutes } },
      })

      await tx.usageTransaction.create({
        data: {
          companyId,
          type: 'RESERVE',
          minutes: requiredMinutes,
          balanceBefore: available,
          balanceAfter: available - requiredMinutes,
          description: 'Test reservation',
        },
      })
    })

    // Verify after transaction
    const balance = await prisma.usageBalance.findUnique({ where: { companyId } })
    expect(balance!.reservedMinutes).toBe(10)

    const available = balance!.totalMinutes - balance!.usedMinutes - balance!.reservedMinutes
    expect(available).toBe(90)

    const txLog = await prisma.usageTransaction.findFirst({
      where: { companyId, type: 'RESERVE' },
    })
    expect(txLog).toBeDefined()
    expect(txLog!.minutes).toBe(requiredMinutes)
  })

  test('Should refund reserved minutes correctly', async () => {
    const refundMinutes = 10

    const balanceBefore = await prisma.usageBalance.findUnique({ where: { companyId } })
    const availableBefore = balanceBefore!.totalMinutes - balanceBefore!.usedMinutes - balanceBefore!.reservedMinutes

    await prisma.usageBalance.update({
      where: { companyId },
      data: { reservedMinutes: { decrement: refundMinutes } },
    })

    await prisma.usageTransaction.create({
      data: {
        companyId,
        type: 'REFUND',
        minutes: refundMinutes,
        balanceBefore: availableBefore,
        balanceAfter: availableBefore + refundMinutes,
        description: 'Test refund',
      },
    })

    const balanceAfter = await prisma.usageBalance.findUnique({ where: { companyId } })
    expect(balanceAfter!.reservedMinutes).toBe(0)
    expect(balanceAfter!.totalMinutes - balanceAfter!.usedMinutes).toBe(100)
  })
})
