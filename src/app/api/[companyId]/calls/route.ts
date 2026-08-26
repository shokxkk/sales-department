// GET /api/[companyId]/calls — List calls with filtering and pagination
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, authErrorResponse, AuthError } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { AnalysisStatus, CallStatus, Prisma } from '@prisma/client'

export async function GET(
  req: NextRequest,
  { params }: { params: { companyId: string } }
) {
  try {
    const { companyId } = params
    await requireAuth(req, { companyId })

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    // Default limit 50, max 500
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 500)
    const skip = (page - 1) * limit

    const managerId = searchParams.get('managerId') || undefined
    const direction = searchParams.get('direction') || undefined
    const analysisStatus = searchParams.get('status') || undefined
    const telephonyProvider = searchParams.get('telephonyProvider') || undefined
    const dateFrom = searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined
    const dateTo = searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined
    const search = searchParams.get('search') || undefined
    
    // Call Statuses & duration filters matching amoCRM exactly
    const callStatusesParam = searchParams.get('callStatuses')
    const callStatuses = callStatusesParam ? callStatusesParam.split(',').filter(Boolean) as CallStatus[] : undefined
    const onlyAnswered = searchParams.get('onlyAnswered') === 'true' || searchParams.get('talked') === 'true'
    
    const minDuration = searchParams.get('minDuration') ? parseInt(searchParams.get('minDuration')!, 10) : undefined
    const maxDuration = searchParams.get('maxDuration') ? parseInt(searchParams.get('maxDuration')!, 10) : undefined
    const hasRecording = searchParams.get('hasRecording') === 'true'
    const entityType = searchParams.get('entityType') // 'leads' | 'contacts' | 'all'

    const where: Prisma.CallWhereInput = {
      companyId,
      ...(managerId && { managerId }),
      ...(direction && { direction: direction as 'INBOUND' | 'OUTBOUND' }),
      ...(analysisStatus && { analysisStatus: analysisStatus as AnalysisStatus }),
      ...(telephonyProvider && { telephonyProvider: telephonyProvider as any }),
      
      // Exact Status or Multiple Statuses
      ...(callStatuses && callStatuses.length > 0
        ? { status: { in: callStatuses } }
        : onlyAnswered
        ? {
            status: 'ANSWERED' as CallStatus,
            talkDurationSeconds: { gt: 0 },
          }
        : {}),

      // Duration range
      ...((minDuration !== undefined || maxDuration !== undefined)
        ? {
            durationSeconds: {
              ...(minDuration !== undefined && { gte: minDuration }),
              ...(maxDuration !== undefined && { lte: maxDuration }),
            },
          }
        : {}),

      // Recording filter
      ...(hasRecording && {
        OR: [
          { externalRecordingUrl: { not: null } },
          { recording: { isNot: null } },
        ],
      }),

      // Entity filter
      ...(entityType === 'leads' && { dealId: { not: null } }),
      ...(entityType === 'contacts' && { customerId: { not: null } }),

      ...(dateFrom || dateTo
        ? {
            startedAt: {
              ...(dateFrom && { gte: dateFrom }),
              ...(dateTo && { lte: dateTo }),
            },
          }
        : {}),
      ...(search && {
        OR: [
          { customerPhone: { contains: search } },
          { customer: { name: { contains: search, mode: 'insensitive' } } },
          { manager: { name: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    }

    const [calls, total] = await Promise.all([
      prisma.call.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startedAt: 'desc' },
        include: {
          manager: { select: { id: true, name: true } },
          customer: { select: { id: true, name: true, phone: true } },
          deal: { select: { id: true, name: true, crmId: true } },
          audit: { select: { id: true, finalScore: true, callType: true } },
          recording: { select: { id: true, durationSeconds: true } },
        },
      }),
      prisma.call.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: calls,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    console.error('[Calls] Error:', err)
    return NextResponse.json({ success: false, error: 'Сервер хатоси' }, { status: 500 })
  }
}
