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

  console.log('Calling whisper-1 WITH prompt...')
  const resp = await o.audio.transcriptions.create({
    model: 'whisper-1',
    file,
    response_format: 'verbose_json',
    prompt: 'Assalomu alaykum. Yaxshimisiz? Bu sotuv bo‘limi. Bitrix, narxi, shartnoma, rahmat.'
  } as any)

  console.log('Whisper text:\n', resp.text)
  const segs = (resp as any).segments || []
  console.log('Total segments:', segs.length)
  segs.slice(0, 10).forEach((s: any) => {
    console.log(`(${s.start}s - ${s.end}s): ${s.text}`)
  })

  await p.$disconnect()
}

check().catch(console.error)
