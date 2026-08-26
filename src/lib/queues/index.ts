import { Queue } from 'bullmq'

function getRedisConnection() {
  const url = process.env.REDIS_URL
  if (!url) throw new Error('REDIS_URL is not set')
  return { url }
}

// ─── Queue Names ──────────────────────────────────────────────────
export const QUEUES = {
  CALL_ANALYSIS: 'call-analysis',
  CRM_SYNC: 'crm-sync',
  TELEPHONY_SYNC: 'telephony-sync',
} as const

// ─── Job Names ────────────────────────────────────────────────────
export const JOBS = {
  // call-analysis queue
  DOWNLOAD_AUDIO: 'download-audio',
  TRANSCRIBE_AUDIO: 'transcribe-audio',
  ANALYZE_CALL: 'analyze-call',
  SAVE_AUDIT: 'save-audit',
  SEND_NOTE_TO_CRM: 'send-note-to-crm',

  // crm-sync queue
  SYNC_AMOCRM_FULL: 'sync-amocrm-full',
  SYNC_AMOCRM_INCREMENTAL: 'sync-amocrm-incremental',
  REFRESH_AMOCRM_TOKEN: 'refresh-amocrm-token',

  // telephony-sync queue
  SYNC_ONLINEPBX_CALLS: 'sync-onlinepbx-calls',
  PROCESS_WEBHOOK_CALL: 'process-webhook-call',
} as const

// ─── Job Data Types ───────────────────────────────────────────────

export interface CallAnalysisJobData {
  callId: string
  companyId: string
  jobDbId: string    // BackgroundJob.id in our DB
  step?: 'download' | 'transcribe' | 'analyze' | 'save'
}

export interface CrmSyncJobData {
  companyId: string
  integrationId: string
  syncType: 'full' | 'incremental'
  entities?: string[]  // ['deals', 'contacts', 'managers']
}

export interface WebhookCallJobData {
  companyId: string
  provider: string
  payload: Record<string, unknown>
  webhookLogId: string
}

export interface SendCrmNoteJobData {
  companyId: string
  auditId: string
  dealCrmId: string
}

// ─── Queue Factory ────────────────────────────────────────────────

const DEFAULT_JOB_OPTIONS = {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 5000,
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
}

let callAnalysisQueue: Queue | null = null
let crmSyncQueue: Queue | null = null
let telephonySyncQueue: Queue | null = null

export function getCallAnalysisQueue(): Queue {
  if (!callAnalysisQueue) {
    callAnalysisQueue = new Queue(QUEUES.CALL_ANALYSIS, {
      connection: getRedisConnection(),
      ...DEFAULT_JOB_OPTIONS,
    })
  }
  return callAnalysisQueue
}

export function getCrmSyncQueue(): Queue {
  if (!crmSyncQueue) {
    crmSyncQueue = new Queue(QUEUES.CRM_SYNC, {
      connection: getRedisConnection(),
      ...DEFAULT_JOB_OPTIONS,
    })
  }
  return crmSyncQueue
}

export function getTelephonySyncQueue(): Queue {
  if (!telephonySyncQueue) {
    telephonySyncQueue = new Queue(QUEUES.TELEPHONY_SYNC, {
      connection: getRedisConnection(),
      ...DEFAULT_JOB_OPTIONS,
    })
  }
  return telephonySyncQueue
}
