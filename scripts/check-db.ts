import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const p = new PrismaClient()

async function check() {
  const t = await p.callTranscript.findFirst({
    where: { callId: '49a99408-c62b-45d9-a61f-c497832759ca' },
    include: { segments: { orderBy: { sort: 'asc' } } }
  })
  if (!t) {
    console.log('No transcript found!')
    return
  }

  console.log('Provider:', t.provider, 'Model:', t.modelUsed)
  console.log('\n--- SAVED DB RAW TEXT ---')
  console.log(t.rawText)
  console.log('\n--- ALL DB SEGMENTS WITH DIARIZATION ---')
  t.segments.forEach(s => {
    console.log(`[${s.speaker}] (${s.startSeconds}s - ${s.endSeconds}s): ${s.text}`)
  })

  const audit = await p.audit.findFirst({
    where: { callId: '49a99408-c62b-45d9-a61f-c497832759ca' },
  })
  const results = await p.auditCriterionResult.findMany({
    where: { auditId: audit?.id },
    include: { criterion: true }
  })
  console.log('\n--- AUDIT RESULTS ---')
  console.log('Overall Score:', audit?.overallScore)
  results.forEach(r => {
    console.log(`- [${r.score}/${r.maxScore}] ${r.criterion.code} (${r.criterion.nameUz}): ${r.reasoningUz}`)
  })

  await p.$disconnect()
}

check().catch(console.error)
