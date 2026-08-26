import 'dotenv/config'
import { PrismaClient, AnalysisStatus } from '@prisma/client'
import { getCallAnalysisQueue } from '../src/lib/queues'

const prisma = new PrismaClient()

async function trigger() {
  const callId = '18f4dbc6-d875-42bc-ac02-5f8d8d58c6f6'
  const call = await prisma.call.findUnique({ where: { id: callId } })
  if (!call) {
    console.error('Call not found:', callId)
    return
  }

  console.log('Found call:', call.id, 'companyId:', call.companyId)

  // 1. Delete old transcript and audit results so worker creates fresh ones
  const audits = await prisma.audit.findMany({ where: { callId }, select: { id: true } })
  for (const a of audits) {
    await prisma.auditCriterionResult.deleteMany({ where: { auditId: a.id } })
  }
  await prisma.audit.deleteMany({ where: { callId } })

  const transcripts = await prisma.callTranscript.findMany({ where: { callId }, select: { id: true } })
  for (const t of transcripts) {
    await prisma.transcriptSegment.deleteMany({ where: { transcriptId: t.id } })
  }
  await prisma.callTranscript.deleteMany({ where: { callId } })

  await prisma.backgroundJob.deleteMany({ where: { callId } })

  // 2. Create new background job
  const job = await prisma.backgroundJob.create({
    data: {
      companyId: call.companyId,
      callId,
      queue: 'call-analysis',
      jobName: 'analyze-call',
      status: 'PENDING',
      payload: { callId, companyId: call.companyId },
    },
  })

  // Update call status
  await prisma.call.update({
    where: { id: callId },
    data: { analysisStatus: AnalysisStatus.QUEUED },
  })

  // 3. Queue job in BullMQ
  const queue = getCallAnalysisQueue()
  const oldJob = await queue.getJob(`call-analysis-${callId}`)
  if (oldJob) {
    await oldJob.remove()
  }

  await queue.add(
    'analyze-call',
    {
      callId,
      companyId: call.companyId,
      jobDbId: job.id,
    },
    {
      jobId: `call-analysis-${callId}`,
      priority: 1,
    }
  )

  console.log(`Successfully queued analyze-call job ${job.id} for call ${callId}!`)
  await prisma.$disconnect()
}

trigger().catch(console.error)
