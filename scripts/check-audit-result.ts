import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
async function check() {
  const audit = await p.audit.findUnique({
    where: { id: '1668f266-0914-4ef8-96a8-13fc6f93cbee' }
  })
  if (!audit) return
  console.log('Total Score:', audit.totalScore, '/', audit.maxPossibleScore)
  console.log('Sale Probability:', audit.saleProbability, '%')
  console.log('Summary:', audit.summary)
  console.log('\n--- RECOMMENDATIONS ---')
  console.log('Recommendation:', audit.recommendation)
  console.log('Next Step:', audit.nextStep)
  console.log('\n--- CRITERIA SCORES ---')
  const criteria = audit.criteriaScores as any[] || []
  criteria.slice(0, 5).forEach((c: any) => {
    console.log(`[${c.passed ? 'PASS' : 'FAIL'}] ${c.criterion_code}: ${c.score}/${c.max_score} - ${c.explanation}`)
    if (c.evidence_quote) console.log(`   Evidence (@${c.evidence_timestamp}): "${c.evidence_quote}"`)
  })
  await p.$disconnect()
}
check()
