import { EmotionAnalyzer } from '../EmotionAnalyzer'
import type { EmotionData, EmotionAnalysis } from '../types'

describe('EmotionAnalyzer', () => {
  let analyzer: EmotionAnalyzer

  beforeEach(() => {
    analyzer = new EmotionAnalyzer()

    // Mock the database methods
    vi.mock('../database', () => ({
      storeEmotionAnalysis: vi.fn().mockResolvedValue('analysis-123'),
    }))
  })

  it('should create an instance of EmotionAnalyzer', () => {
    expect(analyzer).toBeInstanceOf(EmotionAnalyzer)
  })

  it('should analyze text input for emotional content', async () => {
    const text = 'I am feeling extremely happy and excited about my new job!'
    const userId = 'user-123'

    // Mock the language model response
    analyzer.llm.analyzeEmotionFromText = vi.fn().mockResolvedValue({
      data: [
        { type: 'joy', confidence: 0.9, intensity: 0.8 },
        { type: 'excitement', confidence: 0.85, intensity: 0.9 },
      ],
      meta: {
        prompt: 'Analyze emotions in text',
        model: 'gpt-4',
        processingTime: 320,
      },
    })

    const result = await analyzer.analyzeText(text, userId)

    expect(result).toBeDefined()
    expect(result.emotions).toHaveLength(2)
    expect(result.emotions[0].type).toBe('joy')
    expect(result.emotions[1].type).toBe('excitement')
    expect(result.source).toBe('text')
    expect(result.input).toBe(text)
    expect(result.userId).toBe(userId)
    expect(analyzer.llm.analyzeEmotionFromText).toHaveBeenCalledWith(text)
  })

  it('should analyze facial expressions for emotional content', async () => {
    const facialData = {
      faceId: 'face-123',
      features: {
        smile: 0.8,
        eyebrows: 'raised',
        mouthOpen: 0.5,
        eyesOpen: true,
        headPose: { pitch: 0.1, roll: 0.2, yaw: 0.3 },
      },
    }

    const userId = 'user-123'

    // Mock the analysis response
    analyzer.analyzeFacialFeatures = vi.fn().mockReturnValue([
      { type: 'happiness', confidence: 0.85, intensity: 0.8 },
      { type: 'surprise', confidence: 0.6, intensity: 0.5 },
    ])

    const result = await analyzer.analyzeFacialExpression(facialData, userId)

    expect(result).toBeDefined()
    expect(result.emotions).toHaveLength(2)
    expect(result.emotions[0].type).toBe('happiness')
    expect(result.emotions[1].type).toBe('surprise')
    expect(result.source).toBe('facial')
    expect(result.input).toEqual(facialData)
    expect(result.userId).toBe(userId)
    expect(analyzer.analyzeFacialFeatures).toHaveBeenCalledWith(
      facialData.features,
    )
  })

  it('should analyze voice input for emotional content', async () => {
    const voiceData = {
      audioId: 'audio-123',
      features: {
        pitch: { mean: 220, variance: 30 },
        volume: { mean: 0.7, variance: 0.2 },
        speakingRate: 1.2,
        pausePattern: [0.5, 0.8, 0.3],
      },
      transcript: 'I really enjoyed meeting you yesterday.',
    }

    const userId = 'user-123'

    // Mock the language model response
    analyzer.llm.analyzeEmotionFromText = vi.fn().mockResolvedValue({
      data: [
        { type: 'joy', confidence: 0.7, intensity: 0.6 },
        { type: 'warmth', confidence: 0.8, intensity: 0.7 },
      ],
      meta: {
        prompt: 'Analyze emotions in transcript',
        model: 'gpt-4',
        processingTime: 310,
      },
    })

    // Mock the voice feature analysis
    analyzer.analyzeVoiceFeatures = vi.fn().mockReturnValue([
      { type: 'happiness', confidence: 0.75, intensity: 0.7 },
      { type: 'engagement', confidence: 0.8, intensity: 0.6 },
    ])

    const result = await analyzer.analyzeVoice(voiceData, userId)

    expect(result).toBeDefined()
    expect(result.emotions).toHaveLength(4) // Combined from transcript and voice features
    expect(result.source).toBe('voice')
    expect(result.input).toEqual(voiceData)
    expect(result.userId).toBe(userId)
    expect(analyzer.llm.analyzeEmotionFromText).toHaveBeenCalledWith(
      voiceData.transcript,
    )
    expect(analyzer.analyzeVoiceFeatures).toHaveBeenCalledWith(
      voiceData.features,
    )
  })

  it('should calculate emotional dimensions from emotion data', () => {
    const emotions: EmotionData[] = [
      { type: 'joy', confidence: 0.9, intensity: 0.8 },
      { type: 'excitement', confidence: 0.7, intensity: 0.9 },
    ]

    const dimensions = analyzer.calculateEmotionDimensions(emotions)

    expect(dimensions).toBeDefined()
    expect(dimensions.valence).toBeGreaterThan(0) // Positive emotions should have positive valence
    expect(dimensions.arousal).toBeGreaterThan(0.5) // Excitement should contribute to high arousal
    expect(dimensions.dominance).toBeDefined()

    // Test negative emotions
    const negativeEmotions: EmotionData[] = [
      { type: 'sadness', confidence: 0.8, intensity: 0.7 },
      { type: 'anxiety', confidence: 0.6, intensity: 0.8 },
    ]

    const negativeDimensions =
      analyzer.calculateEmotionDimensions(negativeEmotions)

    expect(negativeDimensions.valence).toBeLessThan(0) // Negative emotions should have negative valence
    expect(negativeDimensions.arousal).toBeGreaterThan(0) // Anxiety should have high arousal
    expect(negativeDimensions.dominance).toBeLessThan(0.5) // Sadness and anxiety typically have low dominance
  })

  it('should identify emotional patterns over time', () => {
    const emotionHistory = [
      {
        timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        emotions: [
          { type: 'frustration', confidence: 0.8, intensity: 0.7 },
          { type: 'anger', confidence: 0.6, intensity: 0.5 },
        ],
      },
      {
        timestamp: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
        emotions: [
          { type: 'frustration', confidence: 0.7, intensity: 0.6 },
          { type: 'disappointment', confidence: 0.8, intensity: 0.7 },
        ],
      },
      {
        timestamp: new Date().toISOString(), // Now
        emotions: [
          { type: 'calm', confidence: 0.6, intensity: 0.5 },
          { type: 'relief', confidence: 0.7, intensity: 0.6 },
        ],
      },
    ]

    const patterns = analyzer.identifyEmotionalPatterns(emotionHistory)

    expect(patterns).toBeDefined()
    expect(patterns.emotionTrends).toBeDefined()
    expect(patterns.emotionTrends.frustration).toBeDefined()
    expect(patterns.emotionTrends.frustration.trend).toBe('decreasing')
    expect(patterns.emotionTrends.anger).toBeDefined()
    expect(patterns.emotionTrends.anger.trend).toBe('disappeared')
    expect(patterns.emotionTrends.calm).toBeDefined()
    expect(patterns.emotionTrends.calm.trend).toBe('appeared')
    expect(patterns.overallMood).toBeDefined()
    expect(patterns.overallMood.trend).toBe('improving')
  })

  it('should detect conflicting emotions', () => {
    const mixedEmotions: EmotionData[] = [
      { type: 'happiness', confidence: 0.8, intensity: 0.7 },
      { type: 'anxiety', confidence: 0.7, intensity: 0.6 },
    ]

    const conflicts = analyzer.detectConflictingEmotions(mixedEmotions)

    expect(conflicts).toBeDefined()
    expect(conflicts.hasConflicts).toBe(true)
    expect(conflicts.conflicts).toHaveLength(1)
    expect(conflicts.conflicts[0]).toEqual({
      emotion1: 'happiness',
      emotion2: 'anxiety',
      conflictType: 'valence',
    })

    // Test non-conflicting emotions
    const harmonicEmotions: EmotionData[] = [
      { type: 'happiness', confidence: 0.8, intensity: 0.7 },
      { type: 'contentment', confidence: 0.7, intensity: 0.6 },
    ]

    const noConflicts = analyzer.detectConflictingEmotions(harmonicEmotions)

    expect(noConflicts).toBeDefined()
    expect(noConflicts.hasConflicts).toBe(false)
    expect(noConflicts.conflicts).toHaveLength(0)
  })

  it('should calculate emotional intensity', () => {
    const highIntensityEmotions: EmotionData[] = [
      { type: 'excitement', confidence: 0.9, intensity: 0.9 },
      { type: 'joy', confidence: 0.8, intensity: 0.8 },
    ]

    const highIntensity = analyzer.calculateEmotionalIntensity(
      highIntensityEmotions,
    )

    expect(highIntensity).toBeGreaterThan(0.7) // High intensity emotions should result in high intensity score

    const lowIntensityEmotions: EmotionData[] = [
      { type: 'contentment', confidence: 0.7, intensity: 0.4 },
      { type: 'mild_interest', confidence: 0.6, intensity: 0.3 },
    ]

    const lowIntensity =
      analyzer.calculateEmotionalIntensity(lowIntensityEmotions)

    expect(lowIntensity).toBeLessThan(0.5) // Low intensity emotions should result in low intensity score
  })

  it('should store emotion analysis results in the database', async () => {
    // Mock analysis result
    const analysisResult: EmotionAnalysis = {
      id: '',
      userId: 'user-store',
      timestamp: new Date().toISOString(),
      source: 'text',
      input: 'I am feeling happy today',
      emotions: [{ type: 'happiness', confidence: 0.9, intensity: 0.8 }],
      dimensions: { valence: 0.8, arousal: 0.6, dominance: 0.7 },
    }

    // Mock the database store function
    analyzer.database.storeEmotionAnalysis = vi
      .fn()
      .mockResolvedValue('analysis-id-456')

    const result = await analyzer.storeAnalysis(analysisResult)

    expect(result).toBe('analysis-id-456')
    expect(analyzer.database.storeEmotionAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: analysisResult.userId,
        source: analysisResult.source,
        emotions: analysisResult.emotions,
      }),
    )
  })

  it('should detect emotion changes between analyses', () => {
    const previousAnalysis = {
      emotions: [
        { type: 'frustration', confidence: 0.8, intensity: 0.7 },
        { type: 'disappointment', confidence: 0.7, intensity: 0.6 },
      ],
      dimensions: { valence: -0.7, arousal: 0.5, dominance: 0.4 },
    }

    const currentAnalysis = {
      emotions: [
        { type: 'hope', confidence: 0.7, intensity: 0.6 },
        { type: 'optimism', confidence: 0.6, intensity: 0.5 },
      ],
      dimensions: { valence: 0.6, arousal: 0.5, dominance: 0.6 },
    }

    const changes = analyzer.detectEmotionChanges(
      previousAnalysis,
      currentAnalysis,
    )

    expect(changes).toBeDefined()
    expect(changes.valenceChange).toBeGreaterThan(1) // Big improvement in valence
    expect(changes.arousalChange).toBeCloseTo(0) // Little change in arousal
    expect(changes.dominanceChange).toBeGreaterThan(0) // Some increase in dominance
    expect(changes.newEmotions).toContain('hope')
    expect(changes.newEmotions).toContain('optimism')
    expect(changes.disappearedEmotions).toContain('frustration')
    expect(changes.disappearedEmotions).toContain('disappointment')
    expect(changes.overallMoodShift).toBe('positive')
  })

  it('should combine emotions from multiple sources with appropriate weights', () => {
    const textAnalysis = {
      emotions: [{ type: 'joy', confidence: 0.9, intensity: 0.8 }],
      source: 'text',
    }

    const facialAnalysis = {
      emotions: [{ type: 'neutral', confidence: 0.8, intensity: 0.7 }],
      source: 'facial',
    }

    const voiceAnalysis = {
      emotions: [{ type: 'mild_excitement', confidence: 0.7, intensity: 0.6 }],
      source: 'voice',
    }

    const combined = analyzer.combineEmotionsFromSources([
      textAnalysis,
      facialAnalysis,
      voiceAnalysis,
    ])

    expect(combined).toBeDefined()
    expect(combined.emotions).toHaveLength(3)
    expect(combined.sources).toHaveLength(3)
    expect(combined.sources).toContain('text')
    expect(combined.sources).toContain('facial')
    expect(combined.sources).toContain('voice')

    // Check if the weights were applied correctly (based on default or specified weights)
    expect(
      combined.emotions.find((e: EmotionData) => e.type === 'joy'),
    ).toBeDefined()
    expect(
      combined.emotions.find((e: EmotionData) => e.type === 'neutral'),
    ).toBeDefined()
    expect(
      combined.emotions.find((e: EmotionData) => e.type === 'mild_excitement'),
    ).toBeDefined()
  })

  it('should handle empty or undefined emotion data gracefully', () => {
    const emptyEmotions: EmotionData[] = []

    // Test dimension calculation with empty emotions
    const dimensions = analyzer.calculateEmotionDimensions(emptyEmotions)

    expect(dimensions).toBeDefined()
    expect(dimensions.valence).toBe(0) // Neutral valence for empty emotions
    expect(dimensions.arousal).toBe(0) // Neutral arousal for empty emotions
    expect(dimensions.dominance).toBe(0.5) // Neutral dominance for empty emotions

    // Test intensity calculation with empty emotions
    const intensity = analyzer.calculateEmotionalIntensity(emptyEmotions)

    expect(intensity).toBe(0) // Zero intensity for empty emotions

    // Test conflicting emotions with empty emotions
    const conflicts = analyzer.detectConflictingEmotions(emptyEmotions)

    expect(conflicts).toBeDefined()
    expect(conflicts.hasConflicts).toBe(false)
    expect(conflicts.conflicts).toHaveLength(0)

    // Test with undefined emotions (should handle similarly to empty)
    const undefinedResult = analyzer.calculateEmotionDimensions(
      undefined as unknown as EmotionData[],
    )

    expect(undefinedResult).toBeDefined()
  })

  it('should handle errors during analysis gracefully', async () => {
    const text = 'This will cause an error'
    const userId = 'user-error'

    // Mock the language model to throw an error
    analyzer.llm.analyzeEmotionFromText = vi
      .fn()
      .mockRejectedValue(new Error('Language model unavailable'))

    // Should not throw but return a fallback analysis
    const result = await analyzer.analyzeText(text, userId)

    expect(result).toBeDefined()
    expect(result.emotions).toEqual([
      { type: 'neutral', confidence: 1.0, intensity: 0.5 },
    ])
    expect(result.error).toBeDefined()
    expect(result.error).toContain('Language model unavailable')
    expect(result.source).toBe('text')
    expect(result.input).toBe(text)
    expect(result.userId).toBe(userId)
  })

  it('should identify emotional contexts', () => {
    const emotionsInContext = [
      { type: 'anxiety', confidence: 0.8, intensity: 0.7 },
      { type: 'concern', confidence: 0.7, intensity: 0.6 },
    ]

    const context = 'User is preparing for an important job interview'

    const contextualAnalysis = analyzer.identifyEmotionalContext(
      emotionsInContext,
      context,
    )

    expect(contextualAnalysis).toBeDefined()
    expect(contextualAnalysis.context).toBe(context)
    expect(contextualAnalysis.appropriateness).toBe('appropriate')
    expect(contextualAnalysis.explanation).toBeDefined()
    expect(contextualAnalysis.explanation).toContain('interview')

    // Test inappropriate emotions for context
    const inappropriateEmotions = [
      { type: 'amusement', confidence: 0.9, intensity: 0.8 },
      { type: 'excitement', confidence: 0.8, intensity: 0.7 },
    ]

    const seriousContext = 'User is attending a funeral'

    const inappropriateAnalysis = analyzer.identifyEmotionalContext(
      inappropriateEmotions,
      seriousContext,
    )

    expect(inappropriateAnalysis).toBeDefined()
    expect(inappropriateAnalysis.context).toBe(seriousContext)
    expect(inappropriateAnalysis.appropriateness).toBe('inappropriate')
    expect(inappropriateAnalysis.explanation).toBeDefined()
    expect(inappropriateAnalysis.explanation).toContain('funeral')
  })

  it('should map emotions to a standardized emotion model', () => {
    // Test with a variety of emotion terms, including non-standard ones
    const mixedEmotions = [
      { type: 'joy', confidence: 0.9, intensity: 0.8 },
      { type: 'over_the_moon', confidence: 0.8, intensity: 0.9 }, // Non-standard term
      { type: 'slight_annoyance', confidence: 0.6, intensity: 0.4 }, // Non-standard term
      { type: 'anger', confidence: 0.7, intensity: 0.6 },
    ]

    const standardized = analyzer.standardizeEmotionLabels(mixedEmotions)

    expect(standardized).toBeDefined()
    expect(standardized).toHaveLength(mixedEmotions.length)

    // Non-standard terms should be mapped to their closest standard equivalent
    expect(
      standardized.find((e: EmotionData) => e.type === 'joy'),
    ).toBeDefined()
    expect(
      standardized.find((e: EmotionData) => e.type === 'happiness'),
    ).toBeDefined() // mapped from over_the_moon
    expect(
      standardized.find((e: EmotionData) => e.type === 'irritation'),
    ).toBeDefined() // mapped from slight_annoyance
    expect(
      standardized.find((e: EmotionData) => e.type === 'anger'),
    ).toBeDefined()

    // Original confidence and intensity should be preserved
    const originalJoy = mixedEmotions.find((e: EmotionData) => e.type === 'joy')
    const standardizedJoy = standardized.find(
      (e: EmotionData) => e.type === 'joy',
    )
    expect(standardizedJoy?.confidence).toBe(originalJoy?.confidence)
    expect(standardizedJoy?.intensity).toBe(originalJoy?.intensity)
  })
})
