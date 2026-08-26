import { PrismaClient } from '@prisma/client'
import OpenAI from 'openai'
import { getAudioSignedUrl } from '../src/lib/s3'

const p = new PrismaClient()
const o = new OpenAI()

async function testAudioGpt4o() {
  const callId = '49a99408-c62b-45d9-a61f-c497832759ca'
  const rec = await p.callRecording.findUnique({ where: { callId } })
  if (!rec) return
  const url = await getAudioSignedUrl(rec.s3Key)
  const res = await fetch(url)
  const buf = Buffer.from(await res.arrayBuffer())
  const base64Audio = buf.toString('base64')

  console.log('Testing gpt-4o-audio-preview transcription...')
  try {
    const resp = await o.chat.completions.create({
      model: 'gpt-4o-audio-preview',
      modalities: ['text'],
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Ушбу аудио сотув бўлими ва мижоз ўртасидаги телефон суҳбати. Суҳбатни тўлиқ, аниқ ва хатосиз ЎЗБЕК ТИЛИДА (ёки суҳбатда ишлатилган рус/ўзбек аралаш бўлса, аслида қандай айтилган бўлса шундай) диалог (Менежер ва Мижоз) кўринишида транскрипция қилиб беринг.',
            },
            {
              type: 'input_audio',
              input_audio: {
                data: base64Audio,
                format: 'wav',
              },
            },
          ],
        },
      ],
      temperature: 0,
    })
    console.log('\n--- GPT-4O-AUDIO-PREVIEW RESULT ---')
    console.log(resp.choices[0]?.message?.content)
  } catch (e) {
    console.error('Error with gpt-4o-audio-preview:', e)
  }

  await p.$disconnect()
}

testAudioGpt4o().catch(console.error)
