import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
async function check() {
  const audit = await p.audit.findUnique({
    where: { id: '1668f266-0914-4ef8-96a8-13fc6f93cbee' }
  })
  if (!audit) return
  console.log('Keys:', Object.keys(audit))
  console.log('Score:', audit.totalScore || (audit as any).total_score)
  console.log('Recommendation:', audit.recommendations || (audit as any).recommendation)
  console.log('Criteria:', JSON.stringify(audit.criteriaScores || (audit as any).criteria_scores, null, 2))
  await p.$disconnect()
}
check()
