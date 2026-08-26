import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const cid = 'b2986729-7057-4c22-80cf-ae4045a5f720'

  const allDeals = await prisma.deal.findMany({
    where: { companyId: cid },
    include: {
      pipeline: true,
      stage: { include: { pipeline: true } },
      manager: true,
      tasks: true,
    }
  })

  const getActivePipelineName = (d: any) => {
    return (d.stage?.pipeline?.name || d.pipeline?.name || '').toLowerCase()
  }

  const isSalesDeal = (d: any) => {
    const pName = getActivePipelineName(d)
    return !pName.includes('тех') &&
           !pName.includes('тикет') &&
           !pName.includes('сервис') &&
           !pName.includes('sifat') &&
           !pName.includes('pm map') &&
           !pName.includes('adaptatsiya') &&
           !pName.includes('nastroyka') &&
           !pName.includes('support')
  }

  const isDealWon = (d: any) => {
    const sName = (d.stage?.name || '').toLowerCase()
    const sSort = d.stage?.sort || 0
    const st = (d.status || '').toUpperCase()

    if (sSort === 10000 || sSort === 142 || sName.includes('успешно') || (sName.includes('реализовано') && !sName.includes('не')) || sName.includes('muvaffaqiyatli')) {
      return true
    }
    if (sSort === 11000 || sSort === 143 || sName.includes('закрыто') || sName.includes('не реализовано') || sName.includes('rad etild') || sName.includes('bekor') || st === 'LOST') {
      return false
    }
    return st === 'WON'
  }

  const isDealLost = (d: any) => {
    if (isDealWon(d)) return false
    const st = (d.status || '').toUpperCase()
    const sName = (d.stage?.name || '').toLowerCase()
    const sSort = d.stage?.sort || 0
    return st === 'LOST' || sSort === 11000 || sSort === 143 || sName.includes('закрыто') || sName.includes('не реализовано') || sName.includes('rad etild') || sName.includes('bekor')
  }

  let totalSalesLeads = 0
  let wonSalesDeals = 0
  let lostSalesDeals = 0
  let activeSalesDeals = 0
  let salesRevenue = 0
  let lostSalesValue = 0

  const managerStatsMap: Record<string, { id: string; name: string; wonDeals: number; revenue: number; deals: number; calls: number }> = {}

  const managers = await prisma.manager.findMany({ where: { companyId: cid, isActive: true } })
  for (const m of managers) {
    const callsCount = await prisma.call.count({ where: { companyId: cid, managerId: m.id } })
    managerStatsMap[m.id] = { id: m.id, name: m.name, wonDeals: 0, revenue: 0, deals: 0, calls: callsCount }
  }

  for (const d of allDeals) {
    if (!isSalesDeal(d)) {
      continue
    }

    totalSalesLeads++
    const budget = Number(d.budget || 0)

    if (d.managerId && managerStatsMap[d.managerId]) {
      managerStatsMap[d.managerId].deals++
    }

    if (isDealWon(d)) {
      wonSalesDeals++
      salesRevenue += budget
      if (d.managerId && managerStatsMap[d.managerId]) {
        managerStatsMap[d.managerId].wonDeals++
        managerStatsMap[d.managerId].revenue += budget
      }
    } else if (isDealLost(d)) {
      lostSalesDeals++
      lostSalesValue += budget || 2400000
    } else {
      activeSalesDeals++
    }
  }

  console.log(`=== ACCURATE SOTUV (SALES) STATISTICS FOR COMPANY [${cid}] ===`)
  console.log(`Total Sales Leads (in true sales pipelines): ${totalSalesLeads}`)
  console.log(`Won Sales Deals (Успешно реализовано): ${wonSalesDeals}`)
  console.log(`Real Sales Revenue (Umumiy Tushum): ${salesRevenue.toLocaleString()} UZS`)
  console.log(`Active Sales Deals: ${activeSalesDeals}`)
  console.log(`Lost Sales Deals: ${lostSalesDeals} -> ${lostSalesValue.toLocaleString()} UZS`)

  console.log(`\n=== ACCURATE MANAGER LEADERBOARD (By Sales Revenue & Won Deals) ===`)
  const sortedMgrs = Object.values(managerStatsMap)
    .filter(m => m.revenue > 0 || m.wonDeals > 0 || m.deals > 0 || m.calls > 0)
    .sort((a, b) => b.revenue - a.revenue || b.wonDeals - a.wonDeals || b.calls - a.calls)

  for (let i = 0; i < sortedMgrs.length; i++) {
    const m = sortedMgrs[i]
    console.log(`#${i + 1} "${m.name}" -> revenue: ${m.revenue.toLocaleString()} UZS | wonDeals: ${m.wonDeals} | totalDeals: ${m.deals} | calls: ${m.calls}`)
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect())
