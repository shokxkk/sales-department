// ─────────────────────────────────────────────────────────────────
//  AI Provider Interface
//  Swap between OpenAI, Gemini, or any future provider
//  without changing business logic
// ─────────────────────────────────────────────────────────────────

export interface TranscriptSegment {
  speaker: 'MANAGER' | 'CUSTOMER' | 'UNKNOWN'
  startSeconds: number
  endSeconds: number
  text: string
  confidence: number
  language?: string
  sort: number
}

export interface TranscriptionResult {
  language: string
  rawText: string
  segments: TranscriptSegment[]
  durationSeconds: number
  provider: string
  modelUsed: string
}

// OKK: Criterion evaluation status
// PASS         — criterion to'liq bajarildi
// PARTIAL      — qisman bajarildi (proportional score)
// FAIL         — bajarilmadi (0 score)
// NOT_APPLICABLE — ushbu qo'ng'iroq turiga tegishli emas (total denominator'dan chiqariladi)
export type CriterionStatusValue = 'PASS' | 'PARTIAL' | 'FAIL' | 'NOT_APPLICABLE'

// OKK: Per-criterion evidence item
export interface CriterionEvidence {
  quote: string
  start: number   // seconds
  end?: number    // seconds (optional)
}

// OKK: Extended criterion result with status + per-criterion findings
export interface AuditCriterionResult {
  criterion_code: string
  score: number
  max_score: number
  passed: boolean            // backward compat: PASS→true, others→false
  explanation: string        // general explanation (backward compat field)
  evidence_timestamp?: string  // "02:48" (backward compat)
  evidence_quote?: string      // (backward compat)

  // OKK fields — all optional for backward compatibility
  status?: CriterionStatusValue
  strengths?: string[]         // kuchli tomonlar (criterion darajasida)
  errors?: string[]            // xatolar ro'yxati (criterion darajasida)
  recommendations?: string[]   // tavsiyalar (criterion darajasida)
  evidence?: CriterionEvidence[] // structured evidence with timestamps
  criticalFail?: boolean         // true if isCritical===true AND status===FAIL
}

// OKK: 11-block business analysis
// All fields optional — AI must not invent data if not present in transcript
export interface BusinessAnalysis {
  callContext?: string           // Qo'ng'iroq konteksti
  customerRequest?: string       // Mijoz murojaat maqsadi
  productDemand?: string         // Talab va assortiment
  operations?: string            // Operatsion masalalar
  logistics?: string             // Logistika masalalar
  objections?: string            // Rad etish sabablari va e'tirozlar
  refusalReasons?: string        // Aniq rad sababi
  marketingInsights?: string     // Marketing manbasi
  managerPerformance?: string    // Menejer kompetentsiyasi
  customerSentiment?: string     // Mijoz kayfiyati
  businessInsights?: string      // Biznes-insight
  managementRecommendations?: string // Rahbar uchun tavsiya
}

export interface AuditAnalysisResult {
  call_type: string
  language: string
  summary: string
  customer_need: string[]
  objections: Array<{
    category: string
    quote: string
    timestamp: string
    handled: boolean
  }>
  manager_talk_ratio: number
  customer_talk_ratio: number
  interruptions: number
  long_pauses: number
  filler_words: Array<{ word: string; count: number }>
  rudeness_detected: boolean
  false_promises_detected: boolean
  script_compliance: number
  sale_probability: number
  strengths: string[]       // global-level strengths (backward compat)
  mistakes: string[]        // global-level mistakes (backward compat)
  important_quotes: Array<{
    speaker: string
    timestamp: string
    text: string
  }>
  criteria: AuditCriterionResult[]
  total_score: number
  recommendation: string    // global recommendation (backward compat)
  next_step?: string

  // OKK fields — optional for backward compat
  call_result?: string           // "Sotildi" | "Yo'qoldi" | "Follow-up" | "Rejalashtirildi"
  rop_recommendation?: string    // ROP uchun alohida tavsiya
  has_critical_fails?: boolean   // any criterion has criticalFail=true
  business_analysis?: BusinessAnalysis
}

export interface AIProvider {
  name: string

  /**
   * Transcribe an audio file buffer to text with speaker diarization
   * Output MUST be in Uzbek Cyrillic (uz-cyrillic)
   */
  transcribe(params: {
    audioBuffer: Buffer
    mimeType: string
    durationSeconds: number
    hint?: string  // Language hint
  }): Promise<TranscriptionResult>

  /**
   * Analyze a call transcript and return structured audit JSON
   * Output MUST be in Uzbek Cyrillic for all text fields
   */
  analyzeCall(params: {
    transcript: string
    segments: TranscriptSegment[]
    callType?: string
    scriptStages?: Array<{ name: string; requiredActions: string[] }>
    criteria: Array<{
      code: string
      nameUz: string
      maxScore: number
      isCritical: boolean
      appliesTo?: string[]  // Call types this criterion applies to (empty = all)
    }>
  }): Promise<AuditAnalysisResult>
}
