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

  console.log('1. Calling whisper-1 with clean prompt...')
  const resp = await o.audio.transcriptions.create({
    model: 'whisper-1',
    file,
    response_format: 'verbose_json',
    prompt: 'Assalomu alaykum. Yaxshimisiz? Bu sotuv bo‘limi. Bitrix, narxi, shartnoma, rahmat.'
  } as any)

  const segs = (resp as any).segments || []
  const formattedSegments = segs.map((seg: any, idx: number) => ({
    index: idx,
    start: seg.start,
    end: seg.end,
    text: seg.text.trim(),
  }))

  const systemPrompt = `You are a native Uzbek linguistic reconstruction specialist and speech diarization expert for telephone sales conversations in Uzbekistan.
The input consists of raw acoustic speech-to-text segments from Whisper for a dialogue between a Sales Manager (MANAGER / Менежер) and a Client (CUSTOMER / Мижоз).

WHY RAW WHISPER MAKES ERRORS ON CUSTOMER SPEECH:
Because acoustic Whisper lacks native Uzbek orthography support and customer audio is often telephone-compressed or low volume, Whisper transcribes customer words phonetically using Azerbaijani, Kazakh, Turkish, or broken characters (e.g. "ə", "ı", "ğ", "ş", "ç", "qəsəbəri", "xətir", "gəsirəm", "oxulamsiz", "Qasəbi", "gəbər ori").
You MUST NEVER output any Azerbaijani/Turkish letters ("ə", "ı", "ğ", "ş", "ç"). You MUST reconstruct every single broken/foreign word into standard, natural Uzbek (` + '`o‘`, `g‘`, `sh`, `ch`, `a`, `e`, `i`, `o`, `u`' + `) matching what the customer or manager actually said.

COMMON PHONETIC MAPPINGS IN SALES CALLS:
- "qəsəbəri" / "Qasəbi" / "qəsəbə" -> "Xo‘p, bo‘ladi" or "Qachon bo‘ladi?" or "Qiziq emas" (depending on context)
- "xətir" / "xətir varam" -> "Xo‘p, eshitaman" or "Xo‘p, rahmat"
- "gəsirəm" / "gəbər ori" -> "Gapiravering" or "Eshitaman"
- "Alayum" / "Alaykum" -> "Va alaykum assalom"
- "Kəm?" -> "Kim bu?" or "Kimsiz?"
- "oxulamsiz" / "oxulamırsa" -> "aloqaga chiqamiz" or "ishlamasa"

CRITICAL RULES:
1. ZERO FOREIGN CHARACTERS: Every single character MUST be standard Uzbek Latin alphabet (` + '`a-z`, `o‘`, `g‘`, `sh`, `ch`' + `) OR Russian if the speaker spoke Russian. Absolutely NO ` + '`ə`, `ı`, `ğ`, `ş`, `ç`' + `!
2. COMPLETE DICTIONARY WORDS ONLY: If a segment contains broken phonetic words like "qəsəbəri", "xətir", or "gəsirəm", you MUST reconstruct them into proper, complete Uzbek words. Do NOT leave any Azerbaijani spelling.
3. DIARIZATION: Classify "speaker" as "MANAGER" (sales representative presenting details/asking questions) or "CUSTOMER" (client responding/asking questions).
4. REMOVE HALLUCINATION LOOPS: If trailing segments are repeated loops or filler, set their text to "" (empty string).
5. Output strictly as JSON:
{
  "segments": [
    { "index": number, "speaker": "MANAGER" | "CUSTOMER", "text": "Reconstructed clean Uzbek text" }
  ]
}
Ensure exact length ${formattedSegments.length}. Do not return any other text.`

  const userContent = JSON.stringify({
    full_conversation_context: resp.text,
    segments_to_correct: formattedSegments,
  })

  console.log('2. Calling GPT-4o with zero-foreign-char reconstruction...')
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
  console.log('\n--- ALL RECONSTRUCTED TURNS ---')
  refinedList.forEach((s: any) => {
    const orig = formattedSegments[s.index]
    console.log(`[${s.speaker}] (${orig?.start}s - ${orig?.end}s): orig="${orig?.text}" ---> "${s.text}"`)
  })

  await p.$disconnect()
}

check().catch(console.error)
