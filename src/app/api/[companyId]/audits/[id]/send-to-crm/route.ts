import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, authErrorResponse, AuthError } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { sendAuditNoteToAmoCRM } from '@/lib/integrations/amocrm'

export async function POST(
  req: NextRequest,
  { params }: { params: { companyId: string; id: string } }
) {
  try {
    const { companyId, id: auditId } = params
    const session = await requireAuth(req, { companyId })

    // 1. Fetch Audit and verify permissions/status
    const audit = await prisma.audit.findFirst({
      where: { id: auditId, companyId },
      include: {
        call: {
          include: {
            manager: true,
            deal: true,
          },
        },
      },
    })

    if (!audit) {
      return NextResponse.json({ success: false, error: 'Аудит топилмади' }, { status: 404 })
    }

    const { call } = audit
    if (!call.deal?.crmId) {
      return NextResponse.json(
        { success: false, error: 'Ушбу қўнғироқ CRM битимига боғланмаган' },
        { status: 422 }
      )
    }

    // 2. Check if amoCRM is connected
    const integration = await prisma.cRMIntegration.findUnique({
      where: { companyId_provider: { companyId, provider: 'AMOCRM' } },
    })

    if (!integration || integration.status !== 'CONNECTED') {
      return NextResponse.json(
        { success: false, error: 'amoCRM интеграцияси уланмаган' },
        { status: 422 }
      )
    }

    // 3. Idempotency Check: Verify if already sent
    const alreadySent = await prisma.activityLog.findFirst({
      where: {
        companyId,
        action: 'SEND_AUDIT_TO_CRM',
        entityType: 'Audit',
        entityId: auditId,
      },
    })

    if (alreadySent) {
      return NextResponse.json({
        success: true,
        message: 'Аудит аллақачон CRM га юборилган',
        crmNoteId: (alreadySent.meta as any)?.crmNoteId,
      })
    }

    // 4. Construct CRM Note text
    const formatDuration = (sec: number) => {
      const m = Math.floor(sec / 60)
      const s = sec % 60
      return `${m} дақ ${s} сек`
    }

    const parseJsonArray = (val: any): string[] => {
      if (Array.isArray(val)) return val
      if (typeof val === 'string') {
        try {
          const p = JSON.parse(val)
          return Array.isArray(p) ? p : typeof p === 'string' ? [p] : []
        } catch {
          return val ? [val] : []
        }
      }
      return []
    }

    const strengths = parseJsonArray(audit.strengthsJson)
    const mistakes = parseJsonArray(audit.mistakesJson)
    const recommendations = parseJsonArray(audit.recommendationsJson)

    const noteText = `🤖 AI АУДИТ ҚЎНҒИРОҒИ

📅 Сана: ${new Date(audit.createdAt).toLocaleDateString('ru-RU')}
👤 Менежер: ${call.manager?.name || 'Номаълум'}
📞 Зўнгир тури: ${audit.callType || 'Номаълум'}
⏱ Давомийлиги: ${formatDuration(call.talkDurationSeconds)}

📊 Умумий баҳо: ${audit.finalScore}/100

✅ Кучли томонлар:
${strengths.slice(0, 3).map((s) => `— ${s}`).join('\n')}

❌ Хатолар:
${mistakes.slice(0, 3).map((m) => `— ${m}`).join('\n')}

💡 Сотув эҳтимоли: ${audit.saleProbability}%

🎯 Тавсия:
${recommendations?.[0] || 'Тавсия мавжуд эмас'}`

    // 5. Send to amoCRM
    await sendAuditNoteToAmoCRM({
      companyId,
      dealCrmId: call.deal.crmId,
      noteText,
    })

    // 6. Log success in ActivityLog (idempotency token)
    await prisma.activityLog.create({
      data: {
        companyId,
        userId: session.userId,
        action: 'SEND_AUDIT_TO_CRM',
        entityType: 'Audit',
        entityId: auditId,
        meta: { sentAt: new Date().toISOString(), status: 'success' },
      },
    })

    // Also log in SyncLog
    await prisma.syncLog.create({
      data: {
        companyId,
        provider: 'amocrm',
        syncType: 'crm_note',
        entityType: 'calls',
        itemsSynced: 1,
        status: 'success',
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Аудит хулосаси amoCRM га муваффақиятли юборилди',
    })
  } catch (err: any) {
    console.error('[API/Audits/SendToCRM] Error:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Тизим хатолиги юз берди' },
      { status: 500 }
    )
  }
}
