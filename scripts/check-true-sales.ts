import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const deals = await prisma.deal.findMany({
    include: { pipeline: true, stage: true, manager: true }
  })

  let totalWonDeals = 0
  let totalWonSum = 0
  const managerStats: Record<string, { name: string; wonCount: number; wonSum: number; totalDeals: number; totalCalls: number }> = {}

  const managers = await prisma.manager.findMany({ include: { _count: { select: { calls: true } } } })
  for (const m of managers) {
    managerStats[m.id] = { name: m.name, wonCount: 0, wonSum: 0, totalDeals: 0, totalCalls: m._count.calls }
  }

  for (const d of deals) {
    const pName = (d.pipeline?.name || '').toLowerCase()
    const isServiceOrTech = pName.includes('тех') ||
                            pName.includes('тикет') ||
                            pName.includes('сервис') ||
                            pName.includes('sifat') ||
                            pName.includes('pm map') ||
                            pName.includes('adaptatsiya') ||
                            pName.includes('nastroyka')

    if (isServiceOrTech) {
      continue // Skip service and technical pipelines from sales stats
    }

    if (d.managerId && managerStats[d.managerId]) {
      managerStats[d.managerId].totalDeals++
    }

    const stageName = (d.stage?.name || '').toLowerCase()
    const isStageWon = d.status === 'WON' ||
                       d.status === 'won' ||
                       d.stage?.sort === 142 ||
                       d.stage?.sort === 10000 ||
                       stageName.includes('успешно') ||
                       stageName.includes('реализовано') ||
                       stageName.includes('muvaffaqiyatli') ||
                       stageName.includes('yopild')

    if (isStageWon) {
      const budget = Number(d.budget || 0)
      totalWonDeals++
      totalWonSum += budget

      if (d.managerId && managerStats[d.managerId]) {
        managerStats[d.managerId].wonCount++
        managerStats[d.managerId].wonSum += budget
      }
    }
  }

  console.log(`=== TRUE SALES STATS (Excluding Service & Technical Pipelines) ===`)
  console.log(`Total Sotuv Won Deals Count: ${totalWonDeals}`)
  console.log(`Total Sotuv Won Sum: ${totalWonSum.toLocaleString()} UZS`)

  console.log(`\n=== MANAGER LEADERBOARD (True Sales Only) ===`)
  const leaderList = Object.values(managerStats)
    .filter(m => m.wonCount > 0 || m.totalDeals > 0 || m.totalCalls > 0)
    .sort((a, b) => b.wonSum - a.wonSum || b.wonCount - a.wonCount || b.totalCalls - a.totalCalls)

  for (let i = 0; i < leaderList.length; i++) {
    const m = leaderList[i]
    console.log(`#${i + 1} "${m.name}" -> wonSum: ${m.wonSum.toLocaleString()} UZS | wonDeals: ${m.wonCount} | totalDeals: ${m.totalDeals} | totalCalls: ${m.totalCalls}`)
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect())
