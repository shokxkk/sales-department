// ─────────────────────────────────────────────────────────────────
//  MustaqiLLM Provider — NeuronAI Jamoasi
//  O'zbek tili uchun noldan yaratilgan 5B parametrli LLM
//  → Hugging Face: https://huggingface.co/NeuronUz/MustaqiLLM
//  → STT: Aisha AI (back.aisha.group) — o'zbek nutqini tanish
//  → Call Analysis: MustaqiLLM via HuggingFace Inference API
// ─────────────────────────────────────────────────────────────────
import type {
  AIProvider,
  AuditAnalysisResult,
  TranscriptionResult,
  TranscriptSegment,
} from './provider.interface'
import { AishaProvider } from './aisha.provider'
import { OpenAIProvider } from './openai.provider'
import { z } from 'zod'

const MUSTAQILLM_API_KEY = process.env.MUSTAQILLM_API_KEY || ''
const MUSTAQILLM_MODEL = process.env.MUSTAQILLM_MODEL || 'NeuronUz/MustaqiLLM'
// HuggingFace Inference API — OpenAI-compatible endpoint
const MUSTAQILLM_BASE_URL =
  process.env.MUSTAQILLM_BASE_URL ||
  'https://api-inference.huggingface.co/v1'

// ─── Zod schema (same structure as OpenAI provider) ───────────────

const CriterionStatusSchema = z.enum(['PASS', 'PARTIAL', 'FAIL', 'NOT_APPLICABLE'])

const CriterionEvidenceSchema = z.object({
  quote: z.string(),
  start: z.number(),
  end: z.number().optional(),
})

const BusinessAnalysisSchema = z
  .object({
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
  })
  .optional()

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
  call_result: z.string().optional(),
  rop_recommendation: z.string().optional(),
  has_critical_fails: z.boolean().optional(),
  business_analysis: BusinessAnalysisSchema,
})

// ─── MustaqiLLM Provider Implementation ──────────────────────────

export class MustaqiLLMProvider implements AIProvider {
  readonly name = 'mustaqillm'
  private aishaProvider = new AishaProvider()
  private _openAiFallback: OpenAIProvider | null = null

  private get openAiFallback(): OpenAIProvider {
    if (!this._openAiFallback) {
      this._openAiFallback = new OpenAIProvider()
    }
    return this._openAiFallback
  }

  /**
   * STT — delegated to Aisha AI (native Uzbek speech recognition)
   */
  async transcribe(params: {
    audioBuffer: Buffer
    mimeType: string
    durationSeconds: number
    hint?: string
  }): Promise<TranscriptionResult> {
    console.log('[MustaqiLLM] STT delegated to Aisha AI (o\'zbek nutqini tanish)...')
    return this.aishaProvider.transcribe(params)
  }

