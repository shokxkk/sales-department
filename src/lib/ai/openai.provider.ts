// ─────────────────────────────────────────────────────────────────
//  OpenAI Provider Implementation
//  - Whisper for transcription (uz + ru + mixed)
//  - GPT-4o for structured audit JSON
//  - Output: Uzbek Cyrillic
// ─────────────────────────────────────────────────────────────────
import OpenAI from 'openai'
import { z } from 'zod'
import type {
  AIProvider,
  TranscriptionResult,
  TranscriptSegment,
  AuditAnalysisResult,
} from './provider.interface'

// ─── Zod schema for strict AI response validation ─────────────────

// OKK: criterion status enum
const CriterionStatusSchema = z.enum(['PASS', 'PARTIAL', 'FAIL', 'NOT_APPLICABLE'])

// OKK: structured evidence per criterion
const CriterionEvidenceSchema = z.object({
  quote: z.string(),
  start: z.number(),
  end: z.number().optional(),
})

// OKK: 11-block business analysis schema (all fields optional)
// AI must not invent data — only include what is present in transcript
const BusinessAnalysisSchema = z.object({
  callContext: z.string().optional(),
  customerRequest: z.string().optional(),
  productDemand: z.string().optional(),
  operations: z.string().optional(),
  logistics: z.string().optional(),
  objections: z.string().optional(),
  refusalReasons: z.string().optional(),
  marketingInsights: z.string().optional(),
  managerPerformance: z.string().optional(),
  customerSentiment: z.string().optional(),
  businessInsights: z.string().optional(),
  managementRecommendations: z.string().optional(),
}).optional()

const AuditResultSchema = z.object({
  call_type: z.string(),
  language: z.string(),
  summary: z.string(),
  customer_need: z.array(z.string()),
  objections: z.array(
    z.object({
      category: z.string(),
      quote: z.string(),
      timestamp: z.string(),
      handled: z.boolean(),
    })
  ),
  manager_talk_ratio: z.number().min(0).max(100),
  customer_talk_ratio: z.number().min(0).max(100),
  interruptions: z.number().min(0),
  long_pauses: z.number().min(0),
  filler_words: z.array(z.object({ word: z.string(), count: z.number() })),
  rudeness_detected: z.boolean(),
  false_promises_detected: z.boolean(),
  script_compliance: z.number().min(0).max(100),
  sale_probability: z.number().min(0).max(100),
  strengths: z.array(z.string()),
  mistakes: z.array(z.string()),
  important_quotes: z.array(
    z.object({
      speaker: z.string(),
      timestamp: z.string(),
      text: z.string(),
    })
  ),
  criteria: z.array(
    z.object({
      criterion_code: z.string(),
      score: z.number(),
      max_score: z.number(),
      passed: z.boolean(),
      explanation: z.string(),
      evidence_timestamp: z.string().optional(),
      evidence_quote: z.string().optional(),
      // OKK fields — optional, backward compatible
      status: CriterionStatusSchema.optional(),
      strengths: z.array(z.string()).optional(),
      errors: z.array(z.string()).optional(),
      recommendations: z.array(z.string()).optional(),
      evidence: z.array(CriterionEvidenceSchema).optional(),
      criticalFail: z.boolean().optional(),
    })
  ),
  total_score: z.number().min(0).max(100),
  recommendation: z.string(),
  next_step: z.string().optional(),
  // OKK top-level optional fields
  call_result: z.string().optional(),
  rop_recommendation: z.string().optional(),
  has_critical_fails: z.boolean().optional(),
  business_analysis: BusinessAnalysisSchema,
})

// ─── Provider Implementation ──────────────────────────────────────

export class OpenAIProvider implements AIProvider {
  readonly name = 'openai'

  private _client: OpenAI | null = null

