// ─────────────────────────────────────────────────────────────────
//  Call Analysis Processor
//  Full pipeline: balance reserve → download → transcribe → audit → save
// ─────────────────────────────────────────────────────────────────
import { PrismaClient, AnalysisStatus, Prisma } from '@prisma/client'
import { getAIProvider } from '@/lib/ai/index'
import { getAudioSignedUrl } from '@/lib/s3'
import { downloadAndStoreRecording } from '@/lib/integrations/onlinepbx'

export async function processCallAnalysis(params: {
  callId: string
  companyId: string
  jobDbId: string
  prisma: PrismaClient
}): Promise<void> {
  const { callId, companyId, jobDbId, prisma } = params

  // ─── 1. Load call and validate ───────────────────────────────────
  const call = await prisma.call.findUnique({
    where: { id: callId },
    include: {
      recording: true,
      deal: true,
      manager: true,
    },
  })

  if (!call) throw new Error(`Call ${callId} not found`)

  // Update job status
  await prisma.backgroundJob.update({
    where: { id: jobDbId },
    data: { status: 'ACTIVE', startedAt: new Date() },
  })

  try {
    // ─── 2. Download recording if not yet in S3 ──────────────────────
    if (!call.recording) {
      await updateCallStatus(prisma, callId, AnalysisStatus.DOWNLOADING)

      // Priority: 1) externalRecordingUrl (amoCRM), 2) webhook log URL (OnlinePBX)
      let recordingUrl: string | null = (call as any).externalRecordingUrl ?? null

      if (!recordingUrl) {
        // Try to get recording URL from OnlinePBX webhook log
        const webhookLog = await prisma.webhookLog.findFirst({
          where: { companyId, payload: { path: ['call_id'], equals: call.externalCallId } },
          orderBy: { createdAt: 'desc' },
        })
        recordingUrl = webhookLog
          ? (webhookLog.payload as Record<string, unknown>)['recording_url'] as string
          : null
      }

      if (!recordingUrl) {
        await updateCallStatus(prisma, callId, AnalysisStatus.NO_RECORDING)
        await refundReservedMinutes(prisma, companyId, call.talkDurationSeconds)
        await prisma.backgroundJob.update({
          where: { id: jobDbId },
          data: { status: 'FAILED', error: 'Recording URL not found', completedAt: new Date() },
        })
        return
      }

      await downloadAndStoreRecording({
        companyId,
        callId,
        recordingUrl,
      })
    }

    // ─── 3. Re-load recording ─────────────────────────────────────────
    const recording = await prisma.callRecording.findUnique({ where: { callId } })
    if (!recording) throw new Error('Recording not found after download')

    // ─── 4. Transcribe ────────────────────────────────────────────────
    await updateCallStatus(prisma, callId, AnalysisStatus.TRANSCRIBING)

    const ai = getAIProvider()

    // Get audio from S3 as signed URL then fetch buffer
    const signedUrl = await getAudioSignedUrl(recording.s3Key)
    const audioResponse = await fetch(signedUrl)
    if (!audioResponse.ok) throw new Error(`Failed to fetch audio: ${audioResponse.status}`)
    const audioBuffer = Buffer.from(await audioResponse.arrayBuffer())

    // Fetch company language
    const companyData = await prisma.company.findUnique({
      where: { id: companyId },
      select: { language: true },
    })
    const companyLanguage = companyData?.language || 'uz'

    const transcriptionResult = await ai.transcribe({
      audioBuffer,
      mimeType: recording.mimeType,
      durationSeconds: recording.durationSeconds || call.talkDurationSeconds,
      hint: companyLanguage,
    })

    // Save transcript
    const transcript = await prisma.callTranscript.create({
      data: {
        callId,
        companyId,
        language: transcriptionResult.language,
        rawText: transcriptionResult.rawText,
        provider: transcriptionResult.provider,
        modelUsed: transcriptionResult.modelUsed,
        durationSeconds: transcriptionResult.durationSeconds,
        segments: {
          create: transcriptionResult.segments.map((seg) => ({
            callId,
            speaker: seg.speaker,
            startSeconds: seg.startSeconds,
            endSeconds: seg.endSeconds,
            text: seg.text,
            confidence: seg.confidence,
            language: seg.language,
            sort: seg.sort,
          })),
        },
      },
    })

    // ─── 5. AI Audit ──────────────────────────────────────────────────
    await updateCallStatus(prisma, callId, AnalysisStatus.ANALYZING)

    // Load active criteria
    const criteria = await prisma.auditCriterion.findMany({
      where: { isActive: true },
      orderBy: { sort: 'asc' },
    })

    const auditResult = await ai.analyzeCall({
      transcript: transcriptionResult.rawText,
      segments: transcriptionResult.segments,
      callType: call.callType || undefined,
      criteria: criteria.map((c) => ({
        code: c.code,
        nameUz: c.nameUz,
        maxScore: c.maxScore,
        isCritical: c.isCritical,
        appliesTo: c.appliesTo,  // OKK: pass call-type applicability
      })),
    })

    // ─── 6. Save Audit ────────────────────────────────────────────────
    // OKK: Compute hasCriticalFails from criterion results
    const hasCriticalFails = (auditResult.criteria || []).some(
      (cr) => cr.criticalFail === true
    )

    // OKK: Compute dynamic maxPossibleScore excluding NOT_APPLICABLE criteria
    const dynamicMaxPossibleScore = (auditResult.criteria || []).reduce((sum, cr) => {
      if (cr.status === 'NOT_APPLICABLE') return sum
      const criterion = criteria.find((c) => c.code === cr.criterion_code)
      return sum + (criterion?.maxScore ?? cr.max_score)
    }, 0) || criteria.reduce((sum, c) => sum + c.maxScore, 0) || 100

    const audit = await prisma.audit.create({
      data: {
        callId,
        companyId,
        callType: mapCallType(auditResult.call_type),
        aiScore: auditResult.total_score,
        finalScore: auditResult.total_score,
        maxPossibleScore: dynamicMaxPossibleScore,
        managerTalkRatio: auditResult.manager_talk_ratio,
        customerTalkRatio: auditResult.customer_talk_ratio,
        interruptionsCount: auditResult.interruptions,
        longPausesCount: auditResult.long_pauses,
        fillerWordsJson: auditResult.filler_words,
        rudenessDetected: auditResult.rudeness_detected,
        falsePromisesDetected: auditResult.false_promises_detected,
        scriptComplianceScore: auditResult.script_compliance,
        saleProbability: auditResult.sale_probability,
        summary: auditResult.summary,
        strengthsJson: auditResult.strengths,
        mistakesJson: auditResult.mistakes,
        recommendationsJson: [auditResult.recommendation],
        importantQuotesJson: auditResult.important_quotes,
        objectionsJson: auditResult.objections,
        customerNeedsJson: auditResult.customer_need,
        nextStep: auditResult.next_step,
        // OKK: new audit-level fields
        hasCriticalFails,
        callResult: auditResult.call_result || null,
        ropRecommendation: auditResult.rop_recommendation || null,
        businessAnalysisJson: auditResult.business_analysis
          ? (auditResult.business_analysis as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        rawAiResponseJson: auditResult as unknown as Record<string, unknown>,
        aiProvider: ai.name || transcriptionResult.provider || 'aisha',
        aiModel: transcriptionResult.modelUsed || 'aisha-uz-stt-v2',
        criterionResults: {
          create: auditResult.criteria.map((cr) => {
            const criterion = criteria.find((c) => c.code === cr.criterion_code)
            return {
              criterionId: criterion?.id || '',
              criterionCode: cr.criterion_code,
              aiScore: cr.score,
              finalScore: cr.score,
              maxScore: cr.max_score,
              passed: cr.passed,
              explanationUz: cr.explanation,
              evidenceTimestamp: cr.evidence_timestamp,
              evidenceQuote: cr.evidence_quote,
              // OKK: new criterion-level fields
              status: (cr.status ?? null) as any,
              strengthsJson: cr.strengths ? (cr.strengths as Prisma.InputJsonValue) : Prisma.JsonNull,
              errorsJson: cr.errors ? (cr.errors as Prisma.InputJsonValue) : Prisma.JsonNull,
              recommendationsJson: cr.recommendations ? (cr.recommendations as Prisma.InputJsonValue) : Prisma.JsonNull,
              criticalFail: cr.criticalFail ?? false,
              isOverridden: false,
            }
          }).filter((r) => r.criterionId !== ''),
        },
      },
    })

    // Update call with score and status
    await prisma.call.update({
      where: { id: callId },
      data: {
        analysisStatus: AnalysisStatus.COMPLETED,
        aiScore: auditResult.total_score,
        callType: mapCallType(auditResult.call_type),
      },
    })

    // ─── 7. Confirm balance deduction ────────────────────────────────
    const requiredMinutes = Math.ceil(call.talkDurationSeconds / 60)
    await confirmMinutesDeduction(prisma, companyId, requiredMinutes, callId)

    // ─── 8. Auto-send to CRM if enabled ──────────────────────────────
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { sendAiNotesToCrm: true },
    })

    if (company?.sendAiNotesToCrm && call.deal?.crmId) {
      const { sendAuditNoteToAmoCRM } = await import('@/lib/integrations/amocrm')
      const noteText = buildCrmNoteText({
        managerName: call.manager?.name || 'Менежер',
        callType: auditResult.call_type,
        duration: formatDuration(call.talkDurationSeconds),
        score: auditResult.total_score,
        strengths: auditResult.strengths,
        mistakes: auditResult.mistakes,
        saleProbability: auditResult.sale_probability,
        recommendation: auditResult.recommendation,
      })

      await sendAuditNoteToAmoCRM({
        companyId,
        dealCrmId: call.deal.crmId,
        noteText,
      }).catch((err) => console.warn('[Worker] CRM note failed:', err.message))
    }

    // Update background job
    await prisma.backgroundJob.update({
      where: { id: jobDbId },
      data: { status: 'COMPLETED', completedAt: new Date(), result: { auditId: audit.id } },
    })

    console.log(`[Worker/CallAnalysis] Completed call ${callId}, score: ${auditResult.total_score}`)
  } catch (err) {
    // Refund reserved minutes on error
    await refundReservedMinutes(prisma, companyId, call.talkDurationSeconds)

    await prisma.call.update({
      where: { id: callId },
      data: { analysisStatus: AnalysisStatus.ERROR },
    }).catch(() => null)

    await prisma.backgroundJob.update({
      where: { id: jobDbId },
      data: { status: 'FAILED', error: String(err), completedAt: new Date() },
    }).catch(() => null)

    throw err
  }
}

