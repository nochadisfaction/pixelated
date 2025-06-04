import { renderHook } from '@testing-library/react'
import { useEmotionDetection } from '../useEmotionDetection'

describe('useEmotionDetection', () => {
  const mockAIResponse = {
    primaryEmotion: 'joy',
    secondaryEmotions: ['excitement', 'contentment'],
    intensity: 0.8,
    confidence: 0.9,
  }

  const mockStreamResponse = new ReadableStream({
    start(controller) {
      controller.enqueue(
        new TextEncoder().encode(JSON.stringify(mockAIResponse)),
      )
      controller.close()
    },
  })

  beforeEach(() => {
    vi.mock('../useAIService', () => ({
      useAIService: () => ({
        getAIResponse: vi
          .fn()
          .mockResolvedValue({ content: JSON.stringify(mockAIResponse) }),
      }),
    }))
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should detect emotions from text content', async () => {
    const { result } = renderHook(() => useEmotionDetection())
    const analysis = await result.current.detectEmotions(
      'I am feeling really happy today!',
    )

    expect(analysis).toEqual({
      primaryEmotion: 'joy',
      secondaryEmotions: ['excitement', 'contentment'],
      intensity: 0.8,
      confidence: 0.9,
    })
  })

  it('should handle streaming responses', async () => {
    vi.mock('../useAIService', () => ({
      useAIService: () => ({
        getAIResponse: vi.fn().mockResolvedValue(mockStreamResponse),
      }),
    }))

    const { result } = renderHook(() => useEmotionDetection())
    const analysis = await result.current.detectEmotions(
      'I am feeling really happy today!',
    )

    expect(analysis).toEqual({
      primaryEmotion: 'joy',
      secondaryEmotions: ['excitement', 'contentment'],
      intensity: 0.8,
      confidence: 0.9,
    })
  })

  it('should return default values on error', async () => {
    vi.mock('../useAIService', () => ({
      useAIService: () => ({
        getAIResponse: vi.fn().mockRejectedValue(new Error('API Error')),
      }),
    }))

    const { result } = renderHook(() => useEmotionDetection())
    const analysis = await result.current.detectEmotions('Test message')

    expect(analysis).toEqual({
      primaryEmotion: 'neutral',
      secondaryEmotions: [],
      intensity: 0.5,
      confidence: 0.5,
    })
  })

  it('should handle malformed JSON responses', async () => {
    vi.mock('../useAIService', () => ({
      useAIService: () => ({
        getAIResponse: vi.fn().mockResolvedValue({ content: 'invalid json' }),
      }),
    }))

    const { result } = renderHook(() => useEmotionDetection())
    const analysis = await result.current.detectEmotions('Test message')

    expect(analysis).toEqual({
      primaryEmotion: 'neutral',
      secondaryEmotions: [],
      intensity: 0.5,
      confidence: 0.5,
    })
  })
})
