// ─────────────────────────────────────────────────────────────────
//  Background Sync Trigger API
//  POST /api/[companyId]/integrations/sync
//  Triggers CRM sync in background — returns immediately (non-blocking)
//  This prevents server overload when exporting/syncing large CRM data
// ─────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, authErrorResponse, AuthError } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { syncAmoCRMOptimized } from '@/lib/integrations/amocrm'

// Track in-progress syncs to prevent duplicate triggers
const activeSyncs = new Map<string, { startedAt: Date; status: string }>()

export async function POST(
  req: NextRequest,
  { params }: { params: { companyId: string } }
) {
  try {
    const { companyId } = params
    await requireAuth(req, { companyId })

    const body = await req.json().catch(() => ({}))
    const provider = body.provider || 'amocrm'

    // Check if sync already in progress
    if (activeSyncs.has(companyId)) {
      const existing = activeSyncs.get(companyId)!
      const elapsed = Math.round((Date.now() - existing.startedAt.getTime()) / 1000)
      return NextResponse.json({
        success: true,
        message: `Sinxronizatsiya allaqachon ketmoqda (${elapsed}s)`,
        status: 'already_running',
        startedAt: existing.startedAt,
      })
    }

    // Check CRM integration exists
    const integration = await prisma.cRMIntegration.findFirst({
      where: { companyId, status: 'CONNECTED' },
    })

    if (!integration) {
      return NextResponse.json(
        { success: false, error: 'CRM integratsiyasi topilmadi yoki ulanmagan' },
        { status: 404 }
      )
    }

    // Mark as running
    activeSyncs.set(companyId, { startedAt: new Date(), status: 'running' })

    // Fire and forget — don't await
    runSyncBackground(companyId, integration.provider).finally(() => {
      activeSyncs.delete(companyId)
    })

    return NextResponse.json({
      success: true,
      message: 'Sinxronizatsiya fon rejimida boshlandi',
      status: 'started',
      startedAt: new Date(),
    })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    console.error('[Sync] Error:', err)
    return NextResponse.json({ success: false, error: 'Server xatosi' }, { status: 500 })
  }
}

// GET — check current sync status
export async function GET(
  req: NextRequest,
  { params }: { params: { companyId: string } }
) {
  try {
    const { companyId } = params
    await requireAuth(req, { companyId })

    const running = activeSyncs.get(companyId)

    // Get last sync info from DB
    const lastSync = await prisma.cRMIntegration.findFirst({
      where: { companyId },
      select: { lastSyncAt: true, lastError: true, status: true, provider: true },
    })

    const callCount = await prisma.call.count({ where: { companyId } })
    const managerCount = await prisma.manager.count({ where: { companyId } })

    return NextResponse.json({
      success: true,
      data: {
        isRunning: !!running,
        startedAt: running?.startedAt || null,
        elapsedSeconds: running
          ? Math.round((Date.now() - running.startedAt.getTime()) / 1000)
          : null,
        lastSyncAt: lastSync?.lastSyncAt || null,
        lastError: lastSync?.lastError || null,
        crmStatus: lastSync?.status || 'DISCONNECTED',
        provider: lastSync?.provider || null,
        stats: {
          totalCalls: callCount,
          totalManagers: managerCount,
        },
      },
    })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    return NextResponse.json({ success: false, error: 'Server xatosi' }, { status: 500 })
  }
}

// ─── Background worker ─────────────────────────────────────────────

async function runSyncBackground(companyId: string, provider: string) {
  const startTime = Date.now()
  console.log(`[Sync] Starting background sync for company=${companyId} provider=${provider}`)

  try {
    await syncAmoCRMOptimized(companyId)
    const elapsed = Math.round((Date.now() - startTime) / 1000)
    console.log(`[Sync] ✓ Background sync complete for ${companyId} in ${elapsed}s`)
  } catch (err: any) {
    const elapsed = Math.round((Date.now() - startTime) / 1000)
    console.error(`[Sync] ✗ Background sync failed for ${companyId} after ${elapsed}s:`, err.message)

    // Update last error in DB
    await prisma.cRMIntegration.updateMany({
      where: { companyId },
      data: { lastError: err.message?.slice(0, 500) || 'Unknown error', updatedAt: new Date() },
    }).catch(() => {})
  }
}