  private get client(): OpenAI {
    if (!this._client) {
      if (!process.env.OPENAI_API_KEY) {
        console.warn('[OpenAIProvider] OPENAI_API_KEY is not set, using dummy key')
      }
      this._client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'dummy' })
    }
    return this._client
  }

  async transcribe(params: {
    audioBuffer: Buffer
    mimeType: string
    durationSeconds: number
    hint?: string
  }): Promise<TranscriptionResult> {
    const model = process.env.OPENAI_WHISPER_MODEL || 'whisper-1'

    // Create a File-like object for the OpenAI SDK
    const audioFile = new File([params.audioBuffer as unknown as BlobPart], 'audio.wav', {
      type: params.mimeType || 'audio/wav',
    })

    // Transcribe with verbose JSON to get segments + timestamps
    const response = await this.client.audio.transcriptions.create({
      model,
      file: audioFile,
      response_format: 'verbose_json',
      language: params.hint && params.hint !== 'uz' ? params.hint : undefined,
      prompt: 'Assalomu alaykum. Yaxshimisiz? Bu sotuv bo‘limi. Bitrix, narxi, shartnoma, rahmat.',
    })

    // Build segments — Whisper gives word-level or segment-level depending on model
    const rawSegments = (response as { segments?: Array<{
      start: number
      end: number
      text: string
      avg_logprob?: number
      no_speech_prob?: number
    }> }).segments || []

    // Filter out silent/hallucinated segments only when no_speech_prob is extremely high (> 0.98)
    const filteredSegments = rawSegments.filter(seg => (seg.no_speech_prob ?? 0) < 0.98 && seg.text.trim().length > 0)

    // Initial segment setup with fallback heuristic
    let segments: TranscriptSegment[] = filteredSegments.map((seg, idx) => ({
      speaker: idx % 2 === 0 ? 'MANAGER' : 'CUSTOMER',
      startSeconds: seg.start,
      endSeconds: seg.end,
      text: seg.text.trim(),
      confidence: Math.exp(seg.avg_logprob ?? -0.3),
      sort: idx,
    }))

    let rawText = response.text

    // Use GPT to perform both linguistic correction (from Azerbaijani/phonetic Whisper to clean Uzbek) and speaker diarization
    try {
      const refined = await this.refineTranscriptsAndSpeakers(segments, rawText)
      segments = refined.segments
      rawText = refined.rawText
    } catch (err) {
      console.warn('[OpenAIProvider] Transcript & speaker refinement failed, using fallback:', err)
    }

    return {
      language: 'uz',
      rawText,
      segments,
      durationSeconds: params.durationSeconds,
      provider: 'openai_whisper_plus_gpt4o',
      modelUsed: `${model}+${process.env.OPENAI_AUDIT_MODEL || 'gpt-4o'}`,
    }
  }

  private async refineTranscriptsAndSpeakers(
    segments: TranscriptSegment[],
    rawText: string
  ): Promise<{ segments: TranscriptSegment[]; rawText: string }> {
    if (segments.length === 0) return { segments, rawText }

    const model = process.env.OPENAI_AUDIT_MODEL || 'gpt-4o'
    const formattedSegments = segments.map((seg, idx) => ({
      index: idx,
      start: seg.startSeconds,
      end: seg.endSeconds,
      text: seg.text,
    }))

    const systemPrompt = `You are a native Uzbek linguistic reconstruction specialist and speech diarization expert for telephone sales conversations in Uzbekistan.
The input consists of raw acoustic speech-to-text segments from Whisper for a dialogue between a Sales Manager (MANAGER / Менежер) and a Client (CUSTOMER / Мижоз).

WHY RAW WHISPER MAKES ERRORS ON CUSTOMER SPEECH:
Because acoustic Whisper lacks native Uzbek orthography support and customer audio is often telephone-compressed or low volume, Whisper transcribes customer words phonetically using Azerbaijani, Kazakh, Turkish, or broken characters (e.g. "ə", "ı", "ğ", "ş", "ç", "qəsəbəri", "xətir", "gəsirəm", "oxulamsiz", "Qasəbi", "gəbər ori").
You MUST NEVER output any Azerbaijani/Turkish letters ("ə", "ı", "ğ", "ş", "ç"). You MUST reconstruct every single broken/foreign word into standard, natural Uzbek (` + '`o‘`, `g‘`, `sh`, `ch`, `a`, `e`, `i`, `o`, `u`' + `) matching what the customer or manager actually said.

CRITICAL RULES:
1. ZERO FOREIGN CHARACTERS: Every single character MUST be standard Uzbek Latin alphabet (` + '`a-z`, `o‘`, `g‘`, `sh`, `ch`' + `) OR Russian if the speaker spoke Russian. Absolutely NO ` + '`ə`, `ı`, `ğ`, `ş`, `ç`' + `!
2. COMPLETE DICTIONARY WORDS ONLY: If a segment contains broken phonetic words like "qəsəbəri", "xətir", or "gəsirəm", you MUST reconstruct them into proper, complete Uzbek words. Do NOT leave any Azerbaijani spelling.
3. DIARIZATION — CRITICAL SPEAKER IDENTIFICATION RULES:
   - MANAGER is the sales representative. They INTRODUCE THEMSELVES with their name AND company name ("Marketing Markazi", "Marketingdan", "Marketing markazidan").
   - CUSTOMER is the client. If a voice segment mentions someone's name (like "Alibek aka", "Ali baraka", "Hamid aka") but does NOT introduce a company, they are likely the CUSTOMER asking for a specific person, NOT the manager introducing themselves.
   - EXAMPLE: If transcript says "Alibek aka, savdo markazi aloqa chiqitvudim aka" — this is likely the MANAGER introducing themselves. But if the audio says "Ali baraka? Aloqa" and it's the first utterance from that channel, check context. 
   - The MANAGER always speaks first in outbound calls. The CUSTOMER always picks up or calls in.
   - If a segment says something like "Kim bu?" or "Ha, aytingchi" without any company name, it's almost always the CUSTOMER.
   - Do NOT assign MANAGER to a segment just because it mentions a person's name. MANAGER must mention a COMPANY context.
4. REMOVE HALLUCINATION LOOPS: If trailing segments are repeated loops or filler, set their text to "" (empty string).
5. Output strictly as JSON:
{
  "segments": [
    { "index": number, "speaker": "MANAGER" | "CUSTOMER", "text": "Reconstructed clean Uzbek text" }
  ]
}
Ensure exact length ${segments.length}. Do not return any other text.`

    const userContent = JSON.stringify({
      full_conversation_context: rawText,
      segments_to_correct: formattedSegments,
    })

    const response = await this.client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    })

    let content = response.choices[0]?.message?.content || '{}'
    content = content.replace(/```json\s*|```\s*/g, '').trim()
    const parsed = JSON.parse(content)
    const refinedList = parsed.segments as Array<{ index: number; speaker: string; text: string }>

    if (Array.isArray(refinedList) && refinedList.length > 0) {
      const updatedSegments: TranscriptSegment[] = []
      for (let i = 0; i < segments.length; i++) {
        const orig = segments[i]
        const ref = refinedList.find((r) => r.index === i) || refinedList[i]
        const cleanedText = (ref?.text || orig.text).trim()
        if (!cleanedText) continue

        const speaker = (ref?.speaker === 'MANAGER' || ref?.speaker === 'CUSTOMER')
          ? (ref.speaker as 'MANAGER' | 'CUSTOMER')
          : orig.speaker

        updatedSegments.push({
          ...orig,
          speaker,
          text: cleanedText,
          sort: updatedSegments.length,
        })
      }

      const updatedRawText = updatedSegments
        .map((s) => `${s.speaker === 'MANAGER' ? 'Менежер' : 'Мижоз'}: ${s.text}`)
        .join('\n')

      return { segments: updatedSegments, rawText: updatedRawText }
    }

    return { segments, rawText }
  }

  async analyzeCall(params: {
    transcript: string
    segments: TranscriptSegment[]
    callType?: string
    scriptStages?: Array<{ name: string; requiredActions: string[] }>
    criteria: Array<{
      code: string
      nameUz: string
      maxScore: number
      isCritical: boolean
    }>
  }): Promise<AuditAnalysisResult> {
    const model = process.env.OPENAI_AUDIT_MODEL || 'gpt-4o'

    const criteriaList = params.criteria
      .map(
        (c) =>
          `- ${c.code}: ${c.nameUz} (макс: ${c.maxScore} балл${c.isCritical ? ', КРИТИК' : ''})`
      )
      .join('\n')

    const scriptSection = params.scriptStages
      ? `\nСкрипт босқичлари:\n${params.scriptStages
          .map((s) => `- ${s.name}: ${s.requiredActions.join(', ')}`)
          .join('\n')}`
      : ''

    const systemPrompt = `Сиз Marketing Markazi сотув бўлими учун OKK (Sifat Nazorati) стандарти бўйича қўнғироқларни юқори аниқликда таҳлил қиладиган профессионал AI аудитор ва бизнес-консультантсиз.

Вазифангиз: берилган қўнғироқнинг транскрипциясини ва сегментларини контекст билан чуқур таҳлил қилиш ва ФАҚАТ қуйидаги JSON форматида жавоб бериш.

═══════════════════════════════════════════════
CALL CENTER 8 БОШ СТАНДАРТИ БАҲОЛАШ ҚОИДАЛАРИ
═══════════════════════════════════════════════

1. Salomlashish va identifikatsiya (10 балл, КРИТИК):
   — Менежер о‘зини (исм), компанияни ("Marketing Markazi") ва лавозимини ("сотув менежериман") айтиши шарт.
   — Мижоз исмини аниқлаб, суҳбат давомида мижозга исми билан мурожаат қилиши керак.
   — НОРАСМИЙ мурожаатлар ("ака", "опа", "опажон", "акажон", "холажон", "амаки") ҚАТЪИЯН ТАҚИҚЛАНАДИ! Мижоз исмини айтмаса — "ҳурматли мижоз".
   — Чиқувчи қўнғироқларда гаплашишга қулайлигини аниқлаши керак. Ноқулай бўлса — бошқа вақ5. E’tirozlar bilan ishlash (15 балл):
   — ЖУДА МУҲИМ ҚОИДА: Агар суҳбатда мижоз томонидан ҳеч қандай эътироз билдирилмаган бўлса ("Эътирозлар бўлмади") — менежерга БАҲО СИФАТИДА ТЎЛИҚ 15 БАЛЛ берилади (status = PASS, score = 15, passed = true, explanation = "Мижоз томонидан эътирозлар билдирилмади (15/15 балл)").
   — Агар мижоз эътироз билдирса ва менежер унга тўғри, мантиқий ва қийматга асосланган жавоб берса — 15 балл (status = PASS).
   — ФАҚАТ менежер мижоз эътирозига жавоб бера олмаса, жавобсиз қолдирса ёки инкор қилиб баҳслашса — 0 балл берилади (status = FAIL, score = 0, passed = false).

═══════════════════════════════════════

1. БАРЧА МАТН МАЙДОНЛАРИ ЎЗБЕК КИРИЛЛИЦАСИДА бўлиши ШАРТ!
   — Мезон номларида ёки матнларда ҳеч қачон "greeting_hello" инглизча сўзи чиқмасин! Унинг ўрнига доимо "Саломлашиш ва идентификация" ёки "Саломлашиш" деб ёзинг.

2. КОНТЕКСТ-АВЕЙРлик:
   — Агар эътироз бўлмаса — "E’tirozlar bilan ishlash" мезони status = PASS, score = 15 (тўлиқ 15 балл берилади).
   — Кирувчи қўнғироқда "Гаплашишга қулайми?" саволи берилмаса — FAIL эмас, NOT_APPLICABLE.�айта қўнғироқ" каби бир хил стандарт шаблон ёки такрорланувчи матн ишлатманг! Суҳбат транскриптини РЕАЛ ўрганиб чиқиб, менежер ва мижоз айнан нимага келишиб олганини (масалан: "Сешанба куни соат 15:00 да қайта боғланиш", "Тижорий таклиф кўриб чиқилгач 5-сентябрда қўнғироқ қилиш", "Мижоз ўйлаб кўриб ўзи алоқага чиқади") аниқ кўрсатиб ёзинг. Агар суҳбатда кейинги қадам умуман келишилмаган бўлса — "Кейинги қадам келишилмади" деб ёзинг.

10. Фақат JSON қайтаринг — ҳеч қандай қўшимча матн бўлмасин.

Чек-лист мезонлари:
${criteriaList}
${scriptSection}

JSON структураси:
{
  "call_type": "new_lead|repeat_call|sale|service|complaint|wrong_number",
  "language": "uz_cyrillic|ru|mixed_uz_ru",
  "summary": "қисқача, чуқур ва лўнда хулоса",
  "customer_need": ["эҳтиёж 1"],
  "objections": [{"category": "price|time|trust|other", "quote": "...", "timestamp": "00:00", "handled": false}],
  "manager_talk_ratio": 60,
  "customer_talk_ratio": 40,
  "interruptions": 2,
  "long_pauses": 1,
  "filler_words": [{"word": "демак", "count": 5}],
  "rudeness_detected": false,
  "false_promises_detected": false,
  "script_compliance": 75,
  "sale_probability": 65,
  "strengths": ["умумий кучли томон"],
  "mistakes": ["умумий хато"],
  "important_quotes": [{"speaker": "MANAGER", "timestamp": "01:23", "text": "..."}],
  "criteria": [{
    "criterion_code": "greeting_hello",
    "score": 4,
    "max_score": 5,
    "passed": true,
    "status": "PARTIAL",
    "explanation": "Умумий тушунтириш",
    "strengths": ["Кучли томон 1"],
    "errors": ["Хато 1"],
    "recommendations": ["Тавсия 1"],
    "evidence": [{"quote": "Ассалому алайкум...", "start": 2.5, "end": 5.0}],
    "evidence_timestamp": "00:02",
    "evidence_quote": "Ассалому алайкум",
    "criticalFail": false
  }],
  "total_score": 55,
  "recommendation": "менежерга тавсия",
  "rop_recommendation": "РОП учун тавсия",
  "call_result": "Follow-up",
  "next_step": "суҳбатдаги аниқ ва РЕАЛ келишилган кейинги қадам ва вақти (масалан: 'Сешанба куни соат 14:00 да қайта қўнғироқ')",�══════════════════════════════════════

1. БАРЧА МАТН МАЙДОНЛАРИ ЎЗБЕК КИРИЛЛИЦАСИДА бўлиши ШАРТ!

2. КОНТЕКСТ-АВЕЙРлик:
   — Агар эътироз бўлмаса — "E’tirozlar bilan ishlash" мезони status = NOT_APPLICABLE (score = 0, denominator'дан чиқарилади).
   — Кирувчи қўнғироқда "Гаплашишга қулайми?" саволи берилмаса — FAIL эмас, NOT_APPLICABLE.
   — Хизмат/сервис қўнғироғида сотув тақдимоти мажбурий эмас.

3. CRITERION STATUS ҚОИДАЛАРИ:
   — PASS: мезон тўлиқ бажарилди → score = max_score, passed = true
   — PARTIAL: қисман бажарилди → score = GPT белгиласин (0 дан max_score гача), passed = false
   — FAIL: бажарилмади → score = 0, passed = false
   — NOT_APPLICABLE: бу қўнғироқ турига тегишли эмас → score = 0, passed = false

4. CRITICAL FAIL:
   Агар КРИТИК деб белгиланган мезон status = FAIL бўлса:
   → criticalFail = true (мезон ичида)
   → has_critical_fails = true (жавоб юқорисида)
   КРИТИК ҳолатлар: ҳақорат, ёлғон ваъда ("100% ҳал қиламиз"), норасмий тақиқланган мурожаатлар ("ака/опа"), мижозни танбеҳлаш/устидан кулиш, компания номини айтмаслик.

5. ҲАР БИР МЕЗОН УЧУН:
   — explanation: тушунтириш
   — strengths[]: айнан шу мезон бўйича кучли томонлар
   — errors[]: айнан шу мезон бўйича хатолар
   — recommendations[]: айнан шу мезон бўйича тавсиялар
   — evidence_timestamp, evidence_quote: аниқ иқтибос

6. TOTAL SCORE:
   total_score = NOT_APPLICABLE бўлмаган мезонларнинг score йиғиндиси.

7. БИЗНЕС ТАҲЛИЛ (business_analysis):
   Фақат транскриптда аниқ маълумот бўлса тўлдир. Маълумот бўлмаса — ҚОЛДИР (null). УЙЛАБ ТОПМА!

8. Фақат JSON қайтаринг — ҳеч қандай қўшимча матн бўлмасин.

Чек-лист мезонлари:
${criteriaList}
${scriptSection}

JSON структураси:
{
  "call_type": "new_lead|repeat_call|sale|service|complaint|wrong_number",
  "language": "uz_cyrillic|ru|mixed_uz_ru",
  "summary": "қисқача, чуқур ва лўнда хулоса",
  "customer_need": ["эҳтиёж 1"],
  "objections": [{"category": "price|time|trust|other", "quote": "...", "timestamp": "00:00", "handled": false}],
  "manager_talk_ratio": 60,
  "customer_talk_ratio": 40,
  "interruptions": 2,
  "long_pauses": 1,
  "filler_words": [{"word": "демак", "count": 5}],
  "rudeness_detected": false,
  "false_promises_detected": false,
  "script_compliance": 75,
  "sale_probability": 65,
  "strengths": ["умумий кучли томон"],
  "mistakes": ["умумий хато"],
  "important_quotes": [{"speaker": "MANAGER", "timestamp": "01:23", "text": "..."}],
  "criteria": [{
    "criterion_code": "greeting_hello",
    "score": 4,
    "max_score": 5,
    "passed": true,
    "status": "PARTIAL",
    "explanation": "Умумий тушунтириш",
    "strengths": ["Кучли томон 1"],
    "errors": ["Хато 1"],
    "recommendations": ["Тавсия 1"],
    "evidence": [{"quote": "Ассалому алайкум...", "start": 2.5, "end": 5.0}],
    "evidence_timestamp": "00:02",
    "evidence_quote": "Ассалому алайкум",
    "criticalFail": false
  }],
  "total_score": 55,
  "recommendation": "менежерга тавсия",
  "rop_recommendation": "РОП учун тавсия",
  "call_result": "Follow-up",
  "next_step": "суҳбатдаги аниқ ва РЕАЛ келишилган кейинги қадам ва вақти (масалан: 'Сешанба куни соат 14:00 да қайта қўнғироқ')",
  "has_critical_fails": false,
  "business_analysis": {
    "callContext": "Янги мижоз, биринчи мурожаат",
    "customerRequest": "Маҳсулот нархини сўради",
    "customerSentiment": "Позитив, қизиқиш бор",
    "managementRecommendations": "Менежерга тренинг тавсия этилади"
  }
}`

    const userPrompt = `Қўнғироқни таҳлил қилинг:

Қўнғироқ тури: ${params.callType || 'аниқланмаган'}

ТРАНСКРИПЦИЯ:
${params.transcript}

СЕГМЕНТЛАР:
${params.segments
  .slice(0, 400)
  .map(
    (s) =>
      `[${formatTime(s.startSeconds)}-${formatTime(s.endSeconds)}] ${s.speaker === 'MANAGER' ? 'Менежер' : 'Мижоз'}: ${s.text}`
  )
  .join('\n')}`
    let attempts = 0
    const maxAttempts = 3
    let lastErrorMsg = ''
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]

    while (attempts < maxAttempts) {
      try {
        if (attempts > 0) {
          // Supply error feedback to OpenAI on retry for self-repair
          messages.push({
            role: 'user',
            content: `ТИЗИМ ХАТОСИ: Олдинги жавоб JSON схема талабларига мос келмади. Хатолик: ${lastErrorMsg}. Илтимос, хатоликни тўғриланг ва схемага тўлиқ мос келувчи янги JSON қайтаринг.`,
          } as any)
        }

        const response = await this.client.chat.completions.create({
          model,
          messages: messages as any,
          response_format: { type: 'json_object' },
          temperature: 0.1,
          max_tokens: 4096,
        })

        const rawJson = response.choices[0]?.message?.content
        if (!rawJson) {
          throw new Error('OpenAI returned empty response')
        }

        let parsed: unknown
        try {
          parsed = JSON.parse(rawJson)
        } catch {
          throw new Error(`Invalid JSON format: ${rawJson.slice(0, 150)}`)
        }

        const validated = AuditResultSchema.safeParse(parsed)
        if (!validated.success) {
          const errorsText = validated.error.errors
            .slice(0, 3)
            .map((e) => `${e.path.join('.')}: ${e.message}`)
            .join(', ')
          throw new Error(`AI response failed validation: ${errorsText}`)
        }

        return validated.data as AuditAnalysisResult
      } catch (err: any) {
        attempts++
        lastErrorMsg = err.message || String(err)
        console.warn(`[GPT-4o/Audit] Attempt ${attempts} failed: ${lastErrorMsg}`)
        if (attempts >= maxAttempts) {
          throw new Error(`GPT-4o audit failed after ${maxAttempts} attempts. Last error: ${lastErrorMsg}`)
        }
      }
    }

    throw new Error('GPT-4o audit failed')
  }
}

// ─── Helpers ──────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
