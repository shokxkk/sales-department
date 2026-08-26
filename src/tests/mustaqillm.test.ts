import { describe, test, expect, vi, beforeAll } from 'vitest'
import { MustaqiLLMProvider } from '@/lib/ai/mustaqillm.provider'
import { getAIProvider } from '@/lib/ai/index'

describe('MustaqiLLM Provider Unit Tests', () => {
  beforeAll(() => {
    process.env.AI_PROVIDER = 'mustaqillm'
    process.env.MUSTAQILLM_API_KEY = 'mock_key'
  })

  test('getAIProvider should return MustaqiLLMProvider when AI_PROVIDER=mustaqillm', () => {
    const provider = getAIProvider()
    expect(provider.name).toBe('mustaqillm')
    expect(provider).toBeInstanceOf(MustaqiLLMProvider)
  })

  test('MustaqiLLMProvider analyzeCall handles JSON parsing & validation correctly', async () => {
    const provider = new MustaqiLLMProvider()

    // Mock fetch for HuggingFace endpoint call
    const mockAuditResult = {
      call_type: 'new_lead',
      language: 'uz_cyrillic',
      summary: 'МустақилLLM орқали синов таҳлили',
      customer_need: ['Мустақил AI моделлик интеграция'],
      objections: [],
      manager_talk_ratio: 50,
      customer_talk_ratio: 50,
      interruptions: 0,
      long_pauses: 0,
      filler_words: [],
      rudeness_detected: false,
      false_promises_detected: false,
      script_compliance: 95,
      sale_probability: 90,
      strengths: ['Ўзбек тилини аъло даражада тушунади'],
      mistakes: [],
      important_quotes: [],
      criteria: [
        {
          criterion_code: 'greeting_hello',
          score: 5,
          max_score: 5,
          passed: true,
          status: 'PASS',
          explanation: 'Тўлиқ саломлашди',
        },
      ],
      total_score: 95,
      recommendation: 'Модель муваффақиятли интеграция қилинди',
    }

    const globalFetch = global.fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify(mockAuditResult),
            },
          },
        ],
      }),
    }) as any

    try {
      const result = await provider.analyzeCall({
        transcript: 'Менежер: Ассалому алайкум. Мижоз: Ва алайкум ассалом.',
        segments: [],
        criteria: [
          {
            code: 'greeting_hello',
            nameUz: 'Саломлашиш',
            maxScore: 5,
            isCritical: false,
          },
        ],
      })

      expect(result).toBeDefined()
      expect(result.total_score).toBe(95)
      expect(result.summary).toContain('МустақилLLM')
    } finally {
      global.fetch = globalFetch
    }
  })
})
