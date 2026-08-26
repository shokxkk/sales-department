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

    // Protection against demo records in production mode
    const companyInfo = await prisma.company.findUnique({
      where: { id: companyId },
      select: { slug: true },
    })

    if (
      process.env.APP_MODE === 'production' &&
      companyInfo &&
      (companyInfo.slug === 'marketing-markazi-demo' || companyInfo.slug.endsWith('-demo'))
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Ishlab chiqarish (production) rejimida demo maʼlumotlardan foydalanish taqiqlanadi.',
        },
        { status: 400 }
      )
    }

    const [managers, pipelines, refusalReasons, dealsWithSources] = await Promise.all([
      // Managers
      prisma.manager.findMany({
        where: { companyId, isActive: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      // Pipelines & Stages
      prisma.pipeline.findMany({
        where: { companyId, isDeleted: false },
        select: {
          id: true,
          name: true,
          stages: {
            select: { id: true, name: true },
            orderBy: { sort: 'asc' },
          },
        },
      }),
      // Refusal Reasons
      prisma.refusalReason.findMany({
        where: { companyId, isActive: true },
        select: { id: true, name: true },
        orderBy: { sort: 'asc' },
      }),
      // Unique Deal Sources
      prisma.deal.findMany({
        where: { companyId, source: { not: null } },
        select: { source: true },
        distinct: ['source'],
      }),
    ])

    const sources = dealsWithSources.map((d) => d.source as string).filter(Boolean)

    return NextResponse.json({
      success: true,
      data: {
        managers,
        pipelines,
        refusalReasons,
        sources,
      },
    })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    console.error('[API/Filters] Error:', err)
    return NextResponse.json({ success: false, error: 'Сервер хатоси' }, { status: 500 })
  }
}
