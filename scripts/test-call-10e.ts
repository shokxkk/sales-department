import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { getAudioSignedUrl } from '../src/lib/s3'
import { AishaProvider } from '../src/lib/ai/aisha.provider'

const p = new PrismaClient()

async function testCall() {
  const callId = '10e2ebc7-1960-48be-93a3-20ce5966f970'
  const rec = await p.callRecording.findUnique({ where: { callId } })
  if (!rec) {
    console.log('No recording for callId:', callId)
    return
  }

  const url = await getAudioSignedUrl(rec.s3Key)
  const res = await fetch(url)
  const audioBuffer = Buffer.from(await res.arrayBuffer())

  const provider = new AishaProvider()
  console.log(`Testing ${provider.name} provider on ${audioBuffer.length} bytes for call ${callId}...`)

  const result = await provider.transcribe({
    audioBuffer,
    mimeType: 'audio/mp3',
    durationSeconds: rec.durationSeconds || 162
  })

  console.log('--- TRANSCRIPTION RESULT ---')
  console.log('Provider:', result.provider)
  console.log('Total Segments:', result.segments.length)
  result.segments.slice(0, 15).forEach((s) => {
    console.log(`[${s.speaker}] (${s.startSeconds}s - ${s.endSeconds}s): ${s.text}`)
  })

  await p.$disconnect()
}

testCall().catch(console.error)
