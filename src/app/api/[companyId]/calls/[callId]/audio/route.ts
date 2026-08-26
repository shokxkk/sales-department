import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, authErrorResponse, AuthError } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { getAudioSignedUrl } from '@/lib/s3'

export async function GET(
  req: NextRequest,
  { params }: { params: { companyId: string; callId: string } }
) {
  try {
    const { companyId, callId } = params
    await requireAuth(req, { companyId })

    const recording = await prisma.callRecording.findFirst({
      where: { callId, companyId },
    })

    if (recording) {
      const signedUrl = await getAudioSignedUrl(recording.s3Key)
      return NextResponse.redirect(signedUrl)
    }

    const call = await prisma.call.findUnique({
      where: { id: callId },
      select: { externalRecordingUrl: true },
    })

    if (call?.externalRecordingUrl) {
      return NextResponse.redirect(call.externalRecordingUrl)
    }

    return NextResponse.json(
      { success: false, error: 'Аудио файл топилмади' },
      { status: 404 }
    )
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    console.error('[API/Call/Audio] Error:', err)
    return NextResponse.json(
      { success: false, error: 'Сервер хатолиги' },
      { status: 500 }
    )
  }
}
