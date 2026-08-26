import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const pipelines = await prisma.pipeline.findMany({
    include: { stages: true },
  })
  console.log('--- PIPELINES IN DB ---')
  for (const p of pipelines) {
    console.log(`Pipeline [${p.id}] name: "${p.name}" (isActive: ${p.isActive})`)
    for (const s of p.stages) {
      console.log(`  Stage [${s.id}] name: "${s.name}" (code/status: ${s.sort})`)
    }
  }

  const deals = await prisma.deal.findMany({
    include: {
      pipeline: true,
      stage: true,
      manager: true,
    },
  })
  console.log(`\n--- DEALS IN DB (Total: ${deals.length}) ---`)
  for (const d of deals) {
    console.log(
      `Deal [${d.id}] name: "${d.name}" | status: "${d.status}" | budget: ${d.budget} | pipeline: "${d.pipeline?.name || 'N/A'}" | stage: "${d.stage?.name || 'N/A'}" | manager: "${d.manager?.name || 'N/A'}"`
    )
  }

  // Also check manager aggregation right now
  const managers = await prisma.manager.findMany({
    include: {
      deals: {
        include: { pipeline: true, stage: true },
      },
      calls: true,
    },
  })
  console.log(`\n--- MANAGERS IN DB (Total: ${managers.length}) ---`)
  for (const m of managers) {
    let wonSum = 0
    let wonCount = 0
    for (const d of m.deals) {
      if (d.status === 'WON' || d.status === 'won' || d.stage?.name?.toLowerCase().includes('успешно') || d.stage?.name?.toLowerCase().includes('realizovano')) {
        wonSum += Number(d.budget || 0)
        wonCount++
      }
    }
    console.log(`Manager [${m.id}] name: "${m.name}" | totalDeals: ${m.deals.length} | wonDeals: ${wonCount} | wonSum: ${wonSum} | totalCalls: ${m.calls.length}`)
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect())
