import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, authErrorResponse, AuthError } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: { companyId: string; id: string } }
) {
  try {
    const { companyId, id } = params
    await requireAuth(req, { companyId })

    const audit = await prisma.audit.findFirst({
      where: {
        companyId,
        OR: [
          { id },
          { callId: id },
        ],
      },
      include: {
        criterionResults: {
          include: {
            criterion: true,
          },
          orderBy: { criterionCode: 'asc' },
        },
        // Phase 5: Include score history for History tab
        scoreHistory: {
          orderBy: { changedAt: 'desc' },
          include: {
            changedByUser: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        call: {
          include: {
            manager: { select: { name: true } },
            customer: { select: { name: true } },
            recording: { select: { s3Key: true } },
            transcript: {
              include: {
                segments: {
                  orderBy: { startSeconds: 'asc' },
                },
              },
            },
          },
        },
      },
    })

    if (!audit) {
      return NextResponse.json({ success: false, error: 'Аудит топилмади' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: audit })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    console.error('[API/AuditDetail] Error:', err)
    return NextResponse.json({ success: false, error: 'Сервер хатоси' }, { status: 500 })
  }
}
