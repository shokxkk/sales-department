import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { getAudioSignedUrl } from '../src/lib/s3'
import { AishaProvider } from '../src/lib/ai/aisha.provider'

const p = new PrismaClient()

async function updateAudit() {
  const auditId = '54f38776-6c6f-4744-bc15-bd8c1ef48888'
  const audit = await p.audit.findUnique({
    where: { id: auditId },
    include: { call: true }
  })
  if (!audit) {
    console.log('Audit not found!')
    return
  }

  const callId = audit.callId
  const rec = await p.callRecording.findUnique({ where: { callId } })
  if (!rec) return

  const url = await getAudioSignedUrl(rec.s3Key)
  const res = await fetch(url)
  const audioBuffer = Buffer.from(await res.arrayBuffer())

  const provider = new AishaProvider()
  console.log('1. Transcribing with AishaProvider...')
  const stt = await provider.transcribe({
    audioBuffer,
    mimeType: 'audio/mp3',
    durationSeconds: rec.durationSeconds || 162
  })

  console.log(`2. Saving ${stt.segments.length} transcript segments to DB...`)
  await p.transcriptSegment.deleteMany({ where: { callId } })

  let transcript = await p.callTranscript.findUnique({ where: { callId } })
  if (!transcript) {
    transcript = await p.callTranscript.create({
      data: {
        callId,
        companyId: audit.companyId,
        language: stt.language,
        rawText: stt.rawText,
        provider: stt.provider,
        modelUsed: stt.modelUsed,
        durationSeconds: stt.durationSeconds,
      }
    })
  } else {
    await p.callTranscript.update({
      where: { callId },
      data: {
        language: stt.language,
        rawText: stt.rawText,
        provider: stt.provider,
        modelUsed: stt.modelUsed,
      }
    })
  }

  const segInputs = stt.segments.map((s, idx) => ({
    transcriptId: transcript!.id,
    callId,
    speaker: s.speaker,
    startSeconds: s.startSeconds,
    endSeconds: s.endSeconds,
    text: s.text,
    confidence: s.confidence,
    sort: idx
  }))
  await p.transcriptSegment.createMany({ data: segInputs })

  console.log('3. Running smart analyzeCall with GPT-4o Evaluation Agent...')
  const checklist = await p.auditChecklist.findFirst({
    where: { companyId: audit.companyId, isActive: true },
    include: { criteria: true }
  })

  const criteriaList = (checklist?.criteria || []).map((c) => ({
    code: c.code,
    nameUz: c.nameUz,
    maxScore: c.maxScore,
    isCritical: c.isCritical
  }))

  const analysis = await provider.analyzeCall({
    transcript: stt.rawText,
    segments: stt.segments,
    callType: 'REPEAT_CALL',
    criteria: criteriaList
  })

  console.log('4. Updating Audit record in DB...')
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
      aiProvider: provider.name,
      aiModel: stt.modelUsed,
    }
  })

  console.log('Successfully updated audit 54f38776 with AishaProvider and smart Evaluation!')
  await p.$disconnect()
}

updateAudit().catch(console.error)
