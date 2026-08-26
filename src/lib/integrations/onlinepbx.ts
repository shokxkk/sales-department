// ─────────────────────────────────────────────────────────────────
//  OnlinePBX Integration
//  - Webhook receiver for new inbound/outbound answered calls
//  - Audio recording download
//  - Deduplication via company_id + provider + external_call_id
// ─────────────────────────────────────────────────────────────────
import { prisma } from '@/lib/prisma'
import { decryptJson } from '@/lib/encryption'
import { uploadAudio, buildAudioKey } from '@/lib/s3'
import { CallDirection, CallStatus, AnalysisStatus } from '@prisma/client'

export interface OnlinePBXConfig {
  apiKey: string
  domain: string       // e.g. "company.onlinepbx.ru"
  apiUserId?: string
}

export interface OnlinePBXWebhookPayload {
  call_id: string          // Unique call ID
  call_type: string        // 'inbound' | 'outbound'
  status: string           // 'answered' | 'missed' | 'busy' | 'noanswer'
  phone: string            // External phone number
  extension: string        // Internal extension (manager)
  started_at: string       // ISO datetime or Unix timestamp
  answered_at?: string
  ended_at?: string
  duration: number         // Total duration in seconds
  talk_duration: number    // Talk duration in seconds
  recording_url?: string   // URL to download the recording
  manager_name?: string
  crm_lead_id?: string     // If linked to CRM deal
}

/**
 * Process an incoming OnlinePBX webhook
 * Only saves NEW answered calls (inbound or outbound)
 * Skips missed calls, unanswered, and already-seen calls
 */
export async function processOnlinePBXWebhook(params: {
  companyId: string
  payload: OnlinePBXWebhookPayload
  webhookLogId: string
}): Promise<{ saved: boolean; callId?: string; reason?: string }> {
  const { companyId, payload } = params

  // RULE: Only process answered calls
  if (payload.status !== 'answered') {
    return { saved: false, reason: `Skipped: status=${payload.status}` }
  }

  // RULE: Only inbound and outbound (not robot, internal, etc.)
  const direction = payload.call_type === 'inbound'
    ? CallDirection.INBOUND
    : payload.call_type === 'outbound'
    ? CallDirection.OUTBOUND
    : null

  if (!direction) {
    return { saved: false, reason: `Skipped: unknown call_type=${payload.call_type}` }
  }

  // RULE: Must have a recording (no recording = can't analyze)
  // We still save the call without recording, just mark it NO_RECORDING

  // Dedup check
  const existing = await prisma.call.findUnique({
    where: {
      companyId_telephonyProvider_externalCallId: {
        companyId,
        telephonyProvider: 'ONLINEPBX',
        externalCallId: payload.call_id,
      },
    },
  })

  if (existing) {
    return { saved: false, reason: 'Duplicate call', callId: existing.id }
  }

  // Find manager by extension
  const manager = await prisma.manager.findFirst({
    where: {
      companyId,
      phone: { contains: payload.extension },
    },
  })

  // Find customer by phone
  const customer = await prisma.customer.findFirst({
    where: {
      companyId,
      phone: { contains: payload.phone.replace(/\D/g, '').slice(-10) },
    },
  })

  // Find deal by CRM ID
  const deal = payload.crm_lead_id
    ? await prisma.deal.findFirst({
        where: {
          companyId,
          crmId: String(payload.crm_lead_id),
        },
      })
    : null

  const analysisStatus = payload.recording_url
    ? AnalysisStatus.NOT_SELECTED
    : AnalysisStatus.NO_RECORDING

  const call = await prisma.call.create({
    data: {
      companyId,
      telephonyProvider: 'ONLINEPBX',
      externalCallId: payload.call_id,
      direction,
      status: CallStatus.ANSWERED,
      customerPhone: payload.phone,
      managerExtension: payload.extension,
      managerId: manager?.id || null,
      customerId: customer?.id || null,
      dealId: deal?.id || null,
      startedAt: parseDate(payload.started_at),
      answeredAt: payload.answered_at ? parseDate(payload.answered_at) : null,
      endedAt: payload.ended_at ? parseDate(payload.ended_at) : null,
      durationSeconds: payload.duration || 0,
      talkDurationSeconds: payload.talk_duration || 0,
      analysisStatus,
    },
  })

  // If recording URL provided, download and store it immediately
  if (payload.recording_url) {
    try {
      const config = await getOnlinePBXConfig(companyId).catch(() => ({ apiKey: undefined }))
      await downloadAndStoreRecording({
        companyId,
        callId: call.id,
        recordingUrl: payload.recording_url,
        apiKey: config.apiKey,
      })
    } catch (err) {
      console.error('[processOnlinePBXWebhook] Failed to download recording:', err)
      // We still saved the call, but recording failed
    }
  }

  return { saved: true, callId: call.id }
}

/**
 * Download audio recording from OnlinePBX and save to S3
 */
export async function downloadAndStoreRecording(params: {
  companyId: string
  callId: string
  recordingUrl: string
  apiKey?: string
}): Promise<string> {
  const { companyId, callId, recordingUrl, apiKey } = params

  const headers: Record<string, string> = {}
  if (apiKey) {
    headers['X-OnlinePBX-Key'] = apiKey
  }

  const response = await fetch(recordingUrl, { headers })

  if (!response.ok) {
    throw new Error(`Failed to download recording: ${response.status} ${recordingUrl}`)
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  const contentType = response.headers.get('content-type') || 'audio/wav'

  // Determine file extension
  const ext = contentType.includes('mp3') ? 'mp3' : 'wav'

  const s3Key = buildAudioKey({ companyId, callId, extension: ext })

  await uploadAudio({
    key: s3Key,
    body: buffer,
    mimeType: contentType,
    companyId,
  })

  // Save recording record
  await prisma.callRecording.upsert({
    where: { callId },
    create: {
      callId,
      companyId,
      s3Key,
      s3Bucket: process.env.S3_BUCKET!,
      fileSize: BigInt(buffer.length),
      mimeType: contentType,
      durationSeconds: null,
    },
    update: {
      s3Key,
      fileSize: BigInt(buffer.length),
      mimeType: contentType,
    },
  })

  return s3Key
}

/**
 * Get OnlinePBX config for a company (decrypted)
 */
export async function getOnlinePBXConfig(companyId: string): Promise<OnlinePBXConfig> {
  const integration = await prisma.telephonyIntegration.findUnique({
    where: { companyId_provider: { companyId, provider: 'ONLINEPBX' } },
  })

  if (!integration || !integration.configEnc) {
    throw new Error('OnlinePBX интеграция уланмаган')
  }

  return decryptJson<OnlinePBXConfig>(integration.configEnc)
}

// ─── Helpers ──────────────────────────────────────────────────────

function parseDate(value: string): Date {
  // Handle both ISO strings and Unix timestamps
  if (/^\d+$/.test(value)) {
    return new Date(parseInt(value) * 1000)
  }
  return new Date(value)
}
