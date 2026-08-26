import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const deals = await prisma.deal.findMany({
    where: {
      name: { in: ['Орман', 'BIBIKE', 'Time o\'quv markazi', 'Uz car plast'] }
    },
    include: {
      pipeline: true,
      stage: { include: { pipeline: true } },
      manager: true,
    }
  })

  console.log(`=== SPECIFIC DEALS (${deals.length}) ===`)
  for (const d of deals) {
    console.log(`Deal "${d.name}" [companyId: ${d.companyId}]`)
    console.log(`   -> d.pipeline?.name: "${d.pipeline?.name}"`)
    console.log(`   -> d.stage?.name: "${d.stage?.name}"`)
    console.log(`   -> d.stage?.pipeline?.name: "${d.stage?.pipeline?.name}"`)
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect())
