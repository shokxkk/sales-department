import { prisma } from '../src/lib/prisma'
import { syncAmoCRMCalls } from '../src/lib/integrations/amocrm'

async function run() {
  const company = await prisma.company.findFirst()
  if (!company) return
  console.log('Syncing calls for company:', company.id)
  const count = await syncAmoCRMCalls(company.id)
  console.log('Synced amoCRM calls:', count)
}

run().finally(() => prisma.$disconnect())
