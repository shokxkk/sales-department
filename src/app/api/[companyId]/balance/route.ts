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

    const balance = await prisma.usageBalance.findUnique({
      where: { companyId },
    })

    const transactions = await prisma.usageTransaction.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    const data = {
      availableMinutes: balance ? balance.totalMinutes - balance.usedMinutes - balance.reservedMinutes : 0,
      usedMinutes: balance?.usedMinutes || 0,
      reservedMinutes: balance?.reservedMinutes || 0,
      transactions: transactions || [],
    }

    return NextResponse.json({ success: true, data })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    console.error('[API/Balance] Error:', err)
    return NextResponse.json({ success: false, error: 'Сервер хатоси' }, { status: 500 })
  }
}
