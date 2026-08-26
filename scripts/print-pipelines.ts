import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const pipelines = await prisma.pipeline.findMany({
    include: {
      stages: true,
      _count: { select: { deals: true } },
    },
  })
  console.log('=== EXACT PIPELINES & STAGES ===')
  for (const p of pipelines) {
    console.log(`Pipeline: "${p.name}" [ID: ${p.id}] (deals count: ${p._count.deals})`)
    for (const s of p.stages) {
      const dealsInStage = await prisma.deal.count({ where: { stageId: s.id } })
      const wonDealsInStage = await prisma.deal.count({ where: { stageId: s.id, status: 'WON' } })
      const stageSum = await prisma.deal.aggregate({ where: { stageId: s.id }, _sum: { budget: true } })
      console.log(`   -> Stage: "${s.name}" (sort: ${s.sort}) | total: ${dealsInStage} | won: ${wonDealsInStage} | sum: ${stageSum._sum.budget || 0}`)
    }
  }

  // Also check all deals where budget > 0 or status == WON
  const wonOrBudgetDeals = await prisma.deal.findMany({
    where: {
      OR: [
        { status: 'WON' },
        { status: 'won' },
        { budget: { gt: 0 } }
      ]
    },
    include: { pipeline: true, stage: true, manager: true }
  })
  console.log(`\n=== DEALS WITH STATUS WON OR BUDGET > 0 (Total: ${wonOrBudgetDeals.length}) ===`)
  let totalWonSum = 0
  let salesPipelineWonSum = 0
  for (const d of wonOrBudgetDeals) {
    const isSalesPipeline = !d.pipeline?.name?.toLowerCase().includes('тех') && 
                            !d.pipeline?.name?.toLowerCase().includes('сервис') &&
                            !d.pipeline?.name?.toLowerCase().includes('тикет') &&
                            !d.pipeline?.name?.toLowerCase().includes('support')
    const isStageWon = d.status?.toUpperCase() === 'WON' || 
                       d.stage?.name?.toLowerCase().includes('успешно') || 
                       d.stage?.name?.toLowerCase().includes('реализовано')
    
    if (isStageWon) {
      totalWonSum += Number(d.budget || 0)
      if (isSalesPipeline) {
        salesPipelineWonSum += Number(d.budget || 0)
      }
    }
    console.log(`Deal [${d.id.slice(0,8)}] budget: ${Number(d.budget||0).toLocaleString()} | status: "${d.status}" | pipeline: "${d.pipeline?.name}" | stage: "${d.stage?.name}" | manager: "${d.manager?.name}"`)
  }
  console.log(`\nTotal WON Sum across all pipelines: ${totalWonSum.toLocaleString()} UZS`)
  console.log(`Total WON Sum in Sales/Mijozlar pipelines (excluding service/tech): ${salesPipelineWonSum.toLocaleString()} UZS`)
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect())
