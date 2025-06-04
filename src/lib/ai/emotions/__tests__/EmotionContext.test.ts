import { EmotionContext } from '../EmotionContext'
import type { EmotionData, EmotionDimensions, UserPreference } from '../types'

describe('EmotionContext', () => {
  let context: EmotionContext

  beforeEach(() => {
    context = new EmotionContext()

    // Mock the database methods
    vi.mock('../database', () => ({
      getUserEmotionHistory: vi.fn().mockResolvedValue([]),
      getUserPreferences: vi.fn().mockResolvedValue({
        userId: 'user-123',
        responseStyle: 'balanced',
        emotionalExpressiveness: 0.7,
        culturalContext: 'western',
        accessibilityNeeds: [],
      }),
    }))
  })

  it('should create an instance of EmotionContext', () => {
    expect(context).toBeInstanceOf(EmotionContext)
  })

  it('should retrieve user emotion history from database', async () => {
    const userId = 'user-123'
    const mockHistory = [
      {
        id: 'analysis-1',
        userId,
        timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        source: 'text',
        emotions: [{ type: 'happiness', confidence: 0.8, intensity: 0.7 }],
        dimensions: { valence: 0.7, arousal: 0.6, dominance: 0.6 },
      },
      {
        id: 'analysis-2',
        userId,
        timestamp: new Date().toISOString(), // now
        source: 'facial',
        emotions: [{ type: 'neutral', confidence: 0.9, intensity: 0.5 }],
        dimensions: { valence: 0.1, arousal: 0.2, dominance: 0.5 },
      },
    ]

    context.database.getUserEmotionHistory = vi
      .fn()
      .mockResolvedValue(mockHistory)

    const history = await context.getUserEmotionHistory(userId)

    expect(history).toEqual(mockHistory)
    expect(context.database.getUserEmotionHistory).toHaveBeenCalledWith(userId)
  })

  it('should retrieve user preferences from database', async () => {
    const userId = 'user-123'
    const mockPreferences: UserPreference = {
      userId,
      responseStyle: 'empathetic',
      emotionalExpressiveness: 0.8,
      culturalContext: 'eastern',
      accessibilityNeeds: ['visual'],
    }

    context.database.getUserPreferences = vi
      .fn()
      .mockResolvedValue(mockPreferences)

    const preferences = await context.getUserPreferences(userId)

    expect(preferences).toEqual(mockPreferences)
    expect(context.database.getUserPreferences).toHaveBeenCalledWith(userId)
  })

  it('should update user preferences in database', async () => {
    const userId = 'user-123'
    const updatedPrefs: UserPreference = {
      userId,
      responseStyle: 'direct',
      emotionalExpressiveness: 0.5,
      culturalContext: 'western',
      accessibilityNeeds: [],
    }

    context.database.updateUserPreferences = vi.fn().mockResolvedValue(true)

    const result = await context.updateUserPreferences(updatedPrefs)

    expect(result).toBe(true)
    expect(context.database.updateUserPreferences).toHaveBeenCalledWith(
      updatedPrefs,
    )
  })

  it('should detect mood trends from emotional history', async () => {
    const userId = 'user-123'
    const mockHistory = [
      {
        id: 'analysis-1',
        userId,
        timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        source: 'text',
        emotions: [
          { type: 'sadness', confidence: 0.8, intensity: 0.7 },
          { type: 'anxiety', confidence: 0.7, intensity: 0.6 },
        ],
        dimensions: { valence: -0.7, arousal: 0.5, dominance: 0.3 },
      },
      {
        id: 'analysis-2',
        userId,
        timestamp: new Date(Date.now() - 43200000).toISOString(), // 12 hours ago
        source: 'text',
        emotions: [
          { type: 'mild_frustration', confidence: 0.6, intensity: 0.5 },
          { type: 'hope', confidence: 0.5, intensity: 0.4 },
        ],
        dimensions: { valence: -0.3, arousal: 0.4, dominance: 0.4 },
      },
      {
        id: 'analysis-3',
        userId,
        timestamp: new Date().toISOString(), // now
        source: 'text',
        emotions: [
          { type: 'contentment', confidence: 0.7, intensity: 0.6 },
          { type: 'optimism', confidence: 0.6, intensity: 0.5 },
        ],
        dimensions: { valence: 0.6, arousal: 0.3, dominance: 0.6 },
      },
    ]

    context.database.getUserEmotionHistory = vi
      .fn()
      .mockResolvedValue(mockHistory)

    const trends = await context.detectMoodTrends(userId)

    expect(trends).toBeDefined()
    expect(trends.overallMood).toBeDefined()
    expect(trends.overallMood.trend).toBe('improving')
    expect(trends.valence.trend).toBe('increasing')
    expect(trends.arousal.trend).toBe('decreasing')
    expect(trends.dominance.trend).toBe('increasing')
    expect(trends.emotionShifts).toContainEqual({
      from: 'sadness',
      to: 'contentment',
      magnitude: expect.any(Number),
    })
  })

  it('should detect consistent emotional patterns', async () => {
    const userId = 'user-123'
    const mockHistory = Array(10)
      .fill(null)
      .map((_, i) => ({
        id: `analysis-${i}`,
        userId,
        timestamp: new Date(Date.now() - (10 - i) * 86400000).toISOString(),
        source: 'text',
        emotions: [
          {
            type: 'anxiety',
            confidence: 0.7 + i * 0.02,
            intensity: 0.6 + i * 0.02,
          },
        ],
        dimensions: {
          valence: -0.4 - i * 0.02,
          arousal: 0.6 + i * 0.02,
          dominance: 0.3 - i * 0.01,
        },
      }))

    context.database.getUserEmotionHistory = vi
      .fn()
      .mockResolvedValue(mockHistory)

    const patterns = await context.detectEmotionalPatterns(userId)

    expect(patterns).toBeDefined()
    expect(patterns.consistentEmotions).toContain('anxiety')
    expect(patterns.intensifyingEmotions).toContain('anxiety')
    expect(patterns.dimensionalTrends.valence).toBe('decreasing')
    expect(patterns.dimensionalTrends.arousal).toBe('increasing')
    expect(patterns.dimensionalTrends.dominance).toBe('decreasing')
    expect(patterns.potentialConcerns).toBeDefined()
    expect(patterns.potentialConcerns).toContain('anxiety')
  })

  it('should determine appropriate response style based on context', () => {
    const emotionData: EmotionData[] = [
      { type: 'grief', confidence: 0.9, intensity: 0.8 },
      { type: 'sadness', confidence: 0.8, intensity: 0.7 },
    ]

    const dimensions: EmotionDimensions = {
      valence: -0.8,
      arousal: 0.3,
      dominance: 0.2,
    }

    const situation = 'User has mentioned a recent loss'

    const responseStyle = context.determineResponseStyle(
      emotionData,
      dimensions,
      situation,
    )

    expect(responseStyle).toBeDefined()
    expect(responseStyle.verbal).toBe('empathetic')
    expect(responseStyle.nonverbal).toBe('gentle')
    expect(responseStyle.intensity).toBeLessThan(0.6) // Should be restrained/gentle for grief
    expect(responseStyle.matchEmotionalTone).toBe(true)
    expect(responseStyle.explanation).toBeDefined()
    expect(responseStyle.explanation).toContain('loss')
  })

  it('should adjust response based on user preferences', async () => {
    const userId = 'user-123'
    const baseResponseStyle = {
      verbal: 'balanced',
      nonverbal: 'moderate',
      intensity: 0.6,
      matchEmotionalTone: true,
      explanation: 'Default style based on detected emotions',
    }

    // Mock user preferences
    const userPrefs: UserPreference = {
      userId,
      responseStyle: 'direct',
      emotionalExpressiveness: 0.3, // Low expressiveness
      culturalContext: 'western',
      accessibilityNeeds: [],
    }

    context.database.getUserPreferences = vi.fn().mockResolvedValue(userPrefs)

    const adjustedStyle = await context.adjustForUserPreferences(
      userId,
      baseResponseStyle,
    )

    expect(adjustedStyle).toBeDefined()
    expect(adjustedStyle.verbal).toBe('direct') // Should match user preference
    expect(adjustedStyle.intensity).toBeLessThan(baseResponseStyle.intensity) // Should be reduced
    expect(adjustedStyle.matchEmotionalTone).toBe(false) // Direct style typically doesn't match tone
  })

  it('should consider cultural context in response adaptation', async () => {
    const userId = 'user-east'
    const emotions: EmotionData[] = [
      { type: 'pride', confidence: 0.8, intensity: 0.7 },
      { type: 'joy', confidence: 0.9, intensity: 0.8 },
    ]

    // Mock eastern cultural context
    const easternPrefs: UserPreference = {
      userId,
      responseStyle: 'balanced',
      emotionalExpressiveness: 0.7,
      culturalContext: 'eastern',
      accessibilityNeeds: [],
    }

    context.database.getUserPreferences = vi
      .fn()
      .mockResolvedValue(easternPrefs)

    const adaptation = await context.adaptToCulturalContext(userId, emotions)

    expect(adaptation).toBeDefined()
    expect(adaptation.adaptedEmotions).toBeDefined()
    expect(
      adaptation.adaptedEmotions.find((e) => e.type === 'humility'),
    ).toBeDefined() // Eastern cultures may temper pride with humility
    expect(adaptation.culturalNotes).toBeDefined()
    expect(adaptation.culturalNotes).toContain('eastern')

    // Test with western context
    const userId2 = 'user-west'
    const westernPrefs: UserPreference = {
      userId: userId2,
      responseStyle: 'balanced',
      emotionalExpressiveness: 0.7,
      culturalContext: 'western',
      accessibilityNeeds: [],
    }

    context.database.getUserPreferences = vi
      .fn()
      .mockResolvedValue(westernPrefs)

    const adaptation2 = await context.adaptToCulturalContext(userId2, emotions)

    expect(adaptation2).toBeDefined()
    expect(adaptation2.adaptedEmotions).toBeDefined()
    // Pride more likely to remain in Western context
    expect(
      adaptation2.adaptedEmotions.find((e) => e.type === 'pride'),
    ).toBeDefined()
  })

  it('should detect emotional triggers from historical data', async () => {
    const userId = 'user-123'
    const mockHistory = [
      {
        id: 'analysis-1',
        userId,
        timestamp: new Date(Date.now() - 86400000 * 10).toISOString(),
        source: 'text',
        input: 'I have to give a presentation tomorrow',
        emotions: [{ type: 'anxiety', confidence: 0.8, intensity: 0.7 }],
      },
      {
        id: 'analysis-2',
        userId,
        timestamp: new Date(Date.now() - 86400000 * 5).toISOString(),
        source: 'text',
        input: 'My presentation is scheduled for next week',
        emotions: [{ type: 'anxiety', confidence: 0.7, intensity: 0.6 }],
      },
      {
        id: 'analysis-3',
        userId,
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        source: 'text',
        input: "I'm going to the beach this weekend",
        emotions: [{ type: 'excitement', confidence: 0.8, intensity: 0.7 }],
      },
    ]

    context.database.getUserEmotionHistory = vi
      .fn()
      .mockResolvedValue(mockHistory)

    const triggers = await context.detectEmotionalTriggers(userId)

    expect(triggers).toBeDefined()
    expect(triggers).toHaveLength(1) // Should detect 'presentation' as trigger
    expect(triggers[0].trigger).toContain('presentation')
    expect(triggers[0].associatedEmotion).toBe('anxiety')
    expect(triggers[0].frequency).toBe(2)
    expect(triggers[0].averageIntensity).toBeGreaterThan(0.6)
  })

  it('should evaluate conversation context for emotional appropriateness', () => {
    const conversationContext = {
      setting: 'professional',
      participants: ['user', 'assistant'],
      topic: 'quarterly business review',
      previousMessages: [
        { sender: 'user', content: 'The numbers look worse than expected.' },
        {
          sender: 'assistant',
          content:
            'I understand this is disappointing. What aspects concern you most?',
        },
      ],
    }

    const emotionData: EmotionData[] = [
      { type: 'disappointment', confidence: 0.8, intensity: 0.7 },
      { type: 'concern', confidence: 0.7, intensity: 0.6 },
    ]

    const evaluation = context.evaluateConversationContext(
      conversationContext,
      emotionData,
    )

    expect(evaluation).toBeDefined()
    expect(evaluation.appropriateness).toBe('appropriate')
    expect(evaluation.setting).toBe('professional')
    expect(evaluation.suggestedResponses).toBeDefined()
    expect(evaluation.suggestedResponses.length).toBeGreaterThan(0)

    // Test with inappropriate emotions
    const inappropriateEmotions: EmotionData[] = [
      { type: 'amusement', confidence: 0.9, intensity: 0.8 },
      { type: 'excitement', confidence: 0.8, intensity: 0.7 },
    ]

    const inappropriateEval = context.evaluateConversationContext(
      conversationContext,
      inappropriateEmotions,
    )

    expect(inappropriateEval).toBeDefined()
    expect(inappropriateEval.appropriateness).toBe('inappropriate')
    expect(inappropriateEval.setting).toBe('professional')
    expect(inappropriateEval.suggestedResponses).toBeDefined()
    expect(inappropriateEval.suggestedResponses.length).toBeGreaterThan(0)
    expect(inappropriateEval.explanation).toBeDefined()
    expect(inappropriateEval.explanation).toContain('professional')
  })

  it('should handle accessibility needs in response context', async () => {
    const userId = 'user-accessibility'
    const userPrefs: UserPreference = {
      userId,
      responseStyle: 'balanced',
      emotionalExpressiveness: 0.7,
      culturalContext: 'western',
      accessibilityNeeds: ['visual', 'cognitive'],
    }

    context.database.getUserPreferences = vi.fn().mockResolvedValue(userPrefs)

    const baseResponseStyle = {
      verbal: 'descriptive',
      nonverbal: 'animated',
      intensity: 0.8,
      matchEmotionalTone: true,
      explanation: 'Default style based on detected emotions',
    }

    const adaptedStyle = await context.adaptForAccessibilityNeeds(
      userId,
      baseResponseStyle,
    )

    expect(adaptedStyle).toBeDefined()
    expect(adaptedStyle.verbal).toBe('clear') // Should be clearer for cognitive needs
    expect(adaptedStyle.nonverbal).toBe('descriptive') // Should be descriptive for visual needs
    expect(adaptedStyle.adaptations).toBeDefined()
    expect(adaptedStyle.adaptations.includes('visual')).toBe(true)
    expect(adaptedStyle.adaptations.includes('cognitive')).toBe(true)
  })

  it('should track emotional state changes within a session', async () => {
    const userId = 'user-session'
    const sessionId = 'session-123'

    // Start with neutral/slightly negative state
    await context.trackEmotionalState(userId, sessionId, {
      emotions: [{ type: 'mild_concern', confidence: 0.6, intensity: 0.5 }],
      dimensions: { valence: -0.2, arousal: 0.3, dominance: 0.5 },
      timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    })

    // Update to more positive state
    await context.trackEmotionalState(userId, sessionId, {
      emotions: [
        { type: 'relief', confidence: 0.7, intensity: 0.6 },
        { type: 'happiness', confidence: 0.6, intensity: 0.5 },
      ],
      dimensions: { valence: 0.6, arousal: 0.4, dominance: 0.6 },
      timestamp: new Date().toISOString(), // now
    })

    const sessionData = await context.getSessionEmotionalState(
      userId,
      sessionId,
    )

    expect(sessionData).toBeDefined()
    expect(sessionData.userId).toBe(userId)
    expect(sessionData.sessionId).toBe(sessionId)
    expect(sessionData.states).toHaveLength(2)
    expect(sessionData.emotionalTrajectory).toBeDefined()
    expect(sessionData.emotionalTrajectory.valence).toBe('improving')
    expect(sessionData.currentState.dimensions.valence).toBeGreaterThan(0)
  })

  it('should generate appropriate contextual hints based on emotional state', async () => {
    const userId = 'user-123'
    const sessionId = 'session-123'

    const currentState = {
      emotions: [
        { type: 'anxiety', confidence: 0.8, intensity: 0.7 },
        { type: 'hope', confidence: 0.6, intensity: 0.5 },
      ],
      dimensions: { valence: -0.2, arousal: 0.6, dominance: 0.4 },
      timestamp: new Date().toISOString(),
    }

    // Mock session history
    context.getSessionEmotionalState = vi.fn().mockResolvedValue({
      userId,
      sessionId,
      states: [currentState],
      emotionalTrajectory: {
        valence: 'stable',
        arousal: 'stable',
        dominance: 'stable',
      },
      currentState,
    })

    // Mock known triggers
    context.detectEmotionalTriggers = vi.fn().mockResolvedValue([
      {
        trigger: 'deadlines',
        associatedEmotion: 'anxiety',
        frequency: 3,
        averageIntensity: 0.7,
      },
    ])

    const hints = await context.generateContextualHints(userId, sessionId)

    expect(hints).toBeDefined()
    expect(hints.emotionalState).toEqual(currentState)
    expect(hints.recommendedApproach).toBeDefined()
    expect(hints.recommendedApproach).toContain('anxiety')
    expect(hints.potentialTriggers).toContain('deadlines')
    expect(hints.supportiveResponses).toBeDefined()
    expect(hints.supportiveResponses.length).toBeGreaterThan(0)
  })

  it('should handle empty or missing data gracefully', async () => {
    const userId = 'user-empty'

    // Mock empty history
    context.database.getUserEmotionHistory = vi.fn().mockResolvedValue([])

    // Should not throw but return default/empty results
    const trends = await context.detectMoodTrends(userId)

    expect(trends).toBeDefined()
    expect(trends.overallMood).toBeDefined()
    expect(trends.overallMood.trend).toBe('neutral')

    // Test with non-existent user
    const nonExistentId = 'user-nonexistent'

    // Mock database error
    context.database.getUserPreferences = vi
      .fn()
      .mockRejectedValue(new Error('User not found'))

    // Should not throw but return default preferences
    const preferences = await context.getUserPreferences(nonExistentId)

    expect(preferences).toBeDefined()
    expect(preferences.userId).toBe(nonExistentId)
    expect(preferences.responseStyle).toBe('balanced') // Default style
  })

  it('should predict future emotional states based on patterns', async () => {
    const userId = 'user-predict'
    const mockHistory = Array(5)
      .fill(null)
      .map((_, i) => ({
        id: `analysis-${i}`,
        userId,
        timestamp: new Date(Date.now() - (5 - i) * 86400000).toISOString(),
        emotions: [
          {
            type: 'anxiety',
            confidence: 0.7,
            intensity: Math.max(0.3, Math.min(0.9, 0.7 - i * 0.1)), // Decreasing anxiety
          },
          {
            type: 'confidence',
            confidence: 0.6,
            intensity: Math.max(0.3, Math.min(0.9, 0.3 + i * 0.1)), // Increasing confidence
          },
        ],
        dimensions: {
          valence: -0.3 + i * 0.15, // Increasing valence
          arousal: 0.6,
          dominance: 0.3 + i * 0.1, // Increasing dominance
        },
      }))

    context.database.getUserEmotionHistory = vi
      .fn()
      .mockResolvedValue(mockHistory)

    const prediction = await context.predictEmotionalState(userId)

    expect(prediction).toBeDefined()
    expect(prediction.predictedEmotions).toBeDefined()
    expect(prediction.predictedDimensions).toBeDefined()
    expect(prediction.confidence).toBeGreaterThan(0)
    expect(
      prediction.predictedEmotions.find((e) => e.type === 'anxiety')?.intensity,
    ).toBeLessThan(mockHistory[4].emotions[0].intensity) // Anxiety should continue decreasing
    expect(
      prediction.predictedEmotions.find((e) => e.type === 'confidence')
        ?.intensity,
    ).toBeGreaterThan(mockHistory[4].emotions[1].intensity) // Confidence should continue increasing
    expect(prediction.predictedDimensions.valence).toBeGreaterThan(
      mockHistory[4].dimensions.valence,
    ) // Valence should continue increasing
  })
})
