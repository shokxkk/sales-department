import { PrismaClient } from '@prisma/client'
import { syncAmoCRMOptimized } from '../src/lib/integrations/amocrm'

const prisma = new PrismaClient()

async function syncAmoCRMNow() {
  console.log('🔍 Checking amoCRM integrations in DB...')

  const integrations = await prisma.cRMIntegration.findMany({
    where: { provider: 'AMOCRM' },
  })

  console.log(`Found ${integrations.length} amoCRM integrations.`)

  for (const integ of integrations) {
    console.log(`Syncing company ${integ.companyId} (status: ${integ.status})...`)
    try {
      const res = await syncAmoCRMOptimized(integ.companyId, { type: 'fast', sinceDays: 7 })
      console.log('✅ Sync result:', res)
    } catch (err: any) {
      console.error(`❌ Sync error for ${integ.companyId}:`, err.message)
    }
  }
}

syncAmoCRMNow()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
