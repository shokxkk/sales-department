import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const p = new PrismaClient()

async function check() {
  const audit = await p.audit.findUnique({ where: { id: '4eb615b4-40ca-41cc-a5cd-3a8e5e9acb7a' } })
  console.log('Audit callId:', audit?.callId)
  if (!audit?.callId) {
    console.log('No callId found for audit!')
    return
  }

  const t = await p.callTranscript.findFirst({
    where: { callId: audit.callId },
    include: { segments: { orderBy: { sort: 'asc' } } }
  })
  console.log('Provider:', t?.provider, 'Model:', t?.modelUsed)
  console.log('\n--- RAW TEXT IN DB ---')
  console.log(t?.rawText)
  console.log('\n--- ALL DB SEGMENTS ---')
  t?.segments.forEach(s => {
    console.log(`[${s.speaker}] (${s.startSeconds}s-${s.endSeconds}s): ${s.text}`)
  })
  await p.$disconnect()
}

check().catch(console.error)
