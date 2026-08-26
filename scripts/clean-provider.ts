import fs from 'fs'

const filePath = 'src/lib/ai/openai.provider.ts'
let content = fs.readFileSync(filePath, 'utf-8')

// Let's check where `async analyzeCall(` starts and where `let attempts = 0` starts
const startIdx = content.indexOf('async analyzeCall(params: {')
const endIdx = content.indexOf('    let attempts = 0\n    const maxAttempts = 3')

if (startIdx !== -1 && endIdx !== -1) {
  const head = content.substring(0, startIdx)
  const tail = content.substring(endIdx)

  const cleanAnalyzeCall = `async analyzeCall(params: {
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
          \`- \${c.code}: \${c.nameUz} (макс: \${c.maxScore} балл\${c.isCritical ? ', КРИТИК' : ''})\`
      )
      .join('\\n')

    const scriptSection = params.scriptStages
      ? \`\\nСкрипт босқичлари:\\n\${params.scriptStages
          .map((s) => \`- \${s.name}: \${s.requiredActions.join(', ')}\`)
          .join('\\n')}\`
      : ''

    const systemPrompt = \`Сиз сотув бўлими қўнғироқларини юқори аниқликда таҳлил қиладиган, ақлли ва профессионал AI сотув аудитори ҳамда бизнес-консультантсиз.

Вазифангиз: берилган қўнғироқнинг транскрипциясини ва сонияма-сония сегментларини чуқур таҳлил қилиш ва ФАҚАТ қуйидаги JSON форматида аниқ, ҳаққоний жавоб бериш.

АҚЛЛИ AI АУДИТ ВА ТАҲЛИЛ ҚОИДАЛАРИ:
1. Барча матн майдонлари (хулоса, тавсия, хатолар, иқтибослар) ЎЗБЕК КИРИЛЛИЦАСИДА бўлиши ШАРТ!
2. Менежер ва мижоз овозлари ва мақсадларини чуқур тушунинг:
   - Менежер суҳбатни қанчалик бошқарди? Мижознинг эҳтиёжини аниқлай олдими ёки фақат ўз маҳсулоти ҳақида гапирдими?
   - Мижознинг ҳақиқий эътирозлари (нарх, вақт, ишончсизлик, "эртага телефон қилинг") нимадан иборат эканини аниқланг.
3. Чек-лист мезонларини (criteria) АДОЛАТЛИ ВА АНИҚ ДАЛИЛЛАР БИЛАН баҳоланг:
   - Агар мезоннинг максимал балли (макс) 1 бўлса, баҳо (score) фақат 1 (амалда қўлланилди/бажарилди) ёки 0 (амалда қўлланилмади/бажарилмади) бўлиши ШАРТ!
   - Агар мезон бажарилган бўлса passed: true, бажарилмаган бўлса passed: false.
   - Ҳар бир мезон учун СУҲБАТДАН АНИҚ ИҚТИБОС (evidence_quote) ва ВАҚТИ (evidence_timestamp) келтирилиши ШАРТ!
4. total_score барча мезонлардан (criteria) тўпланган балларнинг (score) АНИҚ ЙИҒИНДИСИ бўлиши ШАРТ!
5. Сотиш эҳтимолини (sale_probability 0-100%) мижознинг суҳбат сўнгидаги кайфиятига ва реал қизиқишига қараб объектив аниқланг.
6. Тавсиялар (recommendation) ва кейинги қадам (next_step) умумий эмас, айнан шу мижоз билан битимни ёпиш ёки менежер хатосини тузатиш учун аниқ, амалий бизнес-маслаҳат бўлсин!
7. Фақат JSON қайтаринг — ҳеч қандай қўшимча матн бўлмасин.

Чек-лист мезонлари:
\${criteriaList}
\${scriptSection}

JSON структураси:
{
  "call_type": "new_lead|repeat_call|sale|service|complaint|wrong_number",
  "language": "uz_cyrillic|ru|mixed_uz_ru",
  "summary": "қисқача, чуқур ва лўнда хулоса",
  "customer_need": ["эҳтиёж 1", "эҳтиёж 2"],
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
  "strengths": ["кучли томон 1"],
  "mistakes": ["хато 1"],
  "important_quotes": [{"speaker": "MANAGER", "timestamp": "01:23", "text": "..."}],
  "criteria": [{"criterion_code": "intro_callback_speed", "score": 1, "max_score": 1, "passed": true, "explanation": "Аризага 30 сония ичида қўнғироқ қилди", "evidence_timestamp": "00:05", "evidence_quote": "..."}],
  "total_score": 11,
  "recommendation": "тавсия матни",
  "next_step": "кейинги қадам"
}\`

    const userPrompt = \`Қўнғироқни таҳлил қилинг:

Қўнғироқ тури: \${params.callType || 'аниқланмаган'}

ТРАНСКРИПЦИЯ:
\${params.transcript}

СЕГМЕНТЛАР:
\${params.segments
  .slice(0, 400)
  .map(
    (s) =>
      \`[\${formatTime(s.startSeconds)}-\${formatTime(s.endSeconds)}] \${s.speaker === 'MANAGER' ? 'Менежер' : 'Мижоз'}: \${s.text}\`
  )
  .join('\\n')}\`
`
  fs.writeFileSync(filePath, head + cleanAnalyzeCall + '\n' + tail, 'utf-8')
  console.log('Successfully cleaned up openai.provider.ts!')
} else {
  console.error('Could not find indices!', startIdx, endIdx)
}
