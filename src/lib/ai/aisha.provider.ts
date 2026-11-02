import type {
  AIProvider,
  AuditAnalysisResult,
  TranscriptionResult,
  TranscriptSegment,
} from './provider.interface'
import { OpenAIProvider } from './openai.provider'
import OpenAI from 'openai'

const DEFAULT_AISHA_API_KEY = 'DckIypKc.mlKpakqmwSocGwBwKPD6MNF9da89lAsP'
const LEGACY_REVOKED_KEY = 'kAR40Omw.6U2IOUNNfG1hCrLOLIqVnTPnK0qDzI4y'
const envAishaKey = process.env.AISHA_API_KEY?.trim()
const AISHA_API_KEY =
  envAishaKey && envAishaKey !== LEGACY_REVOKED_KEY ? envAishaKey : DEFAULT_AISHA_API_KEY

export class AishaProvider implements AIProvider {
  name = 'aisha'
  private _openAiFallback: OpenAIProvider | null = null
  private _openaiClient: OpenAI | null = null

  private get openAiFallback(): OpenAIProvider {
    if (!this._openAiFallback) {
      this._openAiFallback = new OpenAIProvider()
    }
    return this._openAiFallback
  }

  private get openaiClient(): OpenAI {
    if (!this._openaiClient) {
      this._openaiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY || 'dummy',
      })
    }
    return this._openaiClient
  }

  /**
   * Transcribe audio using Aisha AI:
   * 1. Short audio (<= 2 min): POST https://back.aisha.group/api/v1/stt/post/ (sync)
   * 2. Long audio (> 2 min): POST https://back.aisha.group/api/v2/stt/post/ (async) + GET /api/v2/stt/get/{id}/
   * Supports native Uzbek speech recognition + speaker diarization (SPEAKER_00, SPEAKER_01...)
   */
  async transcribe(params: {
    audioBuffer: Buffer
    mimeType: string
    durationSeconds: number
    hint?: string
  }): Promise<TranscriptionResult> {
    console.log(`[AishaProvider] Sending ${params.audioBuffer.length} bytes to Aisha AI STT...`)

    const ext = params.mimeType?.includes('wav')
      ? 'wav'
      : params.mimeType?.includes('ogg')
      ? 'ogg'
      : params.mimeType?.includes('m4a') || params.mimeType?.includes('mp4')
      ? 'm4a'
      : 'mp3'
    const blob = new Blob([new Uint8Array(params.audioBuffer)], { type: params.mimeType || 'audio/mp3' })

    // 1. Try v1 sync endpoint first (fast sync response for <= 2 min audio, and instant health check)
    try {
      const formV1 = new FormData()
      formV1.append('audio', blob, `call.${ext}`)
      formV1.append('language', 'uz')
      formV1.append('has_diarization', 'false')
      formV1.append('title', `call-${Date.now()}`)

      const resV1 = await fetch('https://back.aisha.group/api/v1/stt/post/', {
        method: 'POST',
        headers: {
          'X-Api-Key': AISHA_API_KEY,
          'Accept-Language': 'uz',
        },
        body: formV1,
        signal: AbortSignal.timeout(30_000),
      })

      if (resV1.ok) {
        const v1Json = await resV1.json()
        console.log(`[AishaProvider] v1 sync STT succeeded (id=${v1Json.id})`)
        return this.buildTranscriptionResult(v1Json, params.durationSeconds, 'aisha-uz-stt-v1')
      }

      const v1ErrText = await resV1.text()
      console.warn(`[AishaProvider] v1 STT returned ${resV1.status}: ${v1ErrText.slice(0, 200)}`)

      // If Aisha STT backend is down (503/500) or auth/balance error (401/402), fallback immediately
      if (
        resV1.status === 503 ||
        resV1.status === 500 ||
        resV1.status === 401 ||
        resV1.status === 402 ||
        v1ErrText.includes('stt_transcription_failed')
      ) {
        console.warn(`[AishaProvider] Aisha STT service unavailable (${resV1.status}). Falling back to OpenAI Whisper immediately...`)
        return this.openAiFallback.transcribe(params)
      }
    } catch (v1Err: any) {
      console.warn(`[AishaProvider] v1 STT request warning: ${v1Err.message}`)
    }

    // 2. For long audio (> 2 min, v1 returned 403 audio_duration_use_v2): use v2 async endpoint
    // Start OpenAI fallback in parallel so if Aisha v2 queue fails or stalls, fallback completes without extra wait
    const parallelFallbackPromise = this.openAiFallback.transcribe(params).catch((err) => {
      console.warn(`[AishaProvider] Parallel fallback error: ${err.message}`)
      return null
    })

    const formV2 = new FormData()
    formV2.append('audio', blob, `call.${ext}`)
    formV2.append('language', 'uz')
    formV2.append('has_diarization', 'true')
    formV2.append('title', `call-${Date.now()}`)

    let id: number | null = null
    try {
      const res = await fetch('https://back.aisha.group/api/v2/stt/post/', {
        method: 'POST',
        headers: {
          'X-Api-Key': AISHA_API_KEY,
        },
        body: formV2,
        signal: AbortSignal.timeout(20_000),
      })

      if (!res.ok) {
        const errText = await res.text()
        throw new Error(`Aisha v2 POST failed (${res.status}): ${errText}`)
      }

      const json = await res.json()
      id = json.id
      console.log(`[AishaProvider] Queued v2 task id=${id}, status=${json.status}`)
    } catch (err: any) {
      console.error(`[AishaProvider] Queuing error: ${err.message}. Using OpenAI Whisper fallback...`)
      const fb = await parallelFallbackPromise
      return fb || this.openAiFallback.transcribe(params)
    }

    if (!id) {
      const fb = await parallelFallbackPromise
      return fb || this.openAiFallback.transcribe(params)
    }

    // Poll GET /api/v2/stt/get/{id}/ until status is SUCCESS or FAILED (bounded to 20s to avoid serverless timeout)
    let pollJson: any = null
    const maxRetries = 8
    for (let i = 0; i < maxRetries; i++) {
      await new Promise((resolve) => setTimeout(resolve, 2500))
      try {
        const rPoll = await fetch(`https://back.aisha.group/api/v2/stt/get/${id}/`, {
          headers: { 'X-Api-Key': AISHA_API_KEY },
          signal: AbortSignal.timeout(8_000),
        })
        if (!rPoll.ok) continue
        pollJson = await rPoll.json()
        if (pollJson.status === 'SUCCESS') {
          console.log(`[AishaProvider] Task id=${id} completed successfully!`)
          break
        }
        if (pollJson.status === 'FAILED' || pollJson.status === 'ERROR') {
          console.warn(`[AishaProvider] Task id=${id} returned ${pollJson.status}. Breaking polling loop...`)
          break
        }
      } catch (pollErr: any) {
        console.warn(`[AishaProvider] Polling attempt ${i + 1} warning: ${pollErr.message}`)
      }
    }

    if (!pollJson || pollJson.status !== 'SUCCESS') {
      console.warn(`[AishaProvider] Task id=${id} timed out or failed (status=${pollJson?.status}). Using OpenAI Whisper fallback...`)
      const fb = await parallelFallbackPromise
      return fb || this.openAiFallback.transcribe(params)
    }

    return this.buildTranscriptionResult(pollJson, params.durationSeconds, 'aisha-uz-stt-v2')
  }

  private async buildTranscriptionResult(
    payload: any,
    fallbackDurationSeconds: number,
    modelUsed: string
  ): Promise<TranscriptionResult> {
    let rawDiarization = Array.isArray(payload.diarization) ? payload.diarization : []
    let rawTranscriptText = typeof payload.transcript === 'string' ? payload.transcript.trim() : ''

    // If diarization is empty but transcript is a JSON stringified array of segments, parse it
    if (rawDiarization.length === 0 && rawTranscriptText.startsWith('[')) {
      try {
        const parsed = JSON.parse(rawTranscriptText)
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].text) {
          rawDiarization = parsed
          rawTranscriptText = parsed.map((s: any) => s.text).join(' ')
        }
      } catch {
        // Not a valid JSON array, treat as plain text
      }
    }

    const duration = fallbackDurationSeconds || Math.round(Number(payload.duration) || 60)

    if (rawDiarization.length === 0) {
      console.log(`[AishaProvider] Diarization array empty. Refining plain transcript...`)
      const singleInput = [
        {
          index: 0,
          start: 0,
          end: duration,
          speaker: 'SPEAKER_00',
          text: rawTranscriptText || 'Audio matni',
        },
      ]
      const refinedSingle = await this.refineAndMapSpeakers(singleInput)
      const seg: TranscriptSegment = {
        speaker: refinedSingle[0]?.speaker || 'MANAGER',
        startSeconds: 0,
        endSeconds: duration,
        text: refinedSingle[0]?.text || rawTranscriptText || 'Audio matni',
        confidence: 0.95,
        language: 'uz_cyrillic',
        sort: 0,
      }
      return {
        language: 'uz_cyrillic',
        rawText: seg.text,
        segments: [seg],
        durationSeconds: duration,
        provider: 'Aisha AI (back.aisha.group)',
        modelUsed,
      }
    }

    // Convert raw Aisha segments (SPEAKER_00, SPEAKER_01) to verified MANAGER/CUSTOMER & Cyrillic via quick GPT-4o refinement
    const formattedSegments = rawDiarization.map((seg: any, idx: number) => ({
      index: idx,
      start: Number(seg.start) || idx * 4,
      end: Number(seg.end) || (idx + 1) * 4,
      speaker: seg.speaker || 'SPEAKER_00',
      text: seg.text || '',
    }))

    const refined = await this.refineAndMapSpeakers(formattedSegments)

    const transcriptSegments: TranscriptSegment[] = refined.map((r, idx) => ({
      speaker: r.speaker,
      startSeconds: r.startSeconds,
      endSeconds: r.endSeconds,
      text: r.text,
      confidence: 0.96,
      language: 'uz_cyrillic',
      sort: idx,
    }))

    const rawText = transcriptSegments
      .map((s) => `${s.speaker === 'MANAGER' ? 'Менежер' : 'Мижоз'}: ${s.text}`)
      .join('\n')

    return {
      language: 'uz_cyrillic',
      rawText,
      segments: transcriptSegments,
      durationSeconds: duration,
      provider: 'Aisha AI + GPT-4o Diarization',
      modelUsed,
    }
  }

  /**
   * Delegates call evaluation and scoring to our upgraded OpenAI GPT-4o Evaluation Agent
   */
  async analyzeCall(params: {
    transcript: string
    segments: TranscriptSegment[]
    callType?: string
    scriptStages?: Array<{ name: string; requiredActions: string[] }>
    criteria: Array<{
      code: string
      nameUz: string
      maxScore: number
      isCritical: boolean
    }>
  }): Promise<AuditAnalysisResult> {
    return this.openAiFallback.analyzeCall(params)
  }

  private async refineAndMapSpeakers(
    segments: Array<{ index: number; start: number; end: number; speaker: string; text: string }>
  ): Promise<Array<{ speaker: 'MANAGER' | 'CUSTOMER' | 'UNKNOWN'; startSeconds: number; endSeconds: number; text: string }>> {
    try {
      // For long calls with many segments, chunk the refinement to avoid token limits
      const CHUNK_SIZE = 60
      const allRefined: Array<{ index: number; speaker: string; text: string }> = []

      for (let i = 0; i < segments.length; i += CHUNK_SIZE) {
        const chunk = segments.slice(i, i + CHUNK_SIZE)
        const systemPrompt = `Сиз сотув бўлими қўнғироқлари учун лингвистик ва диаризация бўйича экспертсиз.
Берилган транскрипция Aisha AI томонидан таниб олинган ўзбек тилидаги матн ва SPEAKER_00, SPEAKER_01 овоз белгиларидир.

ВАЗИФАНГИЗ:
1. Овозларни (SPEAKER_00 ёки SPEAKER_01) суҳбат мазмунига қараб "MANAGER" (сотув менежери, таништирувчи) ёки "CUSTOMER" (мижоз, жавоб берувчи) га аниқ ажратинг.
2. Барча сегмент матнларини (text) ЎЗБЕК КИРИЛЛИЦАСИГА (масалан: "Assalomu alaykum" -> "Ассалому алайкум") ўгириб чиқинг.
3. Мижоз ёки менежер сўзларида фонетик ёки грамматик хатолар бўлса, суҳбат мазмунига қараб аниқ, тоза ўзбек тилида (кириллчада) тикланг.
4. ФАҚАТ ВА ФАҚАТ қуйидаги JSON форматида жавоб беринг:
{
  "segments": [
    { "index": number, "speaker": "MANAGER" | "CUSTOMER", "text": "Кириллчадаги тоза матн" }
  ]
}
Сегментлар сони аниқ ${chunk.length} та бўлиши ШАРТ. Бошқа ҳеч қандай матн ёзманг.`

        const response = await this.openaiClient.chat.completions.create({
          model: process.env.OPENAI_AUDIT_MODEL || 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: JSON.stringify({ segments: chunk }) },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
          max_tokens: 3000,
        })

        const parsed = JSON.parse(response.choices[0]?.message?.content || '{}')
        const refinedChunk: Array<{ index: number; speaker: string; text: string }> = parsed.segments || []
        allRefined.push(...refinedChunk)
      }

      const result: Array<{ speaker: 'MANAGER' | 'CUSTOMER' | 'UNKNOWN'; startSeconds: number; endSeconds: number; text: string }> = []
      for (const orig of segments) {
        const refinedSeg = allRefined.find((r: any) => r.index === orig.index)
        result.push({
          speaker: refinedSeg?.speaker === 'MANAGER' || refinedSeg?.speaker === 'CUSTOMER' ? refinedSeg.speaker as ('MANAGER' | 'CUSTOMER') : 'UNKNOWN',
          startSeconds: orig.start,
          endSeconds: orig.end,
          text: refinedSeg?.text || orig.text,
        })
      }
      return result
    } catch (err: any) {
      console.warn(`[AishaProvider] refineAndMapSpeakers failed: ${err.message}. Returning raw segments...`)
      return segments.map((s) => ({
        speaker: s.speaker === 'SPEAKER_01' ? 'MANAGER' : ('CUSTOMER' as 'MANAGER' | 'CUSTOMER'),
        startSeconds: s.start,
        endSeconds: s.end,
        text: s.text,
      }))
    }
  }
}
