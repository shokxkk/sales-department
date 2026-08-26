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

  console.log('1. Calling whisper-1...')
  const resp = await o.audio.transcriptions.create({
    model: 'whisper-1',
    file,
    response_format: 'verbose_json',
    prompt: 'Assalomu alaykum. Yaxshimisiz? Bu sotuv bo‘limi. Bitrix, narxi, shartnoma, rahmat.'
  } as any)

  const rawSegments = (resp as any).segments || []
  const filteredSegments = rawSegments.filter((seg: any) => (seg.no_speech_prob ?? 0) < 0.98 && seg.text.trim().length > 0)

  console.log('Filtered segments count:', filteredSegments.length)
  const formattedSegments = filteredSegments.map((seg: any, idx: number) => ({
    index: idx,
    start: seg.start,
    end: seg.end,
    text: seg.text.trim(),
  }))

  const systemPrompt = `You are an expert linguistic editor and speech diarization assistant for telephone sales conversations in Uzbekistan.
The input consists of raw acoustic speech-to-text segments from Whisper for a dialogue between a Sales Manager (MANAGER / Менежер) and a Client (CUSTOMER / Мижоз).
Because acoustic Whisper lacks native Uzbek orthography support, it transcribes Uzbek phonetically using Azerbaijani, Kazakh, Turkish, or broken Russian characters (e.g. "Umarək ki" -> "Assalomu alaykum", "yaxşimisiz" -> "yaxshimisiz", "Xod, boladır" -> "Xop, bo‘ladi", "Markeci Markəzdən" -> "Marketing Markazidan"). Also, silences/noise at the end of audio often cause repetition loops.

CRITICAL RULES:
1. STRICTLY UZBEK OR RUSSIAN ONLY: DO NOT TRANSLATE TO ENGLISH! Every segment MUST be output in natural, grammatically correct Uzbek (O‘zbek tili) matching the speaker's language, OR Russian if the speaker spoke Russian.
2. LINGUISTIC CORRECTION: Use the full conversation context to correct misrecognized words and foreign spelling (Azerbaijani/Kazakh -> proper Uzbek).
3. DIARIZATION: Classify "speaker" as "MANAGER" (sales representative presenting details/asking questions) or "CUSTOMER" (client responding/asking questions).
4. REMOVE HALLUCINATION LOOPS: If trailing segments are repeated loops or filler (e.g. repeating "Xop, bo‘ladi" over and over), set their text to "" (empty string).
5. Output strictly as JSON:
{
  "segments": [
    { "index": number, "speaker": "MANAGER" | "CUSTOMER", "text": "Corrected text" }
  ]
}
Ensure exact length ${formattedSegments.length}. Do not return any other text.`

  const userContent = JSON.stringify({
    full_conversation_context: resp.text,
    segments_to_correct: formattedSegments,
  })

  console.log('2. Calling GPT-4o refinement...')
  const response = await o.chat.completions.create({
    model: process.env.OPENAI_AUDIT_MODEL || 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  })

  let content = response.choices[0]?.message?.content || '{}'
  const parsed = JSON.parse(content)
  const refinedList = parsed.segments || []
  console.log('Refined segments count:', refinedList.length)
  refinedList.forEach((s: any) => {
    const orig = formattedSegments[s.index]
    console.log(`[${s.speaker}] (${orig?.start}s - ${orig?.end}s): ${s.text}`)
  })

  await p.$disconnect()
}

check().catch(console.error)