// ─── Helpers ──────────────────────────────────────────────────────

async function updateCallStatus(
  prisma: PrismaClient,
  callId: string,
  status: AnalysisStatus
) {
  await prisma.call.update({
    where: { id: callId },
    data: { analysisStatus: status },
  })
}

async function confirmMinutesDeduction(
  prisma: PrismaClient,
  companyId: string,
  minutes: number,
  callId: string
) {
  const balance = await prisma.usageBalance.findUnique({ where: { companyId } })
  if (!balance) return

  await prisma.$transaction([
    prisma.usageBalance.update({
      where: { companyId },
      data: {
        usedMinutes: { increment: minutes },
        reservedMinutes: { decrement: minutes },
      },
    }),
    prisma.usageTransaction.create({
      data: {
        companyId,
        type: 'DEBIT',
        minutes,
        callId,
        balanceBefore: balance.totalMinutes - balance.usedMinutes,
        balanceAfter: balance.totalMinutes - balance.usedMinutes - minutes,
        description: `Зўнгир таҳлили: ${callId}`,
      },
    }),
  ])
}

async function refundReservedMinutes(
  prisma: PrismaClient,
  companyId: string,
  talkDurationSeconds: number
) {
  const minutes = Math.ceil(talkDurationSeconds / 60)
  const balance = await prisma.usageBalance.findUnique({ where: { companyId } })
  if (!balance || balance.reservedMinutes < minutes) return

  await prisma.usageBalance.update({
    where: { companyId },
    data: { reservedMinutes: { decrement: Math.min(minutes, balance.reservedMinutes) } },
  })
}

