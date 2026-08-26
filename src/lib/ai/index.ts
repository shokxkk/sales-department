// ─────────────────────────────────────────────────────────────────
//  AI Provider Factory — swap providers via environment variable
//  AI_PROVIDER=aisha (default) | openai | mustaqillm
//  mustaqillm → NeuronAI O'zbek LLM (https://huggingface.co/NeuronUz/MustaqiLLM)
// ─────────────────────────────────────────────────────────────────
import type { AIProvider } from './provider.interface'
import { OpenAIProvider } from './openai.provider'
import { AishaProvider } from './aisha.provider'
import { MustaqiLLMProvider } from './mustaqillm.provider'

let providerInstance: AIProvider | null = null

export function getAIProvider(): AIProvider {
  if (!providerInstance) {
    const providerName = process.env.AI_PROVIDER || 'aisha'

    switch (providerName) {
      case 'aisha':
        providerInstance = new AishaProvider()
        break
      case 'openai':
        providerInstance = new OpenAIProvider()
        break
      case 'mustaqillm':
        providerInstance = new MustaqiLLMProvider()
        console.log('[AIFactory] MustaqiLLM (NeuronAI) — O\'zbek tili uchun noldan yaratilgan LLM faollashtirildi ✓')
        break
      default:
        console.warn(`Unknown AI_PROVIDER="${providerName}", defaulting to Aisha AI`)
        providerInstance = new AishaProvider()
    }
  }

  return providerInstance
}

export type { AIProvider, AuditAnalysisResult, TranscriptionResult, TranscriptSegment } from './provider.interface'
