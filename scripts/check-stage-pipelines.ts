import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const dealsByStage = await prisma.deal.findMany({
    where: {
      stage: {
        pipeline: {
          name: { in: ['Issiq mijozlar', 'Sovuq mijozlar', 'Сотув воронкаси'] }
        }
      }
    },
    include: { stage: { include: { pipeline: true } }, pipeline: true, manager: true }
  })

  console.log(`=== DEALS BY STAGE.PIPELINE (${dealsByStage.length}) ===`)
  let wonCount = 0
  let wonSum = 0
  for (const d of dealsByStage) {
    const isStageWon = d.status === 'WON' || d.status === 'won' || d.stage?.sort === 10000 || d.stage?.sort === 142 || d.stage?.name?.toLowerCase().includes('успешно')
    if (isStageWon) {
      wonCount++
      wonSum += Number(d.budget || 0)
      console.log(`[WON] Deal "${d.name}" | budget: ${Number(d.budget||0).toLocaleString()} | status: "${d.status}" | deal.pipeline: "${d.pipeline?.name}" | stage.pipeline: "${d.stage?.pipeline?.name}" | stage: "${d.stage?.name}" | manager: "${d.manager?.name}"`)
    }
  }
  console.log(`Total Won in True Sales Stages: ${wonCount} deals -> ${wonSum.toLocaleString()} UZS`)
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect())
