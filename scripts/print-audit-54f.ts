import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
async function printResult() {
  const audit = await p.audit.findUnique({ where: { id: '54f38776-6c6f-4744-bc15-bd8c1ef48888' } })
  if (!audit) return
  console.log('--- FINAL AUDIT RESULT ---')
  console.log('Score:', audit.aiScore, '/', audit.maxPossibleScore)
  console.log('Provider:', audit.aiProvider)
  console.log('Summary:', audit.summary)
  console.log('Recommendations:', audit.recommendationsJson)
  console.log('Next Step:', audit.nextStep)
  await p.$disconnect()
}
printResult()
