import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { AishaProvider } from '../src/lib/ai/aisha.provider'

const p = new PrismaClient()

async function finishAudit() {
  const auditId = '54f38776-6c6f-4744-bc15-bd8c1ef48888'
  const audit = await p.audit.findUnique({ where: { id: auditId } })
  if (!audit) return

  const callId = audit.callId
  const segments = await p.transcriptSegment.findMany({
    where: { callId },
    orderBy: { sort: 'asc' }
  })
  console.log(`Loaded ${segments.length} saved Cyrillic segments from DB!`)

  const rawText = segments
    .map((s) => `${s.speaker === 'MANAGER' ? 'Менежер' : 'Мижоз'}: ${s.text}`)
    .join('\n')

  const provider = new AishaProvider()
  console.log('Running smart analyzeCall...')

  const criteria = await p.auditCriterion.findMany({
    where: { isActive: true }
  })

  const criteriaList = criteria.map((c) => ({
    code: c.code,
    nameUz: c.nameUz,
    maxScore: c.maxScore,
    isCritical: c.isCritical
  }))

  const analysis = await provider.analyzeCall({
    transcript: rawText,
    segments: segments.map((s, i) => ({
      speaker: s.speaker as any,
      startSeconds: s.startSeconds,
      endSeconds: s.endSeconds,
      text: s.text,
      confidence: s.confidence,
      sort: i
    })),
    callType: 'REPEAT_CALL',
    criteria: criteriaList
  })

  console.log('Updating Audit record in DB...')
  await p.audit.update({
    where: { id: auditId },
    data: {
      aiScore: analysis.total_score,
      finalScore: analysis.total_score,
      maxPossibleScore: criteriaList.reduce((acc, c) => acc + c.maxScore, 0) || 14,
      managerTalkRatio: analysis.manager_talk_ratio,
      customerTalkRatio: analysis.customer_talk_ratio,
      interruptionsCount: analysis.interruptions,
      longPausesCount: analysis.long_pauses,
      fillerWordsJson: JSON.stringify(analysis.filler_words || []),
      rudenessDetected: analysis.rudeness_detected,
      falsePromisesDetected: analysis.false_promises_detected,
      scriptComplianceScore: analysis.script_compliance,
      saleProbability: analysis.sale_probability,
      summary: analysis.summary,
      strengthsJson: JSON.stringify(analysis.strengths || []),
      mistakesJson: JSON.stringify(analysis.mistakes || []),
      recommendationsJson: JSON.stringify([analysis.recommendation]),
      importantQuotesJson: JSON.stringify(analysis.important_quotes || []),
      objectionsJson: JSON.stringify(analysis.objections || []),
      customerNeedsJson: JSON.stringify(analysis.customer_need || []),
      nextStep: analysis.next_step || analysis.recommendation,
      rawAiResponseJson: JSON.stringify(analysis),
      aiProvider: 'Aisha AI + GPT-4o Diarization',
      aiModel: 'aisha-uz-stt-v2',
    }
  })

  console.log('Successfully updated audit 54f38776!')
  await p.$disconnect()
}

finishAudit().catch(console.error)
