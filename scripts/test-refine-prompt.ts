import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import OpenAI from 'openai'

const p = new PrismaClient()
const o = new OpenAI()

async function testRefinePrompt() {
  const callId = '49a99408-c62b-45d9-a61f-c497832759ca'
  const rec = await p.callRecording.findUnique({ where: { callId } })
  if (!rec) return

  // Let's get the raw segments from Whisper
  const t = await p.callTranscript.findFirst({
    where: { callId },
    include: { segments: { orderBy: { sort: 'asc' } } }
  })
  if (!t) return

  const formattedSegments = t.segments.map((seg, idx) => ({
    index: idx,
    original_acoustic_text: seg.text,
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
    { "index": number, "speaker": "MANAGER" | "CUSTOMER", "text": "Corrected Uzbek text" }
  ]
}
Ensure exact length ${formattedSegments.length}.`

  const userContent = JSON.stringify({
    full_conversation_context: t.rawText,
    segments_to_correct: formattedSegments
  })

  console.log('Calling GPT-4o with enhanced prompt...')
  const response = await o.chat.completions.create({
    model: process.env.OPENAI_AUDIT_MODEL || 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  })

  const content = response.choices[0]?.message?.content || '{}'
  const parsed = JSON.parse(content)
  const list = parsed.segments || []
  console.log('\n--- CORRECTED SEGMENTS OUTPUT ---')
  list.slice(0, 15).forEach((s: any) => {
    console.log(`[${s.speaker}] (seg ${s.index}): ${s.text}`)
  })
  await p.$disconnect()
}

testRefinePrompt().catch(console.error)
