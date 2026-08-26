import type {
  AIProvider,
  AuditAnalysisResult,
  TranscriptionResult,
  TranscriptSegment,
} from './provider.interface'
import { OpenAIProvider } from './openai.provider'
import OpenAI from 'openai'

const AISHA_API_KEY = process.env.AISHA_API_KEY || 'kAR40Omw.6U2IOUNNfG1hCrLOLIqVnTPnK0qDzI4y'

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
   * Transcribe audio using Aisha AI (https://back.aisha.group/api/v2/stt/post/)
   * Supports native Uzbek speech recognition + speaker diarization (SPEAKER_00, SPEAKER_01...)
   */
  async transcribe(params: {
    audioBuffer: Buffer
    mimeType: string
    durationSeconds: number
    hint?: string
  }): Promise<TranscriptionResult> {
    console.log(`[AishaProvider] Sending ${params.audioBuffer.length} bytes to Aisha AI v2 STT endpoint...`)

    const blob = new Blob([new Uint8Array(params.audioBuffer)], { type: params.mimeType || 'audio/mp3' })
    const form = new FormData()
    form.append('audio', blob, 'call.mp3')
    form.append('language', 'uz')
    form.append('has_diarization', 'true')
    form.append('title', `call-${Date.now()}`)

    let id: number | null = null
    try {
      const res = await fetch('https://back.aisha.group/api/v2/stt/post/', {
        method: 'POST',
        headers: {
          'X-Api-Key': AISHA_API_KEY,
        },
        body: form,
      })

      if (!res.ok) {
        const errText = await res.text()
        throw new Error(`Aisha v2 POST failed (${res.status}): ${errText}`)
      }

      const json = await res.json()
      id = json.id
      console.log(`[AishaProvider] Queued task id=${id}, status=${json.status}`)
    } catch (err: any) {
      console.error(`[AishaProvider] Queuing error: ${err.message}. Falling back to OpenAI Whisper...`)
      return this.openAiFallback.transcribe(params)
    }

    if (!id) {
      return this.openAiFallback.transcribe(params)
    }

    // Poll GET /api/v2/stt/get/{id}/ until status is SUCCESS
    let pollJson: any = null
    const maxRetries = 60 // Up to 3 minutes
    for (let i = 0; i < maxRetries; i++) {
      await new Promise((resolve) => setTimeout(resolve, 3000))
      try {
        const rPoll = await fetch(`https://back.aisha.group/api/v2/stt/get/${id}/`, {
          headers: { 'X-Api-Key': AISHA_API_KEY },
        })
        if (!rPoll.ok) continue
        pollJson = await rPoll.json()
        if (pollJson.status === 'SUCCESS') {
          console.log(`[AishaProvider] Task id=${id} completed successfully!`)
          break
        }
        if (pollJson.status === 'FAILED') {
          throw new Error(`Aisha STT task ${id} returned FAILED status`)
        }
      } catch (pollErr: any) {
        console.warn(`[AishaProvider] Polling attempt ${i + 1} warning: ${pollErr.message}`)
      }
    }

    if (!pollJson || pollJson.status !== 'SUCCESS') {
      console.warn(`[AishaProvider] Task id=${id} timed out or failed. Falling back to OpenAI Whisper...`)
      return this.openAiFallback.transcribe(params)
    }

    const rawDiarization = Array.isArray(pollJson.diarization) ? pollJson.diarization : []
    const rawTranscriptText = typeof pollJson.transcript === 'string' ? pollJson.transcript : ''

    if (rawDiarization.length === 0) {
      console.warn(`[AishaProvider] Diarization array empty. Creating single segment...`)
      const seg: TranscriptSegment = {
        speaker: 'UNKNOWN',
        startSeconds: 0,
        endSeconds: params.durationSeconds || pollJson.duration || 60,
        text: rawTranscriptText || 'Audio matni',
        confidence: 0.95,
        language: 'uz',
        sort: 0,
      }
      return {
        language: 'uz',
        rawText: seg.text,
        segments: [seg],
        durationSeconds: params.durationSeconds || pollJson.duration || 60,
        provider: 'Aisha AI (back.aisha.group)',
        modelUsed: 'aisha-uz-stt-v2',
      }
    }

    // Convert raw Aisha segments (SPEAKER_00, SPEAKER_01) to verified MANAGER/CUSTOMER & Cyrillic via quick GPT-4o refinement
    const formattedSegments = rawDiarization.map((seg: any, idx: number) => ({
      index: idx,
      start: seg.start,
      end: seg.end,
      speaker: seg.speaker,
      text: seg.text,
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
      durationSeconds: params.durationSeconds || pollJson.duration || 60,
      provider: 'Aisha AI + GPT-4o Diarization',
      modelUsed: 'aisha-uz-stt-v2',
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
Сегментлар сони аниқ ${segments.length} та бўлиши ШАРТ. Бошқа ҳеч қандай матн ёзманг.`

      const response = await this.openaiClient.chat.completions.create({
        model: process.env.OPENAI_AUDIT_MODEL || 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: JSON.stringify({ segments }) },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      })

      const parsed = JSON.parse(response.choices[0]?.message?.content || '{}')
      const refinedList = parsed.segments || []

      const result: Array<{ speaker: 'MANAGER' | 'CUSTOMER' | 'UNKNOWN'; startSeconds: number; endSeconds: number; text: string }> = []
      for (const orig of segments) {
        const refinedSeg = refinedList.find((r: any) => r.index === orig.index)
        result.push({
          speaker: refinedSeg?.speaker === 'MANAGER' || refinedSeg?.speaker === 'CUSTOMER' ? refinedSeg.speaker : 'UNKNOWN',
          startSeconds: orig.start,
          endSeconds: orig.end,
          text: refinedSeg?.text || orig.text,
        })
      }
      return result
    } catch (err: any) {
      console.warn(`[AishaProvider] refineAndMapSpeakers failed: ${err.message}. Returning raw segments...`)
      return segments.map((s) => ({
        speaker: s.speaker === 'SPEAKER_01' ? 'MANAGER' : 'CUSTOMER',
        startSeconds: s.start,
        endSeconds: s.end,
        text: s.text,
      }))
    }
  }
}
