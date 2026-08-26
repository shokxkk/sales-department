import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const p = new PrismaClient()

async function check() {
  const callId = '18f4dbc6-d875-42bc-ac02-5f8d8d58c6f6'
  const a = await p.audit.findFirst({ where: { callId } })
  console.log('New Audit ID:', a?.id)

  const t = await p.callTranscript.findFirst({
    where: { callId },
    include: { segments: { orderBy: { sort: 'asc' } } }
  })
  console.log('Segments count:', t?.segments.length)
  console.log('\n--- ALL DB SEGMENTS ---')
  t?.segments.forEach(s => {
    console.log(`[${s.speaker}] (${s.startSeconds}s - ${s.endSeconds}s): ${s.text}`)
  })
  await p.$disconnect()
}

check().catch(console.error)
