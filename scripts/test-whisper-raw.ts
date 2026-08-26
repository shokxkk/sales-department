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

  console.log('Calling whisper-1...')
  const resp = await o.audio.transcriptions.create({
    model: 'whisper-1',
    file,
    response_format: 'verbose_json'
  } as any)

  console.log('Whisper raw text:\n', resp.text)
  console.log('\nWhisper segments:\n', (resp as any).segments?.map((s: any) => `(${s.start}s - ${s.end}s) [prob: ${s.no_speech_prob}]: ${s.text}`).join('\n'))
  await p.$disconnect()
}

check().catch(console.error)
