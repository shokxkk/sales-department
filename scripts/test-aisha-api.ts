import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { getAudioSignedUrl } from '../src/lib/s3'

const API_KEY = 'kAR40Omw.6U2IOUNNfG1hCrLOLIqVnTPnK0qDzI4y'

async function check() {
  console.log('1. Probing Aisha API endpoints...')
  
  // Let's check common STT endpoint paths
  const paths = [
    '/api/v1/stt/post/',
    '/api/v1/stt/',
    '/api/v1/speech-to-text/post/',
    '/api/v1/stt/transcribe/'
  ]

  for (const path of paths) {
    try {
      const res = await fetch(`https://back.aisha.group${path}`, {
        method: 'OPTIONS',
        headers: { 'X-Api-Key': API_KEY }
      })
      console.log(`OPTIONS ${path} -> Status: ${res.status} ${res.statusText}`)
    } catch (e: any) {
      console.log(`OPTIONS ${path} -> Error: ${e.message}`)
    }
  }

  // Let's also do a GET or POST without body to see error messages
  for (const path of ['/api/v1/stt/post/', '/api/v1/stt/']) {
    try {
      const res = await fetch(`https://back.aisha.group${path}`, {
        method: 'POST',
        headers: { 'X-Api-Key': API_KEY }
      })
      const text = await res.text()
      console.log(`POST ${path} -> Status: ${res.status}, Body: ${text.slice(0, 300)}`)
    } catch (e: any) {
      console.log(`POST ${path} -> Error: ${e.message}`)
    }
  }
}

check()
