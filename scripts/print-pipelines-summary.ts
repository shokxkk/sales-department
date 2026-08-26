import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const pipelines = await prisma.pipeline.findMany({
    include: { stages: true },
  })
  console.log('=== PIPELINES SUMMARY ===')
  for (const p of pipelines) {
    const dealsCount = await prisma.deal.count({ where: { pipelineId: p.id } })
    console.log(`\nPIPELINE [${p.id}] "${p.name}" (total deals: ${dealsCount})`)
    for (const s of p.stages) {
      const countInStage = await prisma.deal.count({ where: { stageId: s.id } })
      if (countInStage > 0) {
        const sumInStage = await prisma.deal.aggregate({ where: { stageId: s.id }, _sum: { budget: true } })
        console.log(`   Stage "${s.name}" (sort: ${s.sort}) -> deals: ${countInStage} | sum: ${Number(sumInStage._sum.budget||0).toLocaleString()} UZS`)
      }
    }
  }

  // Check deals where pipeline is NOT known or null
  const nullPipelineCount = await prisma.deal.count({ where: { pipelineId: null } })
  if (nullPipelineCount > 0) {
    console.log(`\nDeals with NULL pipelineId: ${nullPipelineCount}`)
  }

  // Also check why Nafisa and Shaxrizoda had high totals in our earlier script: what exactly did that script count?
  // Let's print each manager's WON sum by exact pipeline name
  console.log('\n=== MANAGER WON SUM BY PIPELINE ===')
  const managers = await prisma.manager.findMany({
    include: {
      deals: {
        include: { pipeline: true, stage: true }
      }
    }
  })
  for (const m of managers) {
    const wonDeals = m.deals.filter(d => 
      d.status === 'WON' || 
      d.status === 'won' || 
      d.stage?.name?.toLowerCase().includes('успешно') || 
      d.stage?.name?.toLowerCase().includes('realizovano') ||
      d.stage?.sort === 142
    )
    if (wonDeals.length > 0) {
      console.log(`Manager "${m.name}" has ${wonDeals.length} won deals:`)
      for (const d of wonDeals) {
        console.log(`   -> [${d.id.slice(0,8)}] budget: ${Number(d.budget||0).toLocaleString()} | pipeline: "${d.pipeline?.name}" | stage: "${d.stage?.name}"`)
      }
    }
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect())
