import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

async function main() {
  const company = await p.company.findFirst()
  if (!company) {
    console.log('No company')
    return
  }

  const managers = await p.manager.findMany({ where: { companyId: company.id } })
  console.log('--- MANAGERS ---')
  console.log(managers.map(m => ({ id: m.id, name: m.name, crmId: m.crmId })))

  const sampleCalls = await p.call.findMany({
    where: { companyId: company.id },
    take: 5,
    orderBy: { startedAt: 'desc' },
    include: { manager: true, customer: true }
  })
  console.log('\n--- SAMPLE CALLS ---')
  console.log(sampleCalls.map(c => ({
    id: c.id,
    phone: c.customerPhone,
    manager: c.manager?.name,
    customer: c.customer?.name,
    duration: c.talkDurationSeconds,
    status: c.status,
    externalRecordingUrl: c.externalRecordingUrl,
    startedAt: c.startedAt
  })))

  const sampleLostDeals = await p.deal.findMany({
    where: { companyId: company.id, status: 'lost' },
    take: 5,
    orderBy: { updatedAt: 'desc' },
    include: { manager: true, customer: true, refusalReason: true }
  })
  console.log('\n--- SAMPLE LOST DEALS ---')
  console.log(sampleLostDeals.map(d => ({
    id: d.id,
    name: d.name,
    budget: d.budget,
    manager: d.manager?.name,
    customer: d.customer?.name,
    refusalReason: d.refusalReason?.name,
    closedAt: d.closedAt
  })))
}

main().finally(() => p.$disconnect())
