import { describe, test, expect, vi, beforeAll } from 'vitest'
import { OpenAIProvider } from '@/lib/ai/openai.provider'

const mockCreate = vi
  .fn()
  .mockResolvedValueOnce({
    choices: [
      {
        message: {
          content: 'invalid json content string',
        },
      },
    ],
  })
  .mockResolvedValueOnce({
    choices: [
      {
        message: {
          content: JSON.stringify({
            call_type: 'new_lead',
            language: 'uz_cyrillic',
            summary: 'Саломлашди ва суҳбатлашди',
            customer_need: ['Хизмат олиш'],
            objections: [],
            manager_talk_ratio: 50,
            customer_talk_ratio: 50,
            interruptions: 0,
            long_pauses: 0,
            filler_words: [],
            rudeness_detected: false,
            false_promises_detected: false,
            script_compliance: 100,
            sale_probability: 80,
            strengths: ['Зўр'],
            mistakes: [],
            important_quotes: [],
            criteria: [],
            total_score: 90,
            recommendation: 'Давом этсин',
          }),
        },
      },
    ],
  })

// Mock OpenAI constructor using standard class
vi.mock('openai', () => {
  return {
    default: class MockedOpenAI {
      chat = {
        completions: {
          create: mockCreate,
        },
      }
    },
  }
})

describe('OpenAI Provider Self-Healing JSON Tests', () => {
  beforeAll(() => {
    process.env.OPENAI_API_KEY = 'mocked_key'
  })

  test('analyzeCall should retry and heal on invalid JSON response', async () => {
    const provider = new OpenAIProvider()
    const result = await provider.analyzeCall({
      transcript: 'Demo transcript',
      segments: [],
      criteria: [],
    })

    expect(result).toBeDefined()
    expect(result.total_score).toBe(90)
    expect(result.language).toBe('uz_cyrillic')
    expect(mockCreate).toHaveBeenCalledTimes(2)
  })
})
