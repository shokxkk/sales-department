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
    console.log(`Deal [${d.id.slice(0,8)}] "${d.name}" | budget: ${d.budget} | status: "${d.status}" | stage: "${d.stage?.name}" (sort: ${d.stage?.sort}) | manager: "${d.manager?.name}"`)
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect())
