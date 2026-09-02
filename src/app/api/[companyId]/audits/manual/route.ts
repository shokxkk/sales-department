// ─────────────────────────────────────────────────────────────────
//  Manual OKK Analysis API
//  POST /api/[companyId]/audits/manual
//  Accepts: multipart/form-data with audio file + metadata
//  Returns: Full OKK audit report (kotib.ai format)
// ─────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, authErrorResponse, AuthError } from '@/lib/auth/server'
import { AishaProvider } from '@/lib/ai/aisha.provider'

// ── Vercel Hobby plan maxDuration limit: 300s (5 minutes) ──
export const maxDuration = 300
export const dynamic = 'force-dynamic'

// OKK Criteria — 8 Official Call Center Standards (Marketing Markazi)
const OKK_CRITERIA = [
  {
    code: 'greeting_identification',
    nameUz: '1. Саломлашиш ва идентификация',
    maxScore: 10,
    isCritical: true,
    description:
      'Менежер ўзини (исм), компанияни ("Marketing Markazi") ва лавозимини ("сотув менежериман") айтиши; мижоз исмини аниқлаб суҳбат давомида исми билан мурожаат қилиши. Норасмий мурожаатлар ("ака", "опа", "опажон", "акажон", "холажон", "амаки") ҚАТЪИЯН ТАҚИҚЛАНАДИ. Чиқувчи қўнғироқда вақт қулайлигини аниқлаш.',
  },
  {
    code: 'contact_active_listening',
    nameUz: '2. Контакт ўрнатиш ва фаол тинглаш',
    maxScore: 15,
    isCritical: false,
    description:
      'Мижоз гапини бўлмаслик, охиригача тинглаш. Фаол тинглаш, аниқлаштирувчи саволлар бериш. Суҳбатни монолог қилмаслик. Паразит сўзлар ("анақа", "нимеди", "ҳалиги", "шекилли", "билмадим", "еее", "ммм") ишлатмаслик.',
  },
  {
    code: 'need_identification',
    nameUz: '3. Эҳтиёжни аниқлаш',
    maxScore: 15,
    isCritical: true,
    description:
      'Асосий эҳтиёж, муаммо ва мақсадни очиқ саволлар билан аниқлаш. Нотўғри/тахминий маълумот бермаслик. Асоссиз ваъда/кафолатлар ("100% ҳал қиламиз", "албатта бўлади") ТАҚИҚЛАНАДИ. Компания ҳақида қаердан маълумот олгани фақат 1-чиқувчи алоқада сўралади.',
  },
  {
    code: 'solution_presentation',
    nameUz: '4. Ечимни тақдим этиш',
    maxScore: 15,
    isCritical: false,
    description:
      'Мижоз эҳтиёжига мос ечим бериш. Хусусиятларни эмас, фойдаси ва қийматини тушунтириш. Мижоз аллақачон билса — такрорламасдан кейинги қадамга ўтиш. Нотўғри/текширилмаган маълумот бермаслик.',
  },
  {
    code: 'objection_handling',
    nameUz: '5. Эътирозлар билан ишлаш',
    maxScore: 15,
    isCritical: false,
    description:
      'Эътирозларни тинглаш, баҳслашмаслик, инкор қилмаслик, мижозни айбламаслик. Асл сабабини саволлар билан аниқлаб, мантиқий ва қийматга асосланган жавоб бериш. Нарх эътирозида фойда, қиймат ва натижани тушунтириш.',
  },
  {
    code: 'conversation_management',
    nameUz: '6. Мулоқотни бошқариш',
    maxScore: 15,
    isCritical: true,
    description:
      'Мулоқот йўналишини назорат қилиш, кераксиз сукутга йўл қўймаслик, босим ўтказмаслик. Ҳиссиётга берилмаслик, овозини кўтармаслик. Айблаш, танбеҳ бериш, устидан кулиш, масхара қилиш, киноя ҚАТЪИЯН ТАҚИҚЛАНАДИ.',
  },
  {
    code: 'next_step',
    nameUz: '7. Кейинги қадамни белгилаш',
    maxScore: 10,
    isCritical: false,
    description:
      'Аниқ кейинги ҳаракатни (учрашув, қайта қўнғироқ, таклиф, ҳужжат) ва аниқ кун, сана ҳамда вақтни (масалан: Эртага 11:00 да қайта қўнғироқ қилиш) келишиб олиш.',
  },
  {
    code: 'call_closing',
    nameUz: '8. Суҳбатни якунлаш',
    maxScore: 5,
    isCritical: false,
    description:
      'Келишилган натижани қисқача тасдиқлаш, раҳмат айтиш, мулойим ва профессионал хайрлашиш. Мижозда ноаниқлик қолмаслиги керак. Шошилтмаслик, гапини кесмаслик.',
  },
]

