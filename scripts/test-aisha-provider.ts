import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { getAudioSignedUrl } from '../src/lib/s3'
import { AishaProvider } from '../src/lib/ai/aisha.provider'

const p = new PrismaClient()

async function testProvider() {
  const callId = '18f4dbc6-d875-42bc-ac02-5f8d8d58c6f6'
  const rec = await p.callRecording.findUnique({ where: { callId } })
  if (!rec) return

  const url = await getAudioSignedUrl(rec.s3Key)
  const res = await fetch(url)
  const audioBuffer = Buffer.from(await res.arrayBuffer())

  const provider = new AishaProvider()
  console.log(`1. Testing ${provider.name} provider on ${audioBuffer.length} bytes...`)

  const start = Date.now()
  const result = await provider.transcribe({
    audioBuffer,
    mimeType: 'audio/mp3',
    durationSeconds: rec.durationSeconds || 98
  })
  const durationMs = Date.now() - start

  console.log(`\n--- AISHA PROVIDER RESULT (took ${(durationMs/1000).toFixed(1)}s) ---`)
  console.log('Provider:', result.provider)
  console.log('Language:', result.language)
  console.log('Total Segments:', result.segments.length)
  console.log('\nSegments:')
  result.segments.forEach((s) => {
    console.log(`[${s.speaker}] (${s.startSeconds}s - ${s.endSeconds}s): ${s.text}`)
  })

  await p.$disconnect()
}

testProvider().catch(console.error)
