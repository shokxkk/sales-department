import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import OpenAI from 'openai'

const p = new PrismaClient()
const o = new OpenAI()

async function check() {
  const callId = '18f4dbc6-d875-42bc-ac02-5f8d8d58c6f6'
  const t = await p.callTranscript.findFirst({
    where: { callId },
    include: { segments: { orderBy: { sort: 'asc' } } }
  })
  if (!t) return

  // Let's check what rawText and segments are currently stored right now
  console.log('Current DB segments length:', t.segments.length)
  console.log('Current DB segments[0]:', t.segments[0]?.text)
  console.log('Current DB segments[1]:', t.segments[1]?.text)
  console.log('Current DB segments[2]:', t.segments[2]?.text)
  console.log('Current DB segments[3]:', t.segments[3]?.text)

  await p.$disconnect()
}

check().catch(console.error)
