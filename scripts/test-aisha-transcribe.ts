import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { getAudioSignedUrl } from '../src/lib/s3'

const API_KEY = 'kAR40Omw.6U2IOUNNfG1hCrLOLIqVnTPnK0qDzI4y'
const p = new PrismaClient()

async function testAisha() {
  const callId = '18f4dbc6-d875-42bc-ac02-5f8d8d58c6f6'
  const rec = await p.callRecording.findUnique({ where: { callId } })
  if (!rec) {
    console.error('No call recording found!')
    return
  }

  console.log('1. Fetching audio from S3...')
  const url = await getAudioSignedUrl(rec.s3Key)
  const res = await fetch(url)
  const buf = Buffer.from(await res.arrayBuffer())
  const blob = new Blob([buf], { type: 'audio/mp3' })

  console.log(`2. Sending audio (${buf.length} bytes) to Aisha v1 POST /api/v1/stt/post/ with has_diarization=true...`)
  
  const form1 = new FormData()
  form1.append('audio', blob, 'call.mp3')
  form1.append('language', 'uz')
  form1.append('has_diarization', 'true')

  try {
    const r1 = await fetch('https://back.aisha.group/api/v1/stt/post/', {
      method: 'POST',
      headers: {
        'X-Api-Key': API_KEY,
        'Accept-Language': 'uz'
      },
      body: form1
    })
    const text1 = await r1.text()
    console.log(`v1 response status: ${r1.status}`)
    console.log(`v1 response body: ${text1.slice(0, 1000)}`)
  } catch (e: any) {
    console.error('v1 error:', e.message)
  }

  console.log('\n3. Sending audio to Aisha v2 POST /api/v2/stt/post/ with has_diarization=true...')
  const form2 = new FormData()
  form2.append('audio', blob, 'call.mp3')
  form2.append('language', 'uz')
  form2.append('has_diarization', 'true')
  form2.append('title', `test-call-${callId}`)

  try {
    const r2 = await fetch('https://back.aisha.group/api/v2/stt/post/', {
      method: 'POST',
      headers: {
        'X-Api-Key': API_KEY
      },
      body: form2
    })
    const text2 = await r2.text()
    console.log(`v2 response status: ${r2.status}`)
    console.log(`v2 response body: ${text2.slice(0, 1000)}`)

    let id: number | null = null
    try {
      const json2 = JSON.parse(text2)
      id = json2.id
    } catch {}

    if (id) {
      console.log(`\n4. Polling GET /api/v2/stt/get/${id}/ ...`)
      for (let i = 0; i < 15; i++) {
        await new Promise((resolve) => setTimeout(resolve, 3000))
        const rPoll = await fetch(`https://back.aisha.group/api/v2/stt/get/${id}/`, {
          headers: { 'X-Api-Key': API_KEY }
        })
        const pollText = await rPoll.text()
        const pollJson = JSON.parse(pollText)
        console.log(`Attempt ${i + 1}: status = ${pollJson.status}`)
        if (pollJson.status === 'SUCCESS') {
          console.log('\n--- AISHA AI SUCCESS TRANSCRIPT ---')
          console.log('Transcript:\n', pollJson.transcript)
          console.log('\nDiarization:\n', JSON.stringify(pollJson.diarization, null, 2))
          break
        }
        if (pollJson.status === 'FAILED') {
          console.log('Task FAILED:', pollText)
          break
        }
      }
    }
  } catch (e: any) {
    console.error('v2 error:', e.message)
  }

  await p.$disconnect()
}

testAisha().catch(console.error)
