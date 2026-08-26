import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, authErrorResponse, AuthError } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { decryptJson } from '@/lib/encryption'
import { AmoCRMConfig } from '@/lib/integrations/amocrm'

export async function GET(
  req: NextRequest,
  { params }: { params: { companyId: string } }
) {
  try {
    const { companyId } = params
    await requireAuth(req, { companyId })

    const integration = await prisma.cRMIntegration.findUnique({
      where: { companyId_provider: { companyId, provider: 'AMOCRM' } },
    })

    if (!integration) {
      return NextResponse.json({
        success: true,
        data: {
          status: 'DISCONNECTED',
          lastSyncAt: null,
          lastError: null,
          domain: null,
          accountName: null,
          authType: null,
        },
      })
    }

    let config: AmoCRMConfig | null = null
    try {
      if (integration.configEnc) {
        config = decryptJson<AmoCRMConfig>(integration.configEnc)
      }
    } catch {
      // Ignore decryption failure
    }

    return NextResponse.json({
      success: true,
      data: {
        status: integration.status,
        lastSyncAt: integration.lastSyncAt,
        lastError: integration.lastError,
        domain: config?.domain || null,
        accountName: config?.accountName || null,
        authType: config?.authType || (integration.refreshTokenEnc ? 'oauth' : 'token'),
      },
    })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    console.error('[API/amoCRM/Status] Error:', err)
    return NextResponse.json(
      { success: false, error: 'Сервер хатолиги' },
      { status: 500 }
    )
  }
}
