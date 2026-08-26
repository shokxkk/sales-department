import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, authErrorResponse, AuthError } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: { companyId: string } }
) {
  try {
    const { companyId } = params
    await requireAuth(req, { companyId })

    const { searchParams } = new URL(req.url)
    const managerId = searchParams.get('managerId') || undefined
    const severity = searchParams.get('severity') || undefined
    const type = searchParams.get('type') || undefined
    const search = searchParams.get('search')?.toLowerCase() || ''

    // 1. Fetch real lost deals (problems in sales)
    const lostDeals = await prisma.deal.findMany({
      where: {
        companyId,
        status: 'lost',
        ...(managerId && { managerId }),
      },
      take: 50,
      orderBy: { closedAt: 'desc' },
      include: {
        manager: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true, phone: true } },
        refusalReason: { select: { name: true } },
      },
    })

    // 2. Fetch real missed calls
    const missedCalls = await prisma.call.findMany({
      where: {
        companyId,
        status: 'MISSED',
        ...(managerId && { managerId }),
      },
      take: 50,
      orderBy: { startedAt: 'desc' },
      include: {
        manager: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true } },
      },
    })

    // 3. Fetch real low score / problem audits
    const problemAudits = await prisma.audit.findMany({
      where: {
        companyId,
        OR: [
          { aiScore: { lt: 70 } },
          { rudenessDetected: true },
          { falsePromisesDetected: true },
        ],
        ...(managerId && { call: { managerId } }),
      },
      take: 30,
      orderBy: { createdAt: 'desc' },
      include: {
        call: {
          include: {
            manager: { select: { id: true, name: true } },
            customer: { select: { id: true, name: true } },
          },
        },
      },
    })

    // 4. Fetch overdue tasks
    const overdueTasks = await prisma.dealTask.findMany({
      where: {
        companyId,
        OR: [
          { isOverdue: true },
          { completedAt: null, dueAt: { lt: new Date() } },
        ],
      },
      take: 30,
      orderBy: { dueAt: 'asc' },
      include: {
        deal: {
          select: {
            id: true,
            name: true,
            manager: { select: { id: true, name: true } },
            customer: { select: { id: true, name: true } },
          },
        },
      },
    })

    // Format all items into a unified Problem structure
    const problems: Array<{
      id: string
      manager: string
      managerId: string
      callId?: string
      dealId?: string
      clientName: string
      date: string
      duration?: string
      score?: number
      type: 'lost_deal' | 'missed_call' | 'overdue_task' | 'audit_mistake'
      severity: 'critical' | 'warning' | 'minor'
      aiComment: string
      errors: string[]
    }> = []

    // Map lost deals
    for (const d of lostDeals) {
      const budgetFormatted = Number(d.budget || 0) > 0 ? `${Number(d.budget).toLocaleString()} UZS` : 'Сумма указана в amoCRM'
      const reason = d.refusalReason?.name || 'Причина отказа не указана в amoCRM'

      problems.push({
        id: `deal-${d.id}`,
        manager: d.manager?.name || 'Не назначен',
        managerId: d.manager?.id || '',
        dealId: d.id,
        clientName: d.customer?.name || d.name || 'Клиент',
        date: d.closedAt ? new Date(d.closedAt).toLocaleDateString('ru-RU') : new Date(d.updatedAt).toLocaleDateString('ru-RU'),
        score: 35,
        type: 'lost_deal',
        severity: Number(d.budget || 0) > 5000000 ? 'critical' : 'warning',
        aiComment: `Сделка закрыта со статусом «Не реализовано». ${reason}. Потерянный бюджет: ${budgetFormatted}. Рекомендуется повторный контакт через 14 дней с альтернативным предложением.`,
        errors: [
          `Отказ: ${reason}`,
          Number(d.budget || 0) > 0 ? `Потерянный бюджет: ${budgetFormatted}` : 'Сделка потеряна без указания точной причины',
          'Требуется реактивация лида',
        ],
      })
    }

    // Map missed calls
    for (const c of missedCalls) {
      problems.push({
        id: `call-${c.id}`,
        manager: c.manager?.name || 'Дежурный менеджер',
        managerId: c.manager?.id || '',
        callId: c.id,
        clientName: c.customer?.name || c.customerPhone || 'Входящий звонок',
        date: new Date(c.startedAt).toLocaleDateString('ru-RU'),
        duration: '0:00 (Пропущен)',
        score: 20,
        type: 'missed_call',
        severity: 'critical',
        aiComment: `Пропущен входящий звонок от ${c.customerPhone || 'клиента'}. Клиент не получил ответа. Вероятность потери лида — более 80% при отсутствии перезвона в течение 15 минут.`,
        errors: [
          'Пропущен входящий звонок',
          'Не совершен оперативный перезвон',
          'Риск ухода клиента к конкурентам',
        ],
      })
    }

    // Map overdue tasks
    for (const t of overdueTasks) {
      problems.push({
        id: `task-${t.id}`,
        manager: t.deal?.manager?.name || 'Менеджер',
        managerId: t.deal?.manager?.id || '',
        dealId: t.deal?.id,
        clientName: t.deal?.customer?.name || t.deal?.name || 'Сделка',
        date: t.dueAt ? new Date(t.dueAt).toLocaleDateString('ru-RU') : new Date().toLocaleDateString('ru-RU'),
        score: 45,
        type: 'overdue_task',
        severity: 'warning',
        aiComment: `Просрочена задача «${t.text || 'Связаться с клиентом'}». Задержка в выполнении задач снижает конверсию сделки на 35%.`,
        errors: [
          `Просроченная задача: ${t.text || 'Связаться'}`,
          'Нарушение регламента ведения сделки',
        ],
      })
    }

    // Map AI Audited problem calls
    for (const a of problemAudits) {
      const mistakes = Array.isArray(a.mistakesJson) ? (a.mistakesJson as string[]) : []
      problems.push({
        id: `audit-${a.id}`,
        manager: a.call.manager?.name || 'Менеджер',
        managerId: a.call.manager?.id || '',
        callId: a.callId,
        clientName: a.call.customer?.name || a.call.customerPhone || 'Клиент',
        date: new Date(a.createdAt).toLocaleDateString('ru-RU'),
        duration: `${Math.floor(a.call.talkDurationSeconds / 60)}:${String(a.call.talkDurationSeconds % 60).padStart(2, '0')}`,
        score: a.aiScore,
        type: 'audit_mistake',
        severity: a.aiScore < 50 ? 'critical' : 'warning',
        aiComment: a.summary || (Array.isArray(a.recommendationsJson) ? (a.recommendationsJson[0] as string) : 'Выявлены ошибки в ведении диалога'),
        errors: mistakes.length > 0 ? mistakes : ['Низкое соответствие скрипту', 'Не отработаны возражения клиента'],
      })
    }

    // Filter problems
    const filtered = problems.filter((p) => {
      if (severity && p.severity !== severity) return false
      if (type && p.type !== type) return false
      if (managerId && p.managerId !== managerId) return false
      if (search && !p.manager.toLowerCase().includes(search) && !p.clientName.toLowerCase().includes(search) && !p.aiComment.toLowerCase().includes(search)) return false
      return true
    })

    // Aggregate manager counts
    const managers = await prisma.manager.findMany({
      where: { companyId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })

    const managerStats = managers.map((m) => {
      const mgrProblems = problems.filter((p) => p.managerId === m.id || p.manager.includes(m.name))
      return {
        id: m.id,
        name: m.name,
        count: mgrProblems.length,
        critical: mgrProblems.filter((p) => p.severity === 'critical').length,
      }
    }).sort((a, b) => b.count - a.count)

    const criticalCount = problems.filter((p) => p.severity === 'critical').length
    const warningCount = problems.filter((p) => p.severity === 'warning').length
    const minorCount = problems.filter((p) => p.severity === 'minor').length

    return NextResponse.json({
      success: true,
      data: filtered,
      managerStats,
      summary: {
        total: problems.length,
        critical: criticalCount,
        warning: warningCount,
        minor: minorCount,
      },
    })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    console.error('[API/Problems] Error:', err)
    return NextResponse.json({ success: false, error: 'Сервер хатоси' }, { status: 500 })
  }
}
