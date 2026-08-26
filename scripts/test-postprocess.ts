import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import OpenAI from 'openai'

const p = new PrismaClient()
const o = new OpenAI()

async function testPostProcess() {
  const callId = '49a99408-c62b-45d9-a61f-c497832759ca'
  const transcript = await p.callTranscript.findFirst({ where: { callId } })
  if (!transcript) return

  console.log('Raw Whisper text (Azerbaijani/phonetic):')
  console.log(transcript.rawText.slice(0, 500))

  console.log('\nRunning GPT-4o linguistic post-processing & diarization...')
  const prompt = `You are an expert linguistic editor and speech diarization assistant for Uzbek and Russian telephone sales conversations.
Below is the raw speech-to-text output from an acoustic Whisper model for a call between a Sales Manager (Менежер) and a Client (Мижоз).
Because the acoustic model does not have native Uzbek orthography support, it often transcribes Uzbek speech using Azerbaijani, Kazakh, Turkish, or broken Russian phonetic spelling (for example: "Umarək ki" -> "Assalomu alaykum", "yaxşimisiz" -> "yaxshimisiz", "Xod, boladır" -> "Xop, bo‘ladi", "Markeci Markəzdən" -> "Marketing Markazidan", "Zilfon qalaya doğdum" -> "Telefon qilgan edim").

Your task:
1. Reconstruct the exact, accurate conversation in clean, natural Uzbek (or Russian where the speaker spoke Russian).
2. Separate the dialogue by speaker turns: identify who is the Менежер (Sales Manager) and who is the Мижоз (Client).
3. Remove any acoustic hallucination loops (e.g. repeated "Xod, boladır" or filler loops at the end of the call).
4. Format your response strictly as clean dialogue lines:
Менежер: [text]
Мижоз: [text]`

  const resp = await o.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.1,
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: `Raw acoustic transcription:\n\n${transcript.rawText}` },
    ],
  })

  console.log('\n--- CORRECTED UZBEK DIALOGUE (GPT-4O) ---')
  console.log(resp.choices[0]?.message?.content)
  await p.$disconnect()
}

testPostProcess().catch(console.error)
