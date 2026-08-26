import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import OpenAI from 'openai'
import { getAudioSignedUrl } from '../src/lib/s3'

const p = new PrismaClient()
const o = new OpenAI()

async function testNoLang() {
  const callId = '49a99408-c62b-45d9-a61f-c497832759ca'
  const rec = await p.callRecording.findUnique({ where: { callId } })
  if (!rec) return

  const url = await getAudioSignedUrl(rec.s3Key)
  const res = await fetch(url)
  const buf = Buffer.from(await res.arrayBuffer())
  const file = new File([buf], 'audio.mp3', { type: 'audio/mp3' })

  console.log('Testing gpt-4o-transcribe without language param...')
  try {
    const resp1 = await o.audio.transcriptions.create({
      model: 'gpt-4o-transcribe',
      file,
      response_format: 'json',
      prompt: 'Language: Uzbek (O‘zbek tili). Assalomu alaykum. Bu sotuv bo‘limi va mijoz o‘rtasidagi telefon suhbati. Narxi qancha, shartnoma, rahmat.',
    } as any)
    console.log('\n--- gpt-4o-transcribe RESULT ---')
    console.log(JSON.stringify(resp1, null, 2))
  } catch (e: any) {
    console.error('Error with gpt-4o-transcribe:', e.message || e)
  }

  console.log('\nTesting gpt-4o-transcribe-diarize without language param...')
  try {
    const resp2 = await o.audio.transcriptions.create({
      model: 'gpt-4o-transcribe-diarize',
      file,
      response_format: 'json',
      prompt: 'Language: Uzbek (O‘zbek tili). Assalomu alaykum. Bu sotuv bo‘limi va mijoz o‘rtasidagi telefon suhbati. Narxi qancha, shartnoma, rahmat.',
    } as any)
    console.log('\n--- gpt-4o-transcribe-diarize RESULT ---')
    console.log(JSON.stringify(resp2, null, 2))
  } catch (e: any) {
    console.error('Error with gpt-4o-transcribe-diarize:', e.message || e)
  }

  await p.$disconnect()
}

testNoLang().catch(console.error)
