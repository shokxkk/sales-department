import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

async function main() {
  const companies = await p.company.findMany()
  console.log('Companies count:', companies.length)
  for (const c of companies) {
    const managers = await p.manager.count({ where: { companyId: c.id } })
    const customers = await p.customer.count({ where: { companyId: c.id } })
    const deals = await p.deal.count({ where: { companyId: c.id } })
    const calls = await p.call.count({ where: { companyId: c.id } })
    const audits = await p.audit.count({ where: { companyId: c.id } })
    const transcripts = await p.callTranscript.count({ where: { companyId: c.id } })
    const crm = await p.cRMIntegration.findMany({ where: { companyId: c.id } })
    console.log(`\nCompany [${c.name}] (${c.id})`)
    console.log(`- Managers: ${managers}`)
    console.log(`- Customers: ${customers}`)
    console.log(`- Deals: ${deals}`)
    console.log(`- Calls: ${calls}`)
    console.log(`- Audits: ${audits}`)
    console.log(`- Transcripts: ${transcripts}`)
    console.log(`- CRM Integrations:`, crm.map(x => ({ provider: x.provider, status: x.status, lastSyncAt: x.lastSyncAt })))
  }
}

main().finally(() => p.$disconnect())
