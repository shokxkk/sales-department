import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
async function check() {
  const audit = await p.audit.findUnique({
    where: { id: '1668f266-0914-4ef8-96a8-13fc6f93cbee' }
  })
  if (!audit) return
  console.log('AI Score:', audit.aiScore, '/', audit.maxPossibleScore)
  console.log('Sale Probability:', audit.saleProbability, '%')
  console.log('Summary:\n', audit.summary)
  console.log('\nRecommendations:', audit.recommendationsJson)
  console.log('Next Step:', audit.nextStep)
  console.log('\n--- CRITERIA SCORES FROM DB ---')
  const scores = await p.auditScore.findMany({ where: { auditId: audit.id } })
  scores.forEach((s) => {
    console.log(`[${s.passed ? 'PASS' : 'FAIL'}] ${s.criterionCode}: ${s.score}/${s.maxScore} - ${s.aiExplanation}`)
    if (s.evidenceQuote) console.log(`   Evidence (@${s.evidenceTimestamp}): "${s.evidenceQuote}"`)
  })
  await p.$disconnect()
}
check()
