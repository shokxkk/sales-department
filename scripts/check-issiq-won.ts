import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const deals = await prisma.deal.findMany({
    where: {
      pipeline: {
        name: { in: ['Issiq mijozlar', 'Sovuq mijozlar'] }
      }
    },
    include: { stage: true, manager: true, pipeline: true }
  })

  console.log(`=== ISSIQ & SOVUQ MIJOZLAR DEALS (${deals.length}) ===`)
  for (const d of deals) {
    if (d.stage?.name?.toLowerCase().includes('успешно') || d.stage?.sort === 10000 || d.status === 'WON' || d.status === 'won') {
      console.log(`Deal [${d.id.slice(0,8)}] "${d.name}" | budget: ${Number(d.budget||0).toLocaleString()} | status: "${d.status}" | stage: "${d.stage?.name}" (sort: ${d.stage?.sort}) | manager: "${d.manager?.name}" (managerId: ${d.managerId})`)
    }
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect())
