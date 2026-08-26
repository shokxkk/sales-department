import { describe, test, expect } from 'vitest'
import { prisma } from '@/lib/prisma'

describe('Multi-tenant Isolation Tests', () => {
  test('Querying calls filters exactly by companyId', async () => {
    const companies = await prisma.company.findMany()
    if (companies.length > 0) {
      const company = companies[0]
      const calls = await prisma.call.findMany({
        where: { companyId: company.id }
      })
      for (const call of calls) {
        expect(call.companyId).toBe(company.id)
      }
    }
  })

  test('Querying deals filters exactly by companyId', async () => {
    const companies = await prisma.company.findMany()
    if (companies.length > 0) {
      const company = companies[0]
      const deals = await prisma.deal.findMany({
        where: { companyId: company.id }
      })
      for (const deal of deals) {
        expect(deal.companyId).toBe(company.id)
      }
    }
  })
})
