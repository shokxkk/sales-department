import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import OpenAI from 'openai'
import { getAudioSignedUrl } from '../src/lib/s3'

const p = new PrismaClient()
const o = new OpenAI()

async function check() {
  const callId = '18f4dbc6-d875-42bc-ac02-5f8d8d58c6f6'
  const rec = await p.callRecording.findUnique({ where: { callId } })
  if (!rec) return

  const url = await getAudioSignedUrl(rec.s3Key)
  const res = await fetch(url)
  const buf = Buffer.from(await res.arrayBuffer())
  const file = new File([buf], 'audio.mp3', { type: 'audio/mp3' })

  // Let's test whisper-1 with a richer Uzbek customer + manager prompt
  const richPrompt = 'Assalomu alaykum. Yaxshimisiz? Bu sotuv bo‘limi. Bitrix, narxi, shartnoma. Xo‘p bo‘ladi, qiziq emas, vaqtim yo‘q, keyinroq gaplashamiz, eshitaman, rahmat, xo‘p, mayli, yo‘q kerak emas, yaxshi, bo‘pti.'
  
  console.log('1. Testing whisper-1 with rich Uzbek prompt...')
  const resp = await o.audio.transcriptions.create({
    model: 'whisper-1',
    file,
    response_format: 'verbose_json',
    prompt: richPrompt
  } as any)

  const segs = (resp as any).segments || []
  console.log('\n--- RAW WHISPER SEGMENTS (60s - 98s) ---')
  const customerSegs = segs.filter((s: any) => s.start >= 60)
  customerSegs.forEach((s: any) => {
    console.log(`(${s.start}s - ${s.end}s) [prob: ${s.no_speech_prob}]: ${s.text}`)
  })

  // Now let's test what happens if we give GPT-4o a SUPER STRICT Uzbek reconstruction prompt with exact examples of customer phrases!
  const systemPrompt = `You are a native Uzbek linguistic reconstruction specialist and speech diarization expert.
Your goal is to take raw phonetic speech-to-text segments (transcribed by Whisper) from a telephone sales call and reconstruct them into 100% natural, grammatically correct Uzbek (O‘zbek tili).

WHY RAW WHISPER MAKES ERRORS ON CUSTOMER SPEECH:
Whisper often struggles with compressed telephone audio or low customer volume and outputs Azerbaijani / Turkish / Kazakh characters (e.g. "ə", "ı", "ğ", "ş", "ç", "qəsəbəri", "xətir", "gəsirəm", "oxulamsiz").
You MUST NEVER output any Azerbaijani/Turkish characters ("ə", "ı", "ğ", "ş", "ç"). You MUST convert all words with those letters into real Uzbek words (` + '`o‘`, `g‘`, `sh`, `ch`, `a`, `e`, `i`, `o`, `u`' + `) based on context and phonetic similarity.

EXAMPLES OF PHONETIC RECONSTRUCTION FOR CUSTOMERS IN UZBEK SALES CALLS:
- "qəsəbəri" / "Qasəbi" -> "Xo‘p, bo‘ladi" or "Qachon bo‘ladi?" or "Qiziq emas" or "Xabar beraman" (depending on context)
- "xətir" / "xətir varam" -> "Xo‘p, eshitaman" or "Xo‘p, rahmat"
- "gəsirəm" / "gəbər ori" -> "Gapiravering" or "Eshitaman" or "Ko‘ramiz"
- "Alayum" / "Alaykum" -> "Va alaykum assalom"
- "Kəm?" -> "Kim bu?" or "Kimsiz?"
- "oxulamsiz" / "oxulamırsa" -> "aloqaga chiqamiz" or "ishlamasa"

CRITICAL RULES:
1. ZERO FOREIGN CHARACTERS: Every single letter MUST be standard Uzbek Latin alphabet (` + '`a-z`, `o‘`, `g‘`, `sh`, `ch`' + `) OR Russian if the customer explicitly spoke Russian. Absolutely NO ` + '`ə`, `ı`, `ğ`, `ş`, `ç`' + `!
2. COMPLETE DICTIONARY WORDS ONLY: If a segment contains a broken phonetic word like "qəsəbəri" or "xətir", do NOT leave it broken. Reconstruct what the Uzbek customer actually said (e.g. "Xo‘p, bo‘ladi", "Rahmat, kerak emas", "Keyinroq gaplashamiz", "Eshitaman").
3. SPEAKER ROLES: "MANAGER" (sales representative presenting details/asking questions) vs "CUSTOMER" (client answering, asking "Kim bu?", or saying "Xo‘p bo‘ladi / kerak emas").
4. Output strictly as JSON:
{
  "segments": [
    { "index": number, "speaker": "MANAGER" | "CUSTOMER", "text": "Reconstructed clean Uzbek text" }
  ]
}`

  const formattedSegments = segs.map((seg: any, idx: number) => ({
    index: idx,
    start: seg.start,
    end: seg.end,
    text: seg.text.trim(),
  }))

  const userContent = JSON.stringify({
    full_conversation_context: resp.text,
    segments_to_correct: formattedSegments,
  })

  console.log('\n2. Testing super-strict GPT-4o reconstruction...')
  const response = await o.chat.completions.create({
    model: process.env.OPENAI_AUDIT_MODEL || 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  })

  const parsed = JSON.parse(response.choices[0]?.message?.content || '{}')
  const refinedList = parsed.segments || []
  console.log('\n--- RECONSTRUCTED SEGMENTS (60s - 98s) ---')
  refinedList.filter((s: any) => formattedSegments[s.index]?.start >= 60).forEach((s: any) => {
    const orig = formattedSegments[s.index]
    console.log(`[${s.speaker}] (${orig?.start}s - ${orig?.end}s): orig="${orig?.text}" ---> reconstructed="${s.text}"`)
  })

  await p.$disconnect()
}

check().catch(console.error)
