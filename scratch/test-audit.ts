import { PrismaClient } from '@prisma/client'
import { analyzeCallDirectly } from '../src/lib/ai/direct-analyzer'

const p = new PrismaClient()

async function main() {
  const company = await p.company.findFirst()
  if (!company) {
    console.log('No company found')
    return
  }

  // Find a real answered call with talk duration
  const call = await p.call.findFirst({
    where: {
      companyId: company.id,
      status: 'ANSWERED',
      talkDurationSeconds: { gt: 30 },
    },
    include: { manager: true, customer: true }
  })

  if (!call) {
    console.log('No eligible call found')
    return
  }

  console.log(`Testing AI Audit on Call: ${call.id} (Manager: ${call.manager?.name}, Duration: ${call.talkDurationSeconds}s)`)
  const result = await analyzeCallDirectly({ callId: call.id, companyId: company.id })
  console.log('Analysis Result:', result)

  // Verify created audit in DB
  if (result.success && result.auditId) {
    const audit = await p.audit.findUnique({
      where: { id: result.auditId },
      include: { criterionResults: { include: { criterion: true } } }
    })
    console.log('\n--- AUDIT SAVED TO DB ---')
    console.log('Score:', audit?.finalScore, '/ 100')
    console.log('Summary:', audit?.summary)
    console.log('Strengths:', audit?.strengthsJson)
    console.log('Mistakes:', audit?.mistakesJson)
    console.log('Recommendations:', audit?.recommendationsJson)
    console.log('Criteria evaluated:', audit?.criterionResults.length)
  }
}

main().finally(() => p.$disconnect())
