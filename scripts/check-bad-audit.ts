import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
async function check() {
  const audit = await p.audit.findUnique({
    where: { id: '54f38776-6c6f-4744-bc15-bd8c1ef48888' },
    include: { call: true }
  })
  if (!audit) {
    console.log('Audit not found!')
    return
  }
  console.log('Provider used:', audit.aiProvider)
  console.log('Call ID:', audit.callId)
  const segments = await p.transcriptSegment.findMany({
    where: { callId: audit.callId },
    orderBy: { sortOrder: 'asc' }
  })
  console.log('Total DB segments:', segments.length)
  segments.slice(0, 10).forEach((s) => {
    console.log(`[${s.speaker}] (${s.startSeconds} - ${s.endSeconds}): ${s.text}`)
  })
  await p.$disconnect()
}
check()
