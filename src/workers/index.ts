// ─────────────────────────────────────────────────────────────────
//  BullMQ Worker — Standalone process
//  Handles: call analysis, CRM sync, telephony sync
//  Run with: npm run worker (tsx watch src/workers/index.ts)
//  Health endpoint: http://localhost:3001/health
// ─────────────────────────────────────────────────────────────────
import 'dotenv/config'
import http from 'http'
import { Worker, Job } from 'bullmq'
import { PrismaClient } from '@prisma/client'
import IORedis from 'ioredis'
import { QUEUES, JOBS, CallAnalysisJobData, CrmSyncJobData, WebhookCallJobData } from '@/lib/queues/index'

// ─── Init ─────────────────────────────────────────────────────────

const prisma = new PrismaClient()

const redis = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
})

redis.on('error', (err) => console.error('[Worker/Redis] Error:', err.message))
redis.on('connect', () => console.log('[Worker/Redis] Connected'))

// ─── Health Check Server (port 3001) ─────────────────────────────

let workerStatus = { running: true, activeJobs: 0, completedJobs: 0, failedJobs: 0 }

const healthServer = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', ...workerStatus, timestamp: new Date().toISOString() }))
  } else {
    res.writeHead(404)
    res.end()
  }
})

healthServer.listen(3001, () => {
  console.log('[Worker] Health server running on :3001')
})

// ─── Call Analysis Worker ─────────────────────────────────────────

const callAnalysisWorker = new Worker<CallAnalysisJobData>(
  QUEUES.CALL_ANALYSIS,
  async (job: Job<CallAnalysisJobData>) => {
    const { callId, companyId, jobDbId } = job.data
    workerStatus.activeJobs++

    try {
      console.log(`[Worker/CallAnalysis] Processing call ${callId} (job: ${job.name})`)

      // Dynamic imports to avoid bundling issues
      const { processCallAnalysis } = await import('./processors/call-analysis.processor')
      await processCallAnalysis({ callId, companyId, jobDbId, prisma })

      workerStatus.completedJobs++
    } finally {
      workerStatus.activeJobs--
    }
  },
  {
    connection: redis,
    concurrency: 3,  // Process up to 3 calls simultaneously
    limiter: { max: 10, duration: 60_000 },  // Max 10 jobs per minute
  }
)

// ─── CRM Sync Worker ──────────────────────────────────────────────

const crmSyncWorker = new Worker<CrmSyncJobData>(
  QUEUES.CRM_SYNC,
  async (job: Job<CrmSyncJobData>) => {
    const { companyId } = job.data
    workerStatus.activeJobs++

    try {
      console.log(`[Worker/CrmSync] Syncing ${job.name} for company ${companyId}`)

      if (job.name === JOBS.SYNC_AMOCRM_FULL || job.name === JOBS.SYNC_AMOCRM_INCREMENTAL) {
        const { syncAmoCRMOptimized } = await import('@/lib/integrations/amocrm')
        const isIncremental = job.name === JOBS.SYNC_AMOCRM_INCREMENTAL
        const result = await syncAmoCRMOptimized(companyId, {
          type: isIncremental ? 'fast' : 'full',
          sinceDays: isIncremental ? 1 : 30,
        })
        console.log(`[Worker/CrmSync] Done:`, result)
      } else if (job.name === JOBS.SEND_NOTE_TO_CRM) {
        const { sendAuditNoteToAmoCRM } = await import('@/lib/integrations/amocrm')
        const { dealCrmId, noteText } = job.data as unknown as { dealCrmId: string; noteText: string }
        await sendAuditNoteToAmoCRM({ companyId, dealCrmId, noteText })
      }

      workerStatus.completedJobs++
    } finally {
      workerStatus.activeJobs--
    }
  },
  {
    connection: redis,
    concurrency: 2,
  }
)

// ─── Telephony Sync Worker ────────────────────────────────────────

const telephonySyncWorker = new Worker<WebhookCallJobData>(
  QUEUES.TELEPHONY_SYNC,
  async (job: Job<WebhookCallJobData>) => {
    const { companyId, provider, payload, webhookLogId } = job.data
    workerStatus.activeJobs++

    try {
      console.log(`[Worker/TelephonySync] Processing ${provider} webhook for company ${companyId}`)

      if (provider === 'ONLINEPBX') {
        const { processOnlinePBXWebhook } = await import('@/lib/integrations/onlinepbx')
        const result = await processOnlinePBXWebhook({
          companyId,
          payload: payload as Parameters<typeof processOnlinePBXWebhook>[0]['payload'],
          webhookLogId,
        })
        console.log(`[Worker/TelephonySync] OnlinePBX result:`, result)
      }

      // Update webhook log status
      await prisma.webhookLog.update({
        where: { id: webhookLogId },
        data: { status: 'processed', processedAt: new Date() },
      }).catch(() => null)

      workerStatus.completedJobs++
    } catch (err) {
      await prisma.webhookLog.update({
        where: { id: webhookLogId },
        data: { status: 'error', error: String(err) },
      }).catch(() => null)
      throw err
    } finally {
      workerStatus.activeJobs--
    }
  },
  {
    connection: redis,
    concurrency: 5,
  }
)

// ─── Error Handlers ───────────────────────────────────────────────

callAnalysisWorker.on('failed', (job, err) => {
  workerStatus.failedJobs++
  console.error(`[Worker/CallAnalysis] Job ${job?.id} failed:`, err.message)
})

crmSyncWorker.on('failed', (job, err) => {
  workerStatus.failedJobs++
  console.error(`[Worker/CrmSync] Job ${job?.id} failed:`, err.message)
})

telephonySyncWorker.on('failed', (job, err) => {
  workerStatus.failedJobs++
  console.error(`[Worker/TelephonySync] Job ${job?.id} failed:`, err.message)
})

// ─── Graceful Shutdown ────────────────────────────────────────────

async function shutdown() {
  console.log('[Worker] Shutting down gracefully...')
  workerStatus.running = false

  await Promise.all([
    callAnalysisWorker.close(),
    crmSyncWorker.close(),
    telephonySyncWorker.close(),
  ])

  await prisma.$disconnect()
  await redis.quit()
  healthServer.close()

  console.log('[Worker] Shutdown complete')
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

console.log('[Worker] k4-AiController BullMQ Worker started')
console.log(`[Worker] Listening on queues: ${Object.values(QUEUES).join(', ')}`)
