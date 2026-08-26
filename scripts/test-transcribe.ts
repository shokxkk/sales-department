import { PrismaClient } from '@prisma/client'
import OpenAI from 'openai'
import { getAudioSignedUrl } from '../src/lib/s3'

const p = new PrismaClient()
const o = new OpenAI()

async function testOptions() {
  const callId = '49a99408-c62b-45d9-a61f-c497832759ca'
  const rec = await p.callRecording.findUnique({ where: { callId } })
  if (!rec) return
  const url = await getAudioSignedUrl(rec.s3Key)
  const res = await fetch(url)
  const buf = Buffer.from(await res.arrayBuffer())
  const file = new File([buf], 'audio.wav', { type: 'audio/wav' })

  // Test Option A: language: undefined, heavy Uzbek Latin + Cyrillic prompt
  console.log('--- OPTION A: language: undefined, Heavy Uzbek Prompt ---')
  try {
    const respA = await o.audio.transcriptions.create({
      model: 'whisper-1',
      file,
      response_format: 'verbose_json',
      prompt:
        'Assalomu alaykum. Bu O‘zbekiston Toshkent shahri sotuv bo‘limi va mijoz o‘rtasidagi telefon suhbati. ' +
        'Yaxshimisiz, xop bo‘ladi, narxi qancha, shartnoma, rahmat, salomat bo‘ling, hozirgi yangi filial. ' +
        'Ассалому алайкум, яхшимисиз, хўп бўлади, нархи қанча, шартнома, раҳмат.',
    })
    console.log('Detected Language A:', respA.language)
    console.log('Preview A:', respA.text.slice(0, 250))
    console.log('End A:', respA.text.slice(-250))
  } catch (e) {
    console.error('Option A Error:', e)
  }

  // Test Option B: language: 'ru' with Uzbek prompt
  console.log('\n--- OPTION B: language: ru with Uzbek prompt ---')
  try {
    const respB = await o.audio.transcriptions.create({
      model: 'whisper-1',
      file,
      response_format: 'verbose_json',
      language: 'ru',
      prompt:
        'Assalomu alaykum. Yaxshimisiz. Bizga telefon qilgan ekansiz. Bitrix, narxi qancha, dogovor, mahsulot, rahmat, salomat bo‘ling. Ассалому алайкум. Хўп бўлади.',
    })
    console.log('Preview B:', respB.text.slice(0, 250))
    console.log('End B:', respB.text.slice(-250))
  } catch (e) {
    console.error('Option B Error:', e)
  }

  await p.$disconnect()
}

testOptions().catch(console.error)
