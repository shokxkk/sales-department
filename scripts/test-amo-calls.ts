import { PrismaClient } from '@prisma/client'

const p = new PrismaClient()

async function main() {
  const criteria = await p.auditCriterion.findMany({ orderBy: { sort: 'asc' } })
  console.log('Existing criteria count:', criteria.length)
  criteria.forEach(c => console.log(`  [${c.code}] ${c.nameUz} | max:${c.maxScore} | active:${c.isActive}`))
  process.exit(0)
}

main().catch(e => { console.error(e.message); process.exit(1) })
