import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTelephonySyncQueue, JOBS } from '@/lib/queues'

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const integrationId = url.searchParams.get('integrationId')

    if (!integrationId) {
      return NextResponse.json(
        { success: false, error: 'integrationId parameter is required' },
        { status: 400 }
      )
    }

    const integration = await prisma.telephonyIntegration.findUnique({
      where: { id: integrationId },
    })

    if (!integration) {
      return NextResponse.json(
        { success: false, error: 'Telephony integration not found' },
        { status: 404 }
      )
    }

    const text = await req.text()
    let payload: Record<string, any> = {}
    try {
      // OnlinePBX webhooks can be urlencoded or JSON
      if (req.headers.get('content-type')?.includes('application/json')) {
        payload = JSON.parse(text)
      } else {
        const params = new URLSearchParams(text)
        for (const [key, value] of params.entries()) {
          payload[key] = value
        }
      }
    } catch {
      payload = { raw: text }
    }

    // Optional: signature check if webhookSecret is configured
    if (integration.webhookSecret) {
      const signature = req.headers.get('x-signature') || payload.signature
      if (signature && signature !== integration.webhookSecret) {
        return NextResponse.json(
          { success: false, error: 'Invalid signature' },
          { status: 401 }
        )
      }
    }

    // Save webhook log
    const log = await prisma.webhookLog.create({
      data: {
        companyId: integration.companyId,
        provider: 'ONLINEPBX',
        eventType: payload.status || 'call_event',
        payload,
        status: 'received',
      },
    })

    // Enqueue job for background processing
    const queue = getTelephonySyncQueue()
    await queue.add(
      JOBS.PROCESS_WEBHOOK_CALL,
      {
        companyId: integration.companyId,
        provider: 'ONLINEPBX',
        payload,
        webhookLogId: log.id,
      },
      { jobId: `opbx-${payload.call_id || Date.now()}` }
    )

    return NextResponse.json({ success: true, callId: payload.call_id })
  } catch (err) {
    console.error('[Webhook/OnlinePBX] Error:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
