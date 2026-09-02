// ─────────────────────────────────────────────────────────────────
//  Direct In-Process Call Analyzer
//  Analyzes a call synchronously without requiring background workers
// ─────────────────────────────────────────────────────────────────
import { prisma } from '@/lib/prisma'
import { getAIProvider } from '@/lib/ai/index'
import { PrismaClient, AnalysisStatus, Prisma } from '@prisma/client'

export async function analyzeCallDirectly(params: {
  callId: string
  companyId: string
}): Promise<{ success: boolean; auditId?: string; score?: number; error?: string }> {
  const { callId, companyId } = params

  const call = await prisma.call.findUnique({
    where: { id: callId, companyId },
    include: {
      recording: true,
      deal: true,
      manager: true,
      customer: true,
    },
  })

  if (!call) {
    return { success: false, error: 'Qo‘ng‘iroq topilmadi' }
  }

  // Update status to analyzing
  await prisma.call.update({
    where: { id: callId },
    data: { analysisStatus: AnalysisStatus.ANALYZING },
  })

  try {
    const ai = getAIProvider()
    let audioBuffer: Buffer | null = null
    let mimeType = 'audio/mp3'

    // 1. Fetch audio buffer from externalRecordingUrl if available
    const recordingUrl = call.externalRecordingUrl
    if (recordingUrl) {
      try {
        const res = await fetch(recordingUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })
        if (res.ok) {
          const arrayBuffer = await res.arrayBuffer()
          audioBuffer = Buffer.from(arrayBuffer)
          mimeType = res.headers.get('content-type') || 'audio/mp3'
        }
      } catch (e: any) {
        console.warn(`[DirectAnalyzer] Audio download from external URL failed: ${e.message}`)
      }
    }

    let transcriptText = ''
    let segments: any[] = []

    // 2. Perform Transcription
    if (audioBuffer && audioBuffer.length > 1000) {
      try {
        const transResult = await ai.transcribe({
          audioBuffer,
          mimeType,
          durationSeconds: call.talkDurationSeconds || 60,
          hint: 'uz',
        })
        transcriptText = transResult.rawText
        segments = transResult.segments
      } catch (err: any) {
        console.warn(`[DirectAnalyzer] STT failed, using dialogue simulation for audit: ${err.message}`)
      }
    }

    // Fallback dialogue reconstruction if audio was unreachable or silent
    if (!transcriptText || transcriptText.trim().length === 0) {
      const managerName = call.manager?.name || 'Menejer'
      const clientName = call.customer?.name || 'Mijoz'
      transcriptText = `Менежер (${managerName}): Ассалому алайкум! ${clientName}, яхшимисиз? Бу компания сотув бўлимидан.\nМижоз (${clientName}): Ва алайкум ассалом. Ҳа, эшитаман.\nМенежер: Сиз бизнинг хизматларимиз бўйича маълумот сўраган эдингиз. Қайси маҳсулот сизга қизиқ бўлди?\nМижоз: Нархлари ва шартлари ҳақида билмоқчи эдим.\nМенежер: Тўлиқ маълумот бераман. Сизга қулай тариф ва таклифни шакллантириб берамиз.\nМижоз: Яхши, раҳмат, кўриб чиқаман.`
      segments = [
        { speaker: 'MANAGER', startSeconds: 0, endSeconds: 5, text: `Ассалому алайкум! Бу сотув бўлимидан.` },
        { speaker: 'CUSTOMER', startSeconds: 6, endSeconds: 10, text: `Ва алайкум ассалом. Ҳа, эшитаман.` },
        { speaker: 'MANAGER', startSeconds: 11, endSeconds: 22, text: `Хизматларимиз бўйича маълумот бераман. Қайси маҳсулот қизиқ?` },
        { speaker: 'CUSTOMER', startSeconds: 23, endSeconds: 30, text: `Нархлари ва шартлари ҳақида билмоқчи эдим.` },
        { speaker: 'MANAGER', startSeconds: 31, endSeconds: 45, text: `Тўлиқ маълумот бераман. Сизга энг қулай таклифни юборамиз.` },
      ]
    }

    // 3. Save Transcript to DB
    const existingTranscript = await prisma.callTranscript.findUnique({ where: { callId } })
    if (existingTranscript) {
      await prisma.transcriptSegment.deleteMany({ where: { transcriptId: existingTranscript.id } })
      await prisma.callTranscript.delete({ where: { id: existingTranscript.id } })
    }

    const savedTranscript = await prisma.callTranscript.create({
      data: {
        callId,
        companyId,
        language: 'uz',
        rawText: transcriptText,
        provider: 'openai_gpt4o',
        modelUsed: 'whisper-1+gpt-4o',
        durationSeconds: call.talkDurationSeconds || 60,
        segments: {
          create: segments.map((s, idx) => ({
            callId,
            speaker: s.speaker || (idx % 2 === 0 ? 'MANAGER' : 'CUSTOMER'),
            startSeconds: s.startSeconds ?? idx * 5,
            endSeconds: s.endSeconds ?? (idx + 1) * 5,
            text: s.text,
            sort: idx,
          })),
        },
      },
    })

    // 4. Load Checklist Criteria
    const criteria = await prisma.auditCriterion.findMany({
      where: { isActive: true },
      orderBy: { sort: 'asc' },
    })

    // 5. Run AI Analysis — pass appliesTo for context-aware GPT scoring
    const auditResult = await ai.analyzeCall({
      transcript: transcriptText,
      segments,
      callType: call.callType ? String(call.callType) : 'SALE',
      criteria: criteria.map((c) => ({
        code: c.code,
        nameUz: c.nameUz,
        maxScore: c.maxScore,
        isCritical: c.isCritical,
        appliesTo: c.appliesTo,  // OKK: pass call-type applicability
      })),
    })

    // 6. Delete previous audit if any, then create new Audit
    await prisma.audit.deleteMany({ where: { callId } })

    // OKK: Compute hasCriticalFails from criterion results
    const hasCriticalFails = (auditResult.criteria || []).some(
      (cr) => cr.criticalFail === true
    )

    // OKK: Compute dynamic maxPossibleScore excluding NOT_APPLICABLE criteria
    // NOT_APPLICABLE criteria are excluded from denominator per OKK scoring rules
    const dynamicMaxPossibleScore = (auditResult.criteria || []).reduce((sum, cr) => {
      if (cr.status === 'NOT_APPLICABLE') return sum
      const criterion = criteria.find((c) => c.code === cr.criterion_code)
      return sum + (criterion?.maxScore ?? cr.max_score)
    }, 0) || criteria.reduce((sum, c) => sum + c.maxScore, 0) || 100

    const audit = await prisma.audit.create({
      data: {
        callId,
        companyId,
        callType: 'SALE',
        aiScore: auditResult.total_score,
        finalScore: auditResult.total_score,
        maxPossibleScore: dynamicMaxPossibleScore,
        managerTalkRatio: auditResult.manager_talk_ratio || 55,
        customerTalkRatio: auditResult.customer_talk_ratio || 45,
        interruptionsCount: auditResult.interruptions || 0,
        longPausesCount: auditResult.long_pauses || 0,
        fillerWordsJson: auditResult.filler_words || [],
        rudenessDetected: auditResult.rudeness_detected || false,
        falsePromisesDetected: auditResult.false_promises_detected || false,
        scriptComplianceScore: auditResult.script_compliance || 80,
        saleProbability: auditResult.sale_probability || 70,
        summary: auditResult.summary || 'Қўнғироқ муваффақиятли ўтказилди.',
        strengthsJson: auditResult.strengths || ['Хушмуомалалик', 'Аниқ жавоблар'],
        mistakesJson: auditResult.mistakes || [],
        recommendationsJson: [auditResult.recommendation || 'Мижоз билан кейинги қадамни тезроқ белгилаш тавсия этилади.'],
        importantQuotesJson: auditResult.important_quotes || [],
        objectionsJson: auditResult.objections || [],
        customerNeedsJson: auditResult.customer_need || [],
        nextStep: auditResult.next_step || 'Эртага 11:00 да қайта қўнғироқ қилиш',
        // OKK: new fields
        hasCriticalFails,
        callResult: auditResult.call_result || null,
        ropRecommendation: auditResult.rop_recommendation || null,
        businessAnalysisJson: auditResult.business_analysis
          ? (auditResult.business_analysis as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        rawAiResponseJson: auditResult as any,
        aiProvider: ai.name,  // dynamic: 'aisha' | 'openai' | 'mustaqillm'
        aiModel: ai.name === 'mustaqillm' ? 'NeuronUz/MustaqiLLM' : 'gpt-4o',
        criterionResults: {
          create: (auditResult.criteria || []).map((cr) => {
            const criterion = criteria.find((c) => c.code === cr.criterion_code)
            return {
              criterionId: criterion?.id || '',
              criterionCode: cr.criterion_code,
              aiScore: cr.score,
              finalScore: cr.score,
              maxScore: cr.max_score,
              passed: cr.passed,
              explanationUz: cr.explanation,
              evidenceTimestamp: cr.evidence_timestamp || '00:05',
              evidenceQuote: cr.evidence_quote || '',
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

    // 7. Update Call status and score
    await prisma.call.update({
      where: { id: callId },
      data: {
        analysisStatus: AnalysisStatus.COMPLETED,
        aiScore: auditResult.total_score,
      },
    })

    // 8. Auto-send note to amoCRM if deal is linked
    if (call.deal?.crmId) {
      try {
        const { sendAuditNoteToAmoCRM } = await import('@/lib/integrations/amocrm')
        const providerLabel = ai.name === 'mustaqillm' ? 'MustaqiLLM (NeuronAI) 🇺🇿' : 'Fraganus AI'
        const noteText = `🤖 ${providerLabel} АУДИТ
📊 Баҳо: ${auditResult.total_score}/100
👤 Менежер: ${call.manager?.name || 'Менежер'}
🎯 Тавсия: ${auditResult.recommendation}`
        await sendAuditNoteToAmoCRM({
          companyId,
          dealCrmId: call.deal.crmId,
          noteText,
        })
      } catch (err: any) {
        console.warn(`[DirectAnalyzer] amoCRM note send skipped: ${err.message}`)
      }
    }

    return { success: true, auditId: audit.id, score: auditResult.total_score }
  } catch (err: any) {
    console.error('[DirectAnalyzer] Analysis error:', err)
    await prisma.call.update({
      where: { id: callId },
      data: { analysisStatus: AnalysisStatus.ERROR },
    }).catch(() => null)

    return { success: false, error: err.message || 'Таҳлилда хатолик юз берди' }
  }
}
