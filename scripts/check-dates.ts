import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const cid = 'b2986729-7057-4c22-80cf-ae4045a5f720'
  const deals = await prisma.deal.findMany({ where: { companyId: cid }, include: { stage: { include: { pipeline: true } }, pipeline: true } })

  const isSalesDeal = (d: any) => {
    const pName = (d.stage?.pipeline?.name || d.pipeline?.name || '').toLowerCase()
    return !pName.includes('тех') && !pName.includes('тикет') && !pName.includes('сервис') && !pName.includes('sifat') && !pName.includes('pm map') && !pName.includes('adaptatsiya') && !pName.includes('nastroyka') && !pName.includes('support')
  }
  const isDealWon = (d: any) => {
    const sName = (d.stage?.name || '').toLowerCase()
    const sSort = d.stage?.sort || 0
    const st = (d.status || '').toUpperCase()
    return sSort === 10000 || sSort === 142 || sName.includes('успешно') || (sName.includes('реализовано') && !sName.includes('не')) || st === 'WON'
  }

  for (const d of deals) {
    if (isSalesDeal(d) && isDealWon(d)) {
      console.log(`[WON] "${d.name}" | budget: ${d.budget} | closedAt: ${d.closedAt} | crmCreatedAt: ${d.crmCreatedAt} | createdAt: ${d.createdAt}`)
    }
  }
}

main().finally(() => prisma.$disconnect())