export async function POST(
  req: NextRequest,
  { params }: { params: { companyId: string } }
) {
  const startTime = Date.now()

  try {
    const { companyId } = params
    const user = await requireAuth(req, { companyId })

    // Parse multipart form
    const form = await req.formData()
    const audioFile = form.get('audio') as File | null
    const managerName = (form.get('managerName') as string) || 'Noma\'lum'
    const managerPosition = (form.get('managerPosition') as string) || 'Sotuv menejeri'
    const companyName = (form.get('companyName') as string) || ''
    const customerName = (form.get('customerName') as string) || ''
    const callNote = (form.get('note') as string) || ''

    if (!audioFile) {
      return NextResponse.json(
        { success: false, error: 'Audio fayl yuklanmadi' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/m4a', 'audio/mp4', 'audio/ogg', 'audio/webm']
    const isAllowed = allowedTypes.some(t => audioFile.type.includes(t.split('/')[1])) || 
                      audioFile.name.match(/\.(mp3|wav|m4a|ogg|webm|mp4)$/i)
    if (!isAllowed) {
      return NextResponse.json(
        { success: false, error: 'Faqat MP3, WAV, M4A, OGG formatlar qo\'llab-quvvatlanadi' },
        { status: 400 }
      )
    }

    // Validate file size (50MB)
    const MAX_SIZE = 50 * 1024 * 1024
    if (audioFile.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: 'Fayl hajmi 50 MB dan oshmasligi kerak' },
        { status: 400 }
      )
    }

    console.log(`[ManualAudit] Starting analysis for ${audioFile.name} (${Math.round(audioFile.size / 1024)}KB)`)

    // Convert to buffer
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer())
    const mimeType = audioFile.type || 'audio/mpeg'

    // Step 1: Transcribe via Aisha AI
    const aisha = new AishaProvider()

    let transcriptionResult
    try {
      transcriptionResult = await aisha.transcribe({
        audioBuffer,
        mimeType,
        durationSeconds: 0,
        hint: `Sotuv suhbati. Manager: ${managerName}. Mijoz: ${customerName || 'noma\'lum'}`,
      })
    } catch (err: any) {
      console.error('[ManualAudit] Transcription failed:', err.message)
      return NextResponse.json(
        { success: false, error: `Transkripsiya xatosi: ${err.message}` },
        { status: 500 }
      )
    }

    const transcript = transcriptionResult.rawText || ''
    const segments = transcriptionResult.segments || []

    if (!transcript || transcript.trim().length < 10) {
      return NextResponse.json(
        { success: false, error: 'Audio fayldan matn tanib olinmadi. Audio sifatini tekshiring.' },
        { status: 422 }
      )
    }

    // Step 2: Analyze against OKK criteria
    let analysisResult
    try {
      analysisResult = await aisha.analyzeCall({
        transcript,
        segments,
        callType: 'new_lead',
        criteria: OKK_CRITERIA,
      })
    } catch (err: any) {
      console.error('[ManualAudit] Analysis failed:', err.message)
      return NextResponse.json(
        { success: false, error: `Tahlil xatosi: ${err.message}` },
        { status: 500 }
      )
    }

    const durationMs = Date.now() - startTime

    // Build kotib.ai-style report
    const report = {
      // Header info
      companyName: companyName || 'Marketing Markazi',
      managerName,
      managerPosition,
      customerName,
      callNote,
      audioFileName: audioFile.name,
      audioDurationSeconds: transcriptionResult.durationSeconds || 0,
      analysisTimeMs: durationMs,
      analyzedAt: new Date().toISOString(),
      analyzedBy: user.name || 'Sistema',

      // OKK Score
      baholashTizimi: 100,
      totalScore: analysisResult.total_score ?? 0,
      maxScore: 100,

      // Transcript
      transcript,
      segments: segments.slice(0, 200),

      // Per-criterion results (9 sections)
      criteria: (analysisResult.criteria || []).map((c: any) => {
        const def = OKK_CRITERIA.find(o => o.code === c.criterion_code)
        return {
          code: c.criterion_code,
          nameUz: def?.nameUz || c.criterion_code,
          score: c.score ?? 0,
          maxScore: c.max_score ?? def?.maxScore ?? 10,
          status: c.status || (c.passed ? 'PASS' : 'FAIL'),
          passed: c.passed,
          isCritical: def?.isCritical ?? false,
          criticalFail: c.criticalFail ?? false,
          explanation: c.explanation || '',
          strengths: c.strengths || [],
          errors: c.errors || [],
          recommendations: c.recommendations || [],
          evidenceTimestamp: c.evidence_timestamp,
          evidenceQuote: c.evidence_quote,
        }
      }),

      // Summary sections
      summary: analysisResult.summary || '',
      strengths: analysisResult.strengths || [],
      mistakes: analysisResult.mistakes || [],
      recommendations: analysisResult.recommendation ? [analysisResult.recommendation] : [],
      ropRecommendation: analysisResult.rop_recommendation || '',
      nextStep: analysisResult.next_step || '',
      callResult: analysisResult.call_result || '',
      hasCriticalFails: analysisResult.has_critical_fails ?? false,

      // Business analysis
      businessAnalysis: analysisResult.business_analysis || null,

      // Speech analytics
      managerTalkRatio: analysisResult.manager_talk_ratio ?? 0,
      customerTalkRatio: analysisResult.customer_talk_ratio ?? 0,
      interruptions: analysisResult.interruptions ?? 0,
      longPauses: analysisResult.long_pauses ?? 0,
      fillerWords: analysisResult.filler_words || [],
      rudenessDetected: analysisResult.rudeness_detected ?? false,
      falsPromisesDetected: analysisResult.false_promises_detected ?? false,
      saleProbability: analysisResult.sale_probability ?? 0,
      scriptCompliance: analysisResult.script_compliance ?? 0,

      // Quotes
      importantQuotes: analysisResult.important_quotes || [],
      customerNeeds: analysisResult.customer_need || [],
      objections: analysisResult.objections || [],

      // Call type
      callType: analysisResult.call_type || 'new_lead',
      language: analysisResult.language || 'uz_cyrillic',
    }

    console.log(`[ManualAudit] Done ✓ Score: ${report.totalScore}/100 in ${durationMs}ms`)

    return NextResponse.json({ success: true, data: report })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    console.error('[ManualAudit] Unexpected error:', err)
    return NextResponse.json(
      { success: false, error: 'Server xatosi yuz berdi' },
      { status: 500 }
    )
  }
}
