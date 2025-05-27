import { EmotionDetector } from '../EmotionDetector'
import type { LLMResponse, EmotionAnalysis, EmotionData } from '../types'

describe('EmotionDetector', () => {
  let detector: EmotionDetector

  beforeEach(() => {
    detector = new EmotionDetector()

    // Mock the LLM service and database methods
    vi.mock('../llm', () => ({
      analyzeEmotionsWithLLM: vi.fn(),
    }))

    vi.mock('../database', () => ({
      storeEmotionAnalysis: vi.fn().mockResolvedValue('analysis-123'),
    }))
  })

  it('should create an instance of EmotionDetector', () => {
    expect(detector).toBeInstanceOf(EmotionDetector)
  })

  it('should detect emotions from text input', async () => {
    // Mock the LLM response
    const mockLLMResponse: LLMResponse<EmotionData[]> = {
      data: [
        { type: 'joy', confidence: 0.9, intensity: 0.8 },
        { type: 'surprise', confidence: 0.6, intensity: 0.5 },
      ],
      meta: {
        prompt: 'Analyze emotions in: I am happy to see you!',
        model: 'gpt-4',
        processingTime: 450,
      },
    }

    // Mock the LLM service
    detector.llm.analyzeEmotionsWithLLM = vi
      .fn()
      .mockResolvedValue(mockLLMResponse)

    const text = 'I am happy to see you!'
    const userId = 'user-123'

    const result = await detector.detectEmotionsFromText(text, userId)

    expect(result).toBeDefined()
    expect(result.emotions).toEqual(mockLLMResponse.data)
    expect(result.source).toBe('text')
    expect(result.content).toBe(text)
    expect(result.userId).toBe(userId)
    expect(detector.llm.analyzeEmotionsWithLLM).toHaveBeenCalledWith(
      expect.stringContaining(text),
      expect.any(Object),
    )
  })

  it('should detect emotions from facial expression data', async () => {
    // Mock facial expression data (e.g., from a facial recognition API)
    const facialData = {
      smile: 0.85,
      eyebrowPosition: 'raised',
      mouthOpenness: 0.2,
      // ... other facial features
    }

    // Mock the LLM response for facial data
    const mockLLMResponse: LLMResponse<EmotionData[]> = {
      data: [
        { type: 'happiness', confidence: 0.85, intensity: 0.8 },
        { type: 'surprise', confidence: 0.4, intensity: 0.3 },
      ],
      meta: {
        prompt: 'Analyze emotions in facial data',
        model: 'gpt-4',
        processingTime: 320,
      },
    }

    // Mock the LLM service
    detector.llm.analyzeEmotionsWithLLM = vi
      .fn()
      .mockResolvedValue(mockLLMResponse)

    const userId = 'user-456'

    const result = await detector.detectEmotionsFromFacialData(
      facialData,
      userId,
    )

    expect(result).toBeDefined()
    expect(result.emotions).toEqual(mockLLMResponse.data)
    expect(result.source).toBe('facial')
    expect(result.content).toEqual(JSON.stringify(facialData))
    expect(result.userId).toBe(userId)
    expect(detector.llm.analyzeEmotionsWithLLM).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        context: expect.objectContaining({
          facialData,
        }),
      }),
    )
  })

  it('should detect emotions from voice data', async () => {
    // Mock voice data (e.g., from a voice analysis API)
    const voiceData = {
      pitch: 220,
      volume: 0.7,
      tempo: 'moderate',
      audioFeatures: [0.1, 0.2, 0.3],
      // ... other voice features
    }

    // Mock the LLM response for voice data
    const mockLLMResponse: LLMResponse<EmotionData[]> = {
      data: [
        { type: 'calm', confidence: 0.75, intensity: 0.6 },
        { type: 'neutral', confidence: 0.65, intensity: 0.4 },
      ],
      meta: {
        prompt: 'Analyze emotions in voice data',
        model: 'gpt-4',
        processingTime: 380,
      },
    }

    // Mock the LLM service
    detector.llm.analyzeEmotionsWithLLM = vi
      .fn()
      .mockResolvedValue(mockLLMResponse)

    const userId = 'user-789'
    const transcript = 'Hello, this is a test'

    const result = await detector.detectEmotionsFromVoice(
      voiceData,
      transcript,
      userId,
    )

    expect(result).toBeDefined()
    expect(result.emotions).toEqual(mockLLMResponse.data)
    expect(result.source).toBe('voice')
    expect(result.content).toBe(transcript)
    expect(result.userId).toBe(userId)
    expect(detector.llm.analyzeEmotionsWithLLM).toHaveBeenCalledWith(
      expect.stringContaining(transcript),
      expect.objectContaining({
        context: expect.objectContaining({
          voiceData,
        }),
      }),
    )
  })

  it('should calculate overall sentiment from emotions', () => {
    const emotions: EmotionData[] = [
      { type: 'joy', confidence: 0.9, intensity: 0.8 }, // Highly positive
      { type: 'anxiety', confidence: 0.4, intensity: 0.3 }, // Slightly negative
    ]

    const sentiment = detector.calculateOverallSentiment(emotions)

    // Should be positive overall, but somewhat reduced by the anxiety
    expect(sentiment).toBeGreaterThan(0.5)
    expect(sentiment).toBeLessThan(0.9)
  })

  it('should identify risk factors from emotions', () => {
    // Test with high-risk emotions
    const highRiskEmotions: EmotionData[] = [
      { type: 'anger', confidence: 0.9, intensity: 0.9 },
      { type: 'despair', confidence: 0.7, intensity: 0.8 },
    ]

    const highRiskFactors = detector.identifyRiskFactors(highRiskEmotions)

    expect(highRiskFactors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: expect.stringMatching(/anger|despair/),
          severity: 'high',
        }),
      ]),
    )

    // Test with low-risk emotions
    const lowRiskEmotions: EmotionData[] = [
      { type: 'joy', confidence: 0.8, intensity: 0.7 },
      { type: 'mild_anxiety', confidence: 0.4, intensity: 0.3 },
    ]

    const lowRiskFactors = detector.identifyRiskFactors(lowRiskEmotions)

    // Should have mild anxiety as a low risk factor
    expect(lowRiskFactors.length).toBeLessThan(highRiskFactors.length)
    if (lowRiskFactors.length > 0) {
      expect(lowRiskFactors[0].severity).toBe('low')
    }
  })

  it('should store analysis results in the database', async () => {
    const emotions: EmotionData[] = [
      { type: 'contentment', confidence: 0.8, intensity: 0.7 },
    ]

    const mockAnalysis: EmotionAnalysis = {
      id: '',
      userId: 'user-abc',
      timestamp: new Date().toISOString(),
      source: 'text',
      content: 'I feel content today',
      emotions: emotions,
      overallSentiment: 0.75,
      riskFactors: [],
    }

    // Mock the database store function
    detector.database.storeEmotionAnalysis = vi
      .fn()
      .mockResolvedValue('analysis-id-456')

    const result = await detector.storeAnalysis(mockAnalysis)

    expect(result).toBe('analysis-id-456')
    expect(detector.database.storeEmotionAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: mockAnalysis.userId,
        source: mockAnalysis.source,
        emotions: mockAnalysis.emotions,
      }),
    )
  })

  it('should handle empty emotion data gracefully', async () => {
    // Mock an empty LLM response
    const mockLLMResponse: LLMResponse<EmotionData[]> = {
      data: [],
      meta: {
        prompt: 'Analyze emotions in: Hello',
        model: 'gpt-4',
        processingTime: 200,
      },
    }

    // Mock the LLM service
    detector.llm.analyzeEmotionsWithLLM = vi
      .fn()
      .mockResolvedValue(mockLLMResponse)

    const text = 'Hello'
    const userId = 'user-empty'

    const result = await detector.detectEmotionsFromText(text, userId)

    expect(result).toBeDefined()
    expect(result.emotions).toEqual([])
    expect(result.overallSentiment).toBe(0) // Neutral sentiment for empty emotions
    expect(result.riskFactors).toEqual([]) // No risk factors for empty emotions
  })

  it('should combine emotions from multiple sources', async () => {
    // Create test analyses from different sources
    const textAnalysis: EmotionAnalysis = {
      id: 'text-analysis',
      userId: 'user-multi',
      timestamp: new Date().toISOString(),
      source: 'text',
      content: 'I am feeling happy today',
      emotions: [{ type: 'joy', confidence: 0.9, intensity: 0.8 }],
      overallSentiment: 0.8,
      riskFactors: [],
    }

    const facialAnalysis: EmotionAnalysis = {
      id: 'facial-analysis',
      userId: 'user-multi',
      timestamp: new Date().toISOString(),
      source: 'facial',
      content: JSON.stringify({ smile: 0.9 }),
      emotions: [{ type: 'happiness', confidence: 0.85, intensity: 0.9 }],
      overallSentiment: 0.85,
      riskFactors: [],
    }

    const voiceAnalysis: EmotionAnalysis = {
      id: 'voice-analysis',
      userId: 'user-multi',
      timestamp: new Date().toISOString(),
      source: 'voice',
      content: 'I am feeling happy today',
      emotions: [
        { type: 'joy', confidence: 0.7, intensity: 0.6 },
        { type: 'nervousness', confidence: 0.4, intensity: 0.3 },
      ],
      overallSentiment: 0.6,
      riskFactors: [
        {
          type: 'nervousness',
          severity: 'low',
          description: 'Slight nervousness detected in voice',
        },
      ],
    }

    const combinedAnalysis = detector.combineEmotionAnalyses([
      textAnalysis,
      facialAnalysis,
      voiceAnalysis,
    ])

    expect(combinedAnalysis).toBeDefined()
    expect(combinedAnalysis.source).toBe('combined')
    expect(combinedAnalysis.emotions.length).toBeGreaterThanOrEqual(2) // Should have at least joy and nervousness

    // The combined sentiment should be somewhere between the individual sentiments
    expect(combinedAnalysis.overallSentiment).toBeGreaterThan(0.6) // Higher than lowest
    expect(combinedAnalysis.overallSentiment).toBeLessThan(0.85) // Lower than highest

    // Should include risk factors from all sources
    expect(combinedAnalysis.riskFactors).toEqual(voiceAnalysis.riskFactors)
  })

  it('should handle errors gracefully during emotion detection', async () => {
    // Mock the LLM service to throw an error
    detector.llm.analyzeEmotionsWithLLM = vi
      .fn()
      .mockRejectedValue(new Error('LLM service unavailable'))

    const text = 'This should cause an error'
    const userId = 'user-error'

    // Should not throw but return a fallback/default analysis
    const result = await detector.detectEmotionsFromText(text, userId)

    expect(result).toBeDefined()
    expect(result.emotions).toEqual([])
    expect(result.content).toBe(text)
    expect(result.userId).toBe(userId)
    expect(result.source).toBe('text')
    // Should have an error indicator
    expect(result.error).toBeDefined()
    expect(result.error).toContain('LLM service unavailable')
  })
})