function mapCallType(type: string) {
  const map: Record<string, string> = {
    new_lead: 'NEW_LEAD',
    repeat_call: 'REPEAT_CALL',
    sale: 'SALE',
    service: 'SERVICE',
    complaint: 'COMPLAINT',
    wrong_number: 'WRONG_NUMBER',
  }
  return (map[type] || 'NEW_LEAD') as 'NEW_LEAD' | 'REPEAT_CALL' | 'SALE' | 'SERVICE' | 'COMPLAINT' | 'WRONG_NUMBER'
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function buildCrmNoteText(params: {
  managerName: string
  callType: string
  duration: string
  score: number
  strengths: string[]
  mistakes: string[]
  saleProbability: number
  recommendation: string
}): string {
  const { managerName, callType, duration, score, strengths, mistakes, saleProbability, recommendation } = params

  return `🤖 AI АУДИТ ҚЎНҒИРОҒИ

📅 Сана: ${new Date().toLocaleDateString('ru-RU')}
👤 Менежер: ${managerName}
📞 Зўнгир тури: ${callType}
⏱ Давомийлиги: ${duration}

📊 Умумий баҳо: ${score}/100

✅ Кучли томонлар:
${strengths.slice(0, 3).map((s) => `— ${s}`).join('\n')}

❌ Хатолар:
${mistakes.slice(0, 3).map((m) => `— ${m}`).join('\n')}

💡 Сотув эҳтимоли: ${saleProbability}%

🎯 Тавсия:
${recommendation}`
}
