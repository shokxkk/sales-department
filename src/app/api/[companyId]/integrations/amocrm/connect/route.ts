import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, authErrorResponse, AuthError } from '@/lib/auth/server'
import { UserRole } from '@prisma/client'
import { encryptJson } from '@/lib/encryption'
import { buildAmoCRMAuthUrl, saveAmoCRMLongLivedToken } from '@/lib/integrations/amocrm'

export async function POST(
  req: NextRequest,
  { params }: { params: { companyId: string } }
) {
  try {
    const { companyId } = params
    const session = await requireAuth(req, {
      companyId,
      allowedRoles: [UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN],
    })

    const body = await req.json().catch(() => ({}))
    const { domain, token, mode = 'token' } = body

    if (!domain) {
      return NextResponse.json(
        { success: false, error: 'amoCRM домен номи киритилиши шарт' },
        { status: 400 }
      )
    }

    // Clean up domain
    let cleanDomain = domain.trim().toLowerCase()
    if (cleanDomain.startsWith('http://')) cleanDomain = cleanDomain.substring(7)
    if (cleanDomain.startsWith('https://')) cleanDomain = cleanDomain.substring(8)
    if (cleanDomain.endsWith('/')) cleanDomain = cleanDomain.slice(0, -1)
    if (!cleanDomain.includes('.')) cleanDomain = `${cleanDomain}.amocrm.ru`

    // MODE 1: Direct Long-Lived API Token (Долгосрочный токен) — Recommended
    if (mode === 'token' || Boolean(token)) {
      if (!token || !token.trim()) {
        return NextResponse.json(
          { success: false, error: 'amoCRM API калити (Долгосрочный токен) киритилиши шарт' },
          { status: 400 }
        )
      }

      try {
        const account = await saveAmoCRMLongLivedToken({
          companyId,
          domain: cleanDomain,
          token: token.trim(),
        })

        return NextResponse.json({
          success: true,
          mode: 'token',
          message: `amoCRM муваффақиятли уланди (${account.name || cleanDomain})`,
          account: {
            id: account.id,
            name: account.name,
            subdomain: account.subdomain,
          },
        })
      } catch (tokenErr: any) {
        return NextResponse.json(
          { success: false, error: tokenErr.message || 'amoCRM токени ёки домени нотўғри' },
          { status: 400 }
        )
      }
    }

    // MODE 2: OAuth 2.0 Code Flow
    const state = encryptJson({
      companyId,
      userId: session.userId,
      domain: cleanDomain,
      timestamp: Date.now(),
    })

    const authUrl = buildAmoCRMAuthUrl(cleanDomain, state)

    return NextResponse.json({ success: true, mode: 'oauth', url: authUrl })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    console.error('[API/amoCRM/Connect] Error:', err)
    return NextResponse.json(
      { success: false, error: 'Сервер хатолиги' },
      { status: 500 }
    )
  }
}