  /**
   * Call Analysis — uses MustaqiLLM (NeuronUz) via HuggingFace Inference API
   * O'zbek tilidagi suhbatni tahlil qilish uchun o'zbek tili uchun noldan yaratilgan LLM
   */
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
      appliesTo?: string[]
    }>
  }): Promise<AuditAnalysisResult> {
    console.log('[MustaqiLLM] Qo\'ng\'iroqni tahlil qilish boshlanmoqda — MustaqiLLM (NeuronAI)...')

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

    const systemPrompt = `Сиз Marketing Markazi сотув бўлими учун OKK (Sifat Nazorati) стандарти бўйича қўнғироқларни таҳлил қиладиган MustaqiLLM — ўзбек тили учун нолдан яратилган AI аудиторсиз.

Вазифангиз: берилган қўнғироқнинг транскрипциясини чуқур таҳлил қилиш ва ФАҚАТ қуйидаги JSON форматида жавоб бериш.

═══════════════════════════════════════════════
OKK БАҲОЛАШ ҚОИДАЛАРИ (ҚАТЪИЙ)
═══════════════════════════════════════════════

1. БАРЧА МАТН МАЙДОНЛАРИ ЎЗБЕК КИРИЛЛИЦАСИДА бўлиши ШАРТ!

2. КОНТЕКСТ-АВЕЙРлик (ЭНГ МУҲИМ ҚОИДА):
   — Мезонни қўнғироқ контекстисиз кўр кўрга баҳолама!
   — Агар мезон бу қўнғироқ туriga ТЕГИШЛИ БЎЛМАСА — NOT_APPLICABLE қайтар.
   — Мижоз ўзи биринчи сафар қўнғироқ қилаётган бўлса — FOLLOW_UP мезони NOT_APPLICABLE.
   — Эітироз BO'LMASA — "Эітирозлар билан ишлаш" мезони NOT_APPLICABLE.
   — INBOUND қўнғироқда "Гаплашишга қулайми?" FAIL ЭМАС — NOT_APPLICABLE.
   — COMPLAINT қўнғироқда FAB тақдимоти мажбурий эмас — NOT_APPLICABLE.
   — WRONG_NUMBER қўнғироқда барча сотув мезонлари NOT_APPLICABLE.

3. CRITERION STATUS ҚОИДАЛАРИ:
   — PASS: мезон тўлиқ бажарилди → score = max_score, passed = true
   — PARTIAL: қисман бажарилди → 0 дан max_score гача, passed = false
   — FAIL: умуман бажарилмади → score = 0, passed = false
   — NOT_APPLICABLE: бу қўнғироқ туriga тегишли эмас → score = 0, passed = false

4. CRITICAL FAIL:
   Агар мезон КРИТИК ВА status = FAIL → criticalFail = true, has_critical_fails = true

5. TOTAL SCORE:
   total_score = NOT_APPLICABLE БЎЛМАГАН мезонларнинг score йиғиндиси

6. Фақат JSON қайтаринг — ҳеч қандай қўшимча матн бўлмасин.

Чек-лист мезонлари:
${criteriaList}
${scriptSection}

JSON структураси:
{
  "call_type": "new_lead|repeat_call|sale|service|complaint|wrong_number",
  "language": "uz_cyrillic|ru|mixed_uz_ru",
  "summary": "қисқача хулоса",
  "customer_need": ["эҳтиёж 1"],
  "objections": [{"category": "price|time|trust|other", "quote": "...", "timestamp": "00:00", "handled": false}],
  "manager_talk_ratio": 60,
  "customer_talk_ratio": 40,
  "interruptions": 0,
  "long_pauses": 0,
  "filler_words": [{"word": "демак", "count": 3}],
  "rudeness_detected": false,
  "false_promises_detected": false,
  "script_compliance": 75,
  "sale_probability": 65,
  "strengths": ["кучли томон"],
  "mistakes": ["хато"],
  "important_quotes": [{"speaker": "MANAGER", "timestamp": "01:23", "text": "..."}],
  "criteria": [{
    "criterion_code": "greeting_hello",
    "score": 4,
    "max_score": 5,
    "passed": true,
    "status": "PARTIAL",
    "explanation": "Умумий тушунтириш",
    "strengths": ["Кучли томон"],
    "errors": ["Хато"],
    "recommendations": ["Тавсия"],
    "evidence": [{"quote": "Ассалому алайкум...", "start": 2.5, "end": 5.0}],
    "evidence_timestamp": "00:02",
    "evidence_quote": "Ассалому алайкум",
    "criticalFail": false
  }],
  "total_score": 55,
  "recommendation": "менежерга тавсия",
  "rop_recommendation": "РОП учун тавсия",
  "call_result": "Follow-up",
  "next_step": "Эртага 11:00 да қайта қўнғироқ",
  "has_critical_fails": false,
  "business_analysis": {
    "callContext": "Янги мижоз",
    "customerRequest": "Нарх сўради",
    "customerSentiment": "Позитив"
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
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]

    while (attempts < maxAttempts) {
      try {
        if (attempts > 0) {
          messages.push({
            role: 'user',
            content: `ТИЗИМ ХАТОСИ: Олдинги жавоб JSON схема талабларига мос келмади. Хатолик: ${lastErrorMsg}. Илтимос, хатоликни тўғриланг ва схемага тўлиқ мос келувчи янги JSON қайтаринг.`,
          })
        }

        const rawJson = await this.callMustaqiLLM(messages)

        if (!rawJson) {
          throw new Error('MustaqiLLM returned empty response')
        }

        // Strip any markdown code fences if the model wraps the response
        const cleaned = rawJson.replace(/```json\s*|\s*```/g, '').trim()

        let parsed: unknown
        try {
          parsed = JSON.parse(cleaned)
        } catch {
          throw new Error(`Invalid JSON from MustaqiLLM: ${cleaned.slice(0, 200)}`)
        }

        const validated = AuditResultSchema.safeParse(parsed)
        if (!validated.success) {
          const errorsText = validated.error.errors
            .slice(0, 3)
            .map((e) => `${e.path.join('.')}: ${e.message}`)
            .join(', ')
          throw new Error(`MustaqiLLM response failed validation: ${errorsText}`)
        }

        console.log('[MustaqiLLM] Tahlil muvaffaqiyatli yakunlandi ✓')
        return validated.data as AuditAnalysisResult
      } catch (err: any) {
        attempts++
        lastErrorMsg = err.message || String(err)
        console.warn(`[MustaqiLLM] Urinish ${attempts} muvaffaqiyatsiz: ${lastErrorMsg}`)
      }
    }

    console.warn('[MustaqiLLM] MustaqiLLM tahlili муваффақиятсиз бўлди. GPT-4o захира провайдерига ўтилмоқда...')
    return this.openAiFallback.analyzeCall(params)
  }

  /**
   * Calls MustaqiLLM via HuggingFace OpenAI-compatible Inference API
   */
  private async callMustaqiLLM(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
  ): Promise<string> {
    const endpoint = `${MUSTAQILLM_BASE_URL}/chat/completions`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (MUSTAQILLM_API_KEY) {
      headers['Authorization'] = `Bearer ${MUSTAQILLM_API_KEY}`
    }

    const body = JSON.stringify({
      model: MUSTAQILLM_MODEL,
      messages,
      temperature: 0.1,
      max_tokens: 4096,
      stream: false,
    })

    console.log(`[MustaqiLLM] → POST ${endpoint} (model: ${MUSTAQILLM_MODEL})`)

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(120_000), // 2 minutes
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`HuggingFace API xatosi (${res.status}): ${errText.slice(0, 300)}`)
    }

    const data = await res.json()
    const content = data?.choices?.[0]?.message?.content

    if (!content) {
      throw new Error('MustaqiLLM javob qaytarmadi (empty choices)')
    }

    return content
  }
}

// ─── Helpers ──────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
