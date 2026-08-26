import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, authErrorResponse, AuthError } from '@/lib/auth/server'
import { UserRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'

const ALLOWED_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.COMPANY_ADMIN,
  UserRole.SALES_DIRECTOR,
  UserRole.QUALITY_CONTROL,
]

export async function PUT(
  req: NextRequest,
  { params }: { params: { companyId: string; id: string } }
) {
  try {
    const { companyId, id: auditId } = params
    const session = await requireAuth(req, { companyId, allowedRoles: ALLOWED_ROLES })

    const body = await req.json().catch(() => ({}))
    const { criterionId, newScore, comment } = body

    if (typeof newScore !== 'number' || newScore < 0) {
      return NextResponse.json(
        { success: false, error: 'Нотўғри янги баҳо қиймати' },
        { status: 400 }
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch Audit
      const audit = await tx.audit.findFirst({
        where: { id: auditId, companyId },
        include: { criterionResults: true },
      })

      if (!audit) {
        throw new Error('AUDIT_NOT_FOUND')
      }

      let oldScore = audit.finalScore
      let calculatedScore = newScore

      if (criterionId) {
        // Find specific criterion result
        const cr = audit.criterionResults.find((r) => r.criterionId === criterionId)
        if (!cr) {
          throw new Error('CRITERION_RESULT_NOT_FOUND')
        }

        oldScore = cr.finalScore

        // Update criterion result finalScore
        await tx.auditCriterionResult.update({
          where: { id: cr.id },
          data: { finalScore: newScore, isOverridden: true },
        })

        // Recalculate total score
        const allResults = await tx.auditCriterionResult.findMany({
          where: { auditId },
        })

        calculatedScore = allResults.reduce((sum, r) => sum + r.finalScore, 0)

        // Update overall finalScore on Audit
        await tx.audit.update({
          where: { id: auditId },
          data: { finalScore: calculatedScore },
        })
      } else {
        // Direct override of overall finalScore on Audit
        await tx.audit.update({
          where: { id: auditId },
          data: { finalScore: newScore },
        })
      }

      // 2. Log in AuditScoreHistory (immutable)
      await tx.auditScoreHistory.create({
        data: {
          auditId,
          criterionId: criterionId || null,
          changedBy: session.userId,
          oldScore,
          newScore,
          comment: comment || null,
        },
      })

      // Update score in Call table as well
      await tx.call.update({
        where: { id: audit.callId },
        data: { manualScore: calculatedScore },
      })

      return calculatedScore
    })

    return NextResponse.json({
      success: true,
      message: 'Баҳо муваффақиятли янгиланди',
      finalScore: result,
    })
  } catch (err: any) {
    if (err.message === 'AUDIT_NOT_FOUND') {
      return NextResponse.json({ success: false, error: 'Аудит топилмади' }, { status: 404 })
    }
    if (err.message === 'CRITERION_RESULT_NOT_FOUND') {
      return NextResponse.json({ success: false, error: 'Чек-лист мезони топилмади' }, { status: 404 })
    }
    if (err instanceof AuthError) return authErrorResponse(err)
    console.error('[Audits/Override] Error:', err)
    return NextResponse.json({ success: false, error: 'Сервер хатоси' }, { status: 500 })
  }
}
