import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, authErrorResponse, AuthError } from '@/lib/auth/server'
import { UserRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: { companyId: string } }
) {
  try {
    const { companyId } = params
    await requireAuth(req, {
      companyId,
      allowedRoles: [UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN],
    })

    await prisma.cRMIntegration.delete({
      where: { companyId_provider: { companyId, provider: 'AMOCRM' } },
    }).catch(() => null)

    return NextResponse.json({ success: true, message: 'amoCRM муваффақиятли ўчирилди' })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    console.error('[API/amoCRM/Disconnect] Error:', err)
    return NextResponse.json(
      { success: false, error: 'Сервер хатолиги' },
      { status: 500 }
    )
  }
}
