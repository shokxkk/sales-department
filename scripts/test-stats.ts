import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const p = new PrismaClient()

async function checkStats() {
  const c = await p.company.findFirst()
  if (!c) {
    console.log('No company found.')
    return
  }
  const deals = await p.deal.count({ where: { companyId: c.id } })
  const won = await p.deal.count({ where: { companyId: c.id, status: 'won' } })
  const lost = await p.deal.count({ where: { companyId: c.id, status: 'lost' } })
  const open = await p.deal.count({ where: { companyId: c.id, status: 'open' } })
  const calls = await p.call.count({ where: { companyId: c.id } })
  const managers = await p.manager.findMany({ where: { companyId: c.id } })

  console.log({
    companyId: c.id,
    companyName: c.name,
    deals,
    won,
    lost,
    open,
    calls,
    managersCount: managers.length,
    managers: managers.map(m => m.name)
  })
  await p.$disconnect()
}

checkStats().catch(console.error)
