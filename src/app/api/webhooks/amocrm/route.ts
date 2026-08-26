import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const text = await req.text()
    let payload: Record<string, unknown> = {}
    try {
      // amoCRM webhook uses application/x-www-form-urlencoded
      const params = new URLSearchParams(text)
      for (const [key, value] of params.entries()) {
        payload[key] = value
      }
    } catch {
      payload = { raw: text }
    }

    // Save webhook log if we can identify companyId
    // In production, we'd map this using the account_id from payload
    const accountId = payload['account[id]'] || (payload as any).account_id
    if (accountId) {
      const integration = await prisma.cRMIntegration.findFirst({
        where: {
          configEnc: { contains: String(accountId) },
          provider: 'AMOCRM',
        },
      })

      if (integration) {
        await prisma.webhookLog.create({
          data: {
            companyId: integration.companyId,
            provider: 'AMOCRM',
            eventType: 'lead_update',
            payload: payload as any,
            status: 'received',
          },
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Webhook/amoCRM] Error:', err)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
