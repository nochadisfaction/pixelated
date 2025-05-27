import { EmotionAlertSystem } from '../EmotionAlertSystem'
import type { EmotionAlert } from '../EmotionAlertSystem'
import { AlertLevel, AlertType } from '../EmotionAlertSystem'
import type { EmotionAnalysis } from '../types'
import type { DimensionalMapping } from '../MultidimensionalEmotionMapper'

describe('EmotionAlertSystem', () => {
  let alertSystem: EmotionAlertSystem

  beforeEach(() => {
    alertSystem = new EmotionAlertSystem()

    // Mock the dependencies if needed
    vi.mock('../database', () => ({
      storeAlert: vi.fn().mockResolvedValue(true),
      fetchPreviousAnalyses: vi.fn().mockResolvedValue([]),
    }))
  })

  it('should create an instance of EmotionAlertSystem', () => {
    expect(alertSystem).toBeInstanceOf(EmotionAlertSystem)
  })

  it('should not generate an alert for normal emotion patterns', () => {
    const mockAnalysis: EmotionAnalysis = {
      id: 'analysis-123',
      userId: 'user-123',
      timestamp: new Date().toISOString(),
      source: 'text',
      content: 'I am feeling good today',
      emotions: [
        { type: 'joy', confidence: 0.85, intensity: 0.7 },
        { type: 'contentment', confidence: 0.75, intensity: 0.6 },
      ],
      overallSentiment: 0.7,
      riskFactors: [],
    }

    const mockMapping: DimensionalMapping = {
      id: 'mapping-123',
      analysisId: 'analysis-123',
      dimensions: {
        valence: 0.7,
        arousal: 0.3,
        dominance: 0.5,
      },
      quadrant: 'positive-low',
      dominantDimension: 'valence',
    }

    const alert = alertSystem.detectCrisis(
      {
        analysis: mockAnalysis,
        dimensionalMapping: mockMapping,
        baselineDeviation: 0.1,
        normalized: true,
      },
      'user-123',
    )

    expect(alert).toBeNull()
  })

  it('should generate a high-risk alert for severe negative emotions', () => {
    const mockAnalysis: EmotionAnalysis = {
      id: 'analysis-456',
      userId: 'user-123',
      timestamp: new Date().toISOString(),
      source: 'text',
      content:
        "I feel completely hopeless and don't see any reason to continue",
      emotions: [
        { type: 'despair', confidence: 0.92, intensity: 0.9 },
        { type: 'hopelessness', confidence: 0.88, intensity: 0.85 },
        { type: 'depression', confidence: 0.85, intensity: 0.8 },
      ],
      overallSentiment: -0.85,
      riskFactors: ['suicidal_ideation', 'severe_depression'],
    }

    const mockMapping: DimensionalMapping = {
      id: 'mapping-456',
      analysisId: 'analysis-456',
      dimensions: {
        valence: -0.9,
        arousal: -0.7,
        dominance: -0.8,
      },
      quadrant: 'negative-low',
      dominantDimension: 'valence',
    }

    const alert = alertSystem.detectCrisis(
      {
        analysis: mockAnalysis,
        dimensionalMapping: mockMapping,
        baselineDeviation: 0.8,
        normalized: true,
      },
      'user-123',
    )

    expect(alert).not.toBeNull()
    expect(alert?.level).toBe(AlertLevel.HIGH)
    expect(alert?.type).toBe(AlertType.EMOTIONAL_CRISIS)
    expect(alert?.recommendedActions).toBeDefined()
    expect(alert?.recommendedActions?.length).toBeGreaterThan(0)
  })

  it('should generate a medium-risk alert for moderate anxiety patterns', () => {
    const mockAnalysis: EmotionAnalysis = {
      id: 'analysis-789',
      userId: 'user-123',
      timestamp: new Date().toISOString(),
      source: 'text',
      content:
        "I'm feeling really anxious about everything lately and can't seem to calm down",
      emotions: [
        { type: 'anxiety', confidence: 0.85, intensity: 0.7 },
        { type: 'worry', confidence: 0.8, intensity: 0.75 },
        { type: 'fear', confidence: 0.6, intensity: 0.5 },
      ],
      overallSentiment: -0.6,
      riskFactors: ['anxiety_pattern'],
    }

    const mockMapping: DimensionalMapping = {
      id: 'mapping-789',
      analysisId: 'analysis-789',
      dimensions: {
        valence: -0.6,
        arousal: 0.7,
        dominance: -0.4,
      },
      quadrant: 'negative-high',
      dominantDimension: 'arousal',
    }

    const alert = alertSystem.detectCrisis(
      {
        analysis: mockAnalysis,
        dimensionalMapping: mockMapping,
        baselineDeviation: 0.5,
        normalized: true,
      },
      'user-123',
    )

    expect(alert).not.toBeNull()
    expect(alert?.level).toBe(AlertLevel.MEDIUM)
    expect(alert?.type).toBe(AlertType.ANXIETY_PATTERN)
    expect(alert?.description).toContain('anxiety')
  })

  it('should generate a low-risk alert for significant baseline deviation', () => {
    const mockAnalysis: EmotionAnalysis = {
      id: 'analysis-101',
      userId: 'user-123',
      timestamp: new Date().toISOString(),
      source: 'text',
      content: "I don't feel like myself today",
      emotions: [
        { type: 'sadness', confidence: 0.7, intensity: 0.5 },
        { type: 'confusion', confidence: 0.6, intensity: 0.4 },
      ],
      overallSentiment: -0.3,
      riskFactors: [],
    }

    const mockMapping: DimensionalMapping = {
      id: 'mapping-101',
      analysisId: 'analysis-101',
      dimensions: {
        valence: -0.3,
        arousal: -0.2,
        dominance: 0.0,
      },
      quadrant: 'negative-low',
      dominantDimension: 'valence',
    }

    const alert = alertSystem.detectCrisis(
      {
        analysis: mockAnalysis,
        dimensionalMapping: mockMapping,
        baselineDeviation: 0.4, // Significant deviation from baseline
        normalized: true,
      },
      'user-123',
    )

    expect(alert).not.toBeNull()
    expect(alert?.level).toBe(AlertLevel.LOW)
    expect(alert?.type).toBe(AlertType.BASELINE_DEVIATION)
  })

  it('should consider previous analyses when detecting patterns', async () => {
    // Mock previous analyses with consistent anxiety patterns
    const previousAnalyses = [
      {
        analysis: {
          id: 'prev-1',
          userId: 'user-123',
          timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          emotions: [{ type: 'anxiety', confidence: 0.8, intensity: 0.6 }],
          overallSentiment: -0.5,
          riskFactors: ['anxiety_pattern'],
        },
        dimensionalMapping: {
          dimensions: { valence: -0.5, arousal: 0.6 },
          quadrant: 'negative-high',
        },
      },
      {
        analysis: {
          id: 'prev-2',
          userId: 'user-123',
          timestamp: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
          emotions: [{ type: 'anxiety', confidence: 0.75, intensity: 0.55 }],
          overallSentiment: -0.45,
          riskFactors: ['anxiety_pattern'],
        },
        dimensionalMapping: {
          dimensions: { valence: -0.45, arousal: 0.55 },
          quadrant: 'negative-high',
        },
      },
    ]

    // Mock the database function to return our test data
    vi.mocked(alertSystem.database.fetchPreviousAnalyses).mockResolvedValue(
      previousAnalyses,
    )

    const mockAnalysis: EmotionAnalysis = {
      id: 'analysis-pattern',
      userId: 'user-123',
      timestamp: new Date().toISOString(),
      source: 'text',
      content: 'Still feeling anxious today',
      emotions: [{ type: 'anxiety', confidence: 0.7, intensity: 0.5 }],
      overallSentiment: -0.4,
      riskFactors: ['anxiety_pattern'],
    }

    const mockMapping: DimensionalMapping = {
      id: 'mapping-pattern',
      analysisId: 'analysis-pattern',
      dimensions: {
        valence: -0.4,
        arousal: 0.5,
        dominance: -0.3,
      },
      quadrant: 'negative-high',
      dominantDimension: 'arousal',
    }

    // Test with provided previous analyses
    const alert = await alertSystem.detectPatterns(
      {
        analysis: mockAnalysis,
        dimensionalMapping: mockMapping,
        baselineDeviation: 0.3,
        normalized: true,
      },
      'user-123',
      previousAnalyses,
    )

    expect(alert).not.toBeNull()
    expect(alert?.level).toBe(AlertLevel.MEDIUM)
    expect(alert?.type).toBe(AlertType.PERSISTENT_PATTERN)
    expect(alert?.description).toContain('consistent')
  })

  it('should acknowledge an alert', async () => {
    const mockAlert: EmotionAlert = {
      id: 'alert-123',
      userId: 'user-123',
      analysisId: 'analysis-123',
      timestamp: new Date().toISOString(),
      level: AlertLevel.MEDIUM,
      type: AlertType.ANXIETY_PATTERN,
      title: 'Potential Anxiety Pattern Detected',
      description: 'Analysis indicates a potential anxiety pattern',
      recommendedActions: ['Consider scheduling a check-in'],
      acknowledged: false,
    }

    // Mock the acknowledgeAlert method
    alertSystem.database.updateAlertStatus = vi.fn().mockResolvedValue(true)

    const result = await alertSystem.acknowledgeAlert(mockAlert.id, 'user-123')

    expect(result).toBe(true)
    expect(alertSystem.database.updateAlertStatus).toHaveBeenCalledWith(
      mockAlert.id,
      'user-123',
      true,
    )
  })
})
