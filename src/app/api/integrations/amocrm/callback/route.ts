import { NextRequest, NextResponse } from 'next/server'
import { decryptJson } from '@/lib/encryption'
import { exchangeAmoCRMCode } from '@/lib/integrations/amocrm'
import { getCrmSyncQueue, JOBS } from '@/lib/queues'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')

    if (!code || !state) {
      return new NextResponse(
        `<html>
          <body style="font-family: sans-serif; text-align: center; margin-top: 50px; background-color: #0c0a09; color: #f5f5f4;">
            <h2 style="color: #ef4444;">Интеграция хатоси</h2>
            <p>Авторизация коди ёки хавфсизлик калити (state) топилмади.</p>
          </body>
        </html>`,
        { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 400 }
      )
    }

    // Decrypt state parameter and verify CSRF
    let decryptedState: { companyId: string; userId: string; domain: string; timestamp: number }
    try {
      decryptedState = decryptJson<{ companyId: string; userId: string; domain: string; timestamp: number }>(state)
    } catch {
      return new NextResponse(
        `<html>
          <body style="font-family: sans-serif; text-align: center; margin-top: 50px; background-color: #0c0a09; color: #f5f5f4;">
            <h2 style="color: #ef4444;">Хавфсизлик хатоси</h2>
            <p>Хавфсизлик калити нотўғри ёки муддати ўтган.</p>
          </body>
        </html>`,
        { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 400 }
      )
    }

    const { companyId, timestamp } = decryptedState

    // Expiry check: State expires after 1 hour
    if (Date.now() - timestamp > 3600 * 1000) {
      return new NextResponse(
        `<html>
          <body style="font-family: sans-serif; text-align: center; margin-top: 50px; background-color: #0c0a09; color: #f5f5f4;">
            <h2 style="color: #ef4444;">Вақт чегараси хатоси</h2>
            <p>Хавфсизлик калитини фаоллик муддати тугаган (1 соат).</p>
          </body>
        </html>`,
        { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 400 }
      )
    }

    // amoCRM returns the actual account domain as 'referer' — MUST use it for token exchange
    // The user-entered domain may differ from the actual account domain
    const referer = url.searchParams.get('referer')
    const domain = referer || decryptedState.domain

    // Exchange auth code for tokens and store securely
    await exchangeAmoCRMCode({ code, domain, companyId })

    // Enqueue initial sync
    const syncQueue = getCrmSyncQueue()
    await syncQueue.add(
      JOBS.SYNC_AMOCRM_FULL,
      { companyId, syncType: 'full' },
      { jobId: `sync-amo-${companyId}-${Date.now()}` }
    )

    // Render completion page
    return new NextResponse(
      `<html>
        <body style="font-family: sans-serif; text-align: center; margin-top: 50px; background-color: #0c0a09; color: #f5f5f4; display: flex; flex-direction: column; justify-content: center; align-items: center; height: 80vh;">
          <div style="background-color: #1c1917; border: 1px solid #2e2a24; padding: 30px; border-radius: 16px; max-width: 400px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
            <h2 style="color: #10b981; margin-bottom: 10px;">amoCRM муваффақиятли уланди!</h2>
            <p style="color: #a8a29e; font-size: 14px; margin-bottom: 20px;">Интеграция созланди. Маълумотларни синхронизация қилиш бошланди.</p>
            <p style="color: #78716c; font-size: 12px;">Ушбу ойна автоматик ёпилади...</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'AMOCRM_CONNECTED' }, '*');
            }
            setTimeout(() => {
              window.close();
            }, 2500);
          </script>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    )
  } catch (err) {
    console.error('[amoCRM/Callback] Error:', err)
    return new NextResponse(
      `<html>
        <body style="font-family: sans-serif; text-align: center; margin-top: 50px; background-color: #0c0a09; color: #f5f5f4;">
          <h2 style="color: #ef4444;">Ички тизим хатоси</h2>
          <p>Интеграцияни созлашда кутилмаган хатолик юз берди.</p>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 500 }
    )
  }
}
