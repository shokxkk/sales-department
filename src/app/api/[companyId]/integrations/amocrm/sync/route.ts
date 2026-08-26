import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, authErrorResponse, AuthError } from '@/lib/auth/server'
import { UserRole } from '@prisma/client'
import { syncAmoCRMOptimized } from '@/lib/integrations/amocrm'

export async function POST(
  req: NextRequest,
  { params }: { params: { companyId: string } }
) {
  try {
    const { companyId } = params
    await requireAuth(req, {
      companyId,
      allowedRoles: [UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.SALES_DIRECTOR],
    })

    const body = await req.json().catch(() => ({}))
    const { type = 'fast', sinceDays, dateFrom, dateTo, managerId, managerCrmId } = body

    // Perform optimized direct sync with live metrics & optional manager/date filters
    const results = await syncAmoCRMOptimized(companyId, {
      type,
      sinceDays: sinceDays ? Number(sinceDays) : undefined,
      dateFrom,
      dateTo,
      managerId,
      managerCrmId,
    })

    const totalCount =
      results.leads + results.contacts + results.managers + results.pipelines + results.calls

    return NextResponse.json({
      success: true,
      message: `Синхронизация муваффақиятли якунланди (${(results.durationMs / 1000).toFixed(1)} сония)`,
      counts: results,
      totalSynced: totalCount,
    })
  } catch (err: any) {
    if (err instanceof AuthError) return authErrorResponse(err)
    console.error('[API/amoCRM/Sync] Error:', err)
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Синхронизацияда хатолик юз берди',
      },
      { status: 500 }
    )
  }
}
