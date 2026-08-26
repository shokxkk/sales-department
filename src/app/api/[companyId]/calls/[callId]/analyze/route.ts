import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, authErrorResponse, AuthError } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { analyzeCallDirectly } from '@/lib/ai/direct-analyzer'
import { UserRole } from '@prisma/client'

const ALLOWED_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.COMPANY_ADMIN,
  UserRole.OWNER,
  UserRole.SALES_DIRECTOR,
  UserRole.QUALITY_CONTROL,
]

export async function POST(
  req: NextRequest,
  { params }: { params: { companyId: string; callId: string } }
) {
  try {
    const { companyId, callId } = params
    await requireAuth(req, { companyId, allowedRoles: ALLOWED_ROLES })

    const call = await prisma.call.findUnique({
      where: { id: callId, companyId },
    })

    if (!call) {
      return NextResponse.json({ success: false, error: 'Қўнғироқ топилмади' }, { status: 404 })
    }

    // Run direct analysis
    const result = await analyzeCallDirectly({ callId, companyId })

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'AI Аудит муваффақиятли якунланди',
      auditId: result.auditId,
      score: result.score,
    })
  } catch (err: any) {
    if (err instanceof AuthError) return authErrorResponse(err)
    console.error('[Calls/Analyze] Error:', err)
    return NextResponse.json({ success: false, error: err.message || 'Сервер хатоси' }, { status: 500 })
  }
}
