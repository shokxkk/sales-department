// ─────────────────────────────────────────────────────────────────
//  Next.js Middleware — route protection & multi-tenant guard
//  Runs on Edge runtime (no DB access — only JWT verification)
// ─────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken, verifyRefreshToken } from '@/lib/auth/jwt'

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  '/login',
  '/forgot-password',
  '/reset-password',
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/health',
  '/api/webhooks',  // Webhook endpoints handle their own auth
  '/api/integrations/amocrm/callback', // OAuth callback from amoCRM
]

// Routes only for SUPER_ADMIN
const SUPER_ADMIN_ROUTES = ['/admin', '/api/admin']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow public routes
  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.next()
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Get token from cookie (preferred) or Authorization header
  const cookieToken = req.cookies.get('access_token')?.value
  const refreshToken = req.cookies.get('refresh_token')?.value
  const authHeader = req.headers.get('authorization')
  const token = cookieToken || authHeader?.replace('Bearer ', '')

  let sub = ''
  let role = ''
  let companyId = ''
  let email = ''

  if (token) {
    try {
      const payload = await verifyAccessToken(token)
      sub = payload.sub
      role = payload.role
      companyId = payload.companyId || ''
      email = payload.email
    } catch {
      // access_token expired or invalid
    }
  }

  // If access_token failed but refresh_token exists, verify refresh_token
  if (!sub && refreshToken) {
    try {
      const refreshPayload = await verifyRefreshToken(refreshToken)
      sub = refreshPayload.sub
      companyId = refreshPayload.companyId || ''
    } catch {
      // refresh_token also invalid
    }
  }

  if (!sub) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Токен муддати тугаган' }, { status: 401 })
    }
    return redirectToLogin(req)
  }

  // SUPER_ADMIN routes check
  if (SUPER_ADMIN_ROUTES.some((r) => pathname.startsWith(r))) {
    if (role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Фақат бош администратор учун' },
        { status: 403 }
      )
    }
  }

  // Forward user info to API routes via headers
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-user-id', sub)
  requestHeaders.set('x-user-role', role)
  requestHeaders.set('x-user-company', companyId)
  requestHeaders.set('x-user-email', email)

  return NextResponse.next({ request: { headers: requestHeaders } })
}

function redirectToLogin(req: NextRequest) {
  const loginUrl = new URL('/login', req.url)
  loginUrl.searchParams.set('from', req.nextUrl.pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
