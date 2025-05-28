/**
 * Real-Time Intervention Engine Test Suite
 *
 * Comprehensive tests for the advanced real-time intervention system
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  RealTimeInterventionEngine,
  createRealTimeInterventionEngine,
  performQuickRiskAssessment,
  type RealTimeSession,
  type RiskLevel,
} from '../RealTimeInterventionEngine'

import type { CognitiveModel } from '../../types/CognitiveModel'
import type { EmotionDetectionEngine } from '../../emotions/EmotionDetectionEngine'
import type { InterventionAnalysisService } from '../../services/intervention-analysis'
import type { ContextualEnhancementService } from '../ContextualEnhancementService'

// Mock dependencies
vi.mock('../../logging', () => ({
  getLogger: vi.fn(() => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}))

// Mock services - Create proper vitest mocks with type assertions
const mockEmotionEngine = {
  detectEmotionsFromText: vi.fn(),
  detectEmotionsFromTextRealTime: vi.fn(),
} as {
  detectEmotionsFromText: ReturnType<typeof vi.fn>
  detectEmotionsFromTextRealTime: ReturnType<typeof vi.fn>
}

const mockInterventionAnalysis = {
  analyzeIntervention: vi.fn(),
} as {
  analyzeIntervention: ReturnType<typeof vi.fn>
}

const mockContextualEnhancement = {
  gatherContextualFactors: vi.fn(),
  generateContextualIntervention: vi.fn(),
} as {
  gatherContextualFactors: ReturnType<typeof vi.fn>
  generateContextualIntervention: ReturnType<typeof vi.fn>
}

describe('RealTimeInterventionEngine', () => {
  let engine: RealTimeInterventionEngine
  let mockCognitiveModel: CognitiveModel

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup mock cognitive model
    mockCognitiveModel = {
      id: 'test-model',
      name: 'Test Patient',
      demographicInfo: {
        age: 30,
        gender: 'female',
        occupation: 'teacher',
        familyStatus: 'married',
      },
      presentingIssues: ['anxiety', 'depression'],
      diagnosisInfo: {
        primaryDiagnosis: 'Major Depressive Disorder',
        severity: 'moderate',
      },
      coreBeliefs: [
        {
          id: 'belief-1',
          belief: 'I am worthless',
          strength: 8,
          evidence: ['Failed at job'],
          relatedDomains: ['self-worth', 'achievement'],
        },
      ],
      distortionPatterns: [
        {
          type: 'all-or-nothing',
          examples: ['Either I succeed perfectly or I fail completely'],
          triggerThemes: ['criticism', 'performance evaluation'],
          frequency: 'frequent',
        },
      ],
      behavioralPatterns: [],
      emotionalPatterns: [],
      relationshipPatterns: [],
      formativeExperiences: [],
      therapyHistory: {
        previousApproaches: ['CBT'],
        helpfulInterventions: ['thought challenging'],
        unhelpfulInterventions: [],
        insights: [],
        progressMade: 'minimal',
        remainingChallenges: ['negative self-talk'],
      },
      conversationalStyle: {
        verbosity: 5,
        emotionalExpressiveness: 6,
        resistance: 4,
        insightLevel: 5,
        preferredCommunicationModes: ['direct questions'],
      },
      goalsForTherapy: ['reduce anxiety', 'improve self-esteem'],
      therapeuticProgress: {
        insights: [],
        resistanceLevel: 4,
        changeReadiness: 'contemplation',
        sessionProgressLog: [],
      },
    }

    // Setup mock emotion analysis
    mockEmotionEngine.detectEmotionsFromText.mockResolvedValue({
      id: 'emotion-analysis-1',
      timestamp: new Date().toISOString(),
      emotions: [
        { type: 'sad', intensity: 0.6, confidence: 0.8 },
        { type: 'anxious', intensity: 0.4, confidence: 0.7 },
      ],
      userId: 'test-user',
      source: 'text',
      input: 'test input',
      overallSentiment: -0.3,
      riskFactors: [],
      contextualFactors: [],
      requiresAttention: false,
    })

    engine = createRealTimeInterventionEngine(
      mockEmotionEngine as unknown as EmotionDetectionEngine,
      mockInterventionAnalysis as unknown as InterventionAnalysisService,
      mockContextualEnhancement as unknown as ContextualEnhancementService,
    )
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Session Initialization', () => {
    it('should initialize a new real-time session successfully', async () => {
      const sessionId = 'test-session-1'
      const clientId = 'test-client-1'
      const therapistId = 'test-therapist-1'

      const session = await engine.initializeSession(
        sessionId,
        clientId,
        therapistId,
        mockCognitiveModel,
      )

      expect(session).toBeDefined()
      expect(session.sessionId).toBe(sessionId)
      expect(session.clientId).toBe(clientId)
      expect(session.therapistId).toBe(therapistId)
      expect(session.currentPhase).toBe('opening')
      expect(session.riskLevel).toBe('minimal')
      expect(session.interventionHistory).toEqual([])
      expect(session.contextualFactors.emotionalBaseline).toBeDefined()
      expect(session.contextualFactors.therapeuticAlliance).toBe(0.5) // Higher with cognitive model
    })

    it('should initialize session without cognitive model', async () => {
      const session = await engine.initializeSession(
        'test-session-2',
        'test-client-2',
        'test-therapist-2',
      )

      expect(session.contextualFactors.therapeuticAlliance).toBe(0.3) // Lower without model
      expect(
        session.contextualFactors.emotionalBaseline.emotions,
      ).toContainEqual(expect.objectContaining({ emotion: 'neutral' }))
    })

    it('should handle initialization errors gracefully', async () => {
      mockEmotionEngine.detectEmotionsFromText.mockRejectedValue(
        new Error('Emotion analysis failed'),
      )

      await expect(
        engine.initializeSession(
          'test-session-3',
          'test-client-3',
          'test-therapist-3',
        ),
      ).rejects.toThrow('Failed to initialize real-time session')
    })
  })

  describe('Real-Time Input Processing', () => {
    let session: RealTimeSession

    beforeEach(async () => {
      session = await engine.initializeSession(
        'test-session-1',
        'test-client-1',
        'test-therapist-1',
        mockCognitiveModel,
      )
    })

    it('should process text message input successfully', async () => {
      const input = {
        type: 'message' as const,
        content: 'I feel really sad today',
        timestamp: new Date(),
      }

      const result = await engine.processRealTimeInput(session.sessionId, input)

      expect(result).toBeDefined()
      expect(result.riskAssessment).toBeDefined()
      expect(result.interventions).toBeDefined()
      expect(result.sessionUpdates).toBeDefined()
      expect(mockEmotionEngine.detectEmotionsFromText).toHaveBeenCalledWith(
        input.content,
      )
    })

    it('should detect crisis language and escalate appropriately', async () => {
      mockEmotionEngine.detectEmotionsFromText.mockResolvedValue({
        id: 'crisis-analysis',
        timestamp: new Date().toISOString(),
        emotions: [
          { type: 'suicidal', intensity: 0.9, confidence: 0.9 },
          { type: 'hopeless', intensity: 0.8, confidence: 0.8 },
        ],
        userId: 'test-user',
        source: 'text',
        input: 'test input',
        overallSentiment: -0.9,
        riskFactors: [
          { type: 'suicidal-ideation', severity: 0.9, confidence: 0.9 },
        ],
        contextualFactors: [],
        requiresAttention: true,
      })

      const input = {
        type: 'message' as const,
        content: 'I want to hurt myself, there is no point in living',
        timestamp: new Date(),
      }

      const result = await engine.processRealTimeInput(session.sessionId, input)

      expect(result.riskAssessment.level).toBe('critical')
      expect(result.riskAssessment.primaryFactors).toHaveLength(1)
      expect(result.riskAssessment.primaryFactors[0].factor).toBe(
        'suicidal-ideation',
      )
      expect(result.riskAssessment.timeToEscalation).toBeLessThanOrEqual(1)
      expect(result.interventions).toHaveLength(1)
      expect(result.interventions[0].type).toBe('crisis-response')
    })

    it('should handle moderate risk scenarios', async () => {
      mockEmotionEngine.detectEmotionsFromText.mockResolvedValue({
        id: 'moderate-analysis',
        timestamp: new Date().toISOString(),
        emotions: [
          { type: 'hopeless', intensity: 0.6, confidence: 0.7 },
          { type: 'overwhelmed', intensity: 0.7, confidence: 0.8 },
        ],
        userId: 'test-user',
        source: 'text',
        input: 'test input',
        overallSentiment: -0.5,
        riskFactors: [],
        contextualFactors: [],
        requiresAttention: false,
      })

      const input = {
        type: 'message' as const,
        content: 'I feel overwhelmed and hopeless about everything',
        timestamp: new Date(),
      }

      const result = await engine.processRealTimeInput(session.sessionId, input)

      expect(result.riskAssessment.level).toBe('moderate')
      expect(result.riskAssessment.recommendedActions).toHaveLength(1)
      expect(result.riskAssessment.recommendedActions[0].type).toBe(
        'preventive',
      )
    })

    it('should update session context correctly', async () => {
      const input = {
        type: 'message' as const,
        content: 'This is a test message',
        timestamp: new Date(),
      }

      await engine.processRealTimeInput(session.sessionId, input)

      const status = engine.getSessionStatus(session.sessionId)
      expect(
        status.session?.contextualFactors.engagementMetrics.messageLength,
      ).toContain(input.content.length)
      expect(
        status.session?.contextualFactors.environmentalContext.sessionDuration,
      ).toBeGreaterThan(0)
    })

    it('should handle non-existent session gracefully', async () => {
      const input = {
        type: 'message' as const,
        content: 'Test message',
        timestamp: new Date(),
      }

      await expect(
        engine.processRealTimeInput('non-existent-session', input),
      ).rejects.toThrow('Session non-existent-session not found')
    })
  })

  describe('Risk Assessment', () => {
    let session: RealTimeSession

    beforeEach(async () => {
      session = await engine.initializeSession(
        'test-session-1',
        'test-client-1',
        'test-therapist-1',
        mockCognitiveModel,
      )
    })

    it('should calculate risk levels correctly', async () => {
      const testCases = [
        {
          emotions: [{ type: 'neutral', intensity: 0.5, confidence: 0.8 }],
          expectedRisk: 'minimal' as RiskLevel,
        },
        {
          emotions: [{ type: 'sad', intensity: 0.4, confidence: 0.7 }],
          expectedRisk: 'low' as RiskLevel,
        },
        {
          emotions: [{ type: 'hopeless', intensity: 0.6, confidence: 0.8 }],
          expectedRisk: 'moderate' as RiskLevel,
        },
        {
          emotions: [{ type: 'hopeless', intensity: 0.8, confidence: 0.9 }],
          expectedRisk: 'high' as RiskLevel,
        },
        {
          emotions: [{ type: 'suicidal', intensity: 0.7, confidence: 0.9 }],
          expectedRisk: 'critical' as RiskLevel,
        },
      ]

      for (const testCase of testCases) {
        mockEmotionEngine.detectEmotionsFromText.mockResolvedValue({
          id: 'test-analysis',
          timestamp: new Date().toISOString(),
          emotions: testCase.emotions,
          userId: 'test-user',
          source: 'text',
          input: 'test input',
          overallSentiment: 0,
          riskFactors: [],
          contextualFactors: [],
          requiresAttention: false,
        })

        const input = {
          type: 'message' as const,
          content: 'Test content',
          timestamp: new Date(),
        }

        const result = await engine.processRealTimeInput(
          session.sessionId,
          input,
        )
        expect(result.riskAssessment.level).toBe(testCase.expectedRisk)
      }
    })

    it('should consider historical risk factors', async () => {
      // First, create a high-risk assessment
      mockEmotionEngine.detectEmotionsFromText.mockResolvedValue({
        id: 'high-risk-analysis',
        timestamp: new Date().toISOString(),
        emotions: [{ type: 'hopeless', intensity: 0.8, confidence: 0.9 }],
        userId: 'test-user',
        source: 'text',
        input: 'test input',
        overallSentiment: -0.7,
        riskFactors: [],
        contextualFactors: [],
        requiresAttention: true,
      })

      await engine.processRealTimeInput(session.sessionId, {
        type: 'message',
        content: 'I feel hopeless',
        timestamp: new Date(),
      })

      // Then process a lower-risk input that should be elevated due to history
      mockEmotionEngine.detectEmotionsFromText.mockResolvedValue({
        id: 'moderate-analysis',
        timestamp: new Date().toISOString(),
        emotions: [{ type: 'sad', intensity: 0.5, confidence: 0.7 }],
        userId: 'test-user',
        source: 'text',
        input: 'test input',
        overallSentiment: -0.3,
        riskFactors: [],
        contextualFactors: [],
        requiresAttention: false,
      })

      const result = await engine.processRealTimeInput(session.sessionId, {
        type: 'message',
        content: 'I feel a bit sad',
        timestamp: new Date(),
      })

      // Should have historical risk factor
      expect(
        result.riskAssessment.secondaryFactors.some(
          (f) => f.factor === 'recent-high-risk-episodes',
        ),
      ).toBe(true)
    })
  })

  describe('Intervention Generation', () => {
    let session: RealTimeSession

    beforeEach(async () => {
      session = await engine.initializeSession(
        'test-session-1',
        'test-client-1',
        'test-therapist-1',
        mockCognitiveModel,
      )
    })

    it('should generate appropriate interventions for different risk levels', async () => {
      const testCases = [
        {
          riskLevel: 'critical' as RiskLevel,
          expectedType: 'crisis-response',
          emotions: [{ type: 'suicidal', intensity: 0.9, confidence: 0.9 }],
        },
        {
          riskLevel: 'high' as RiskLevel,
          expectedType: 'validation',
          emotions: [{ type: 'hopeless', intensity: 0.8, confidence: 0.9 }],
        },
        {
          riskLevel: 'moderate' as RiskLevel,
          expectedType: 'validation',
          emotions: [{ type: 'sad', intensity: 0.6, confidence: 0.8 }],
        },
      ]

      for (const testCase of testCases) {
        mockEmotionEngine.detectEmotionsFromText.mockResolvedValue({
          id: 'test-analysis',
          timestamp: new Date().toISOString(),
          emotions: testCase.emotions,
          userId: 'test-user',
          source: 'text',
          input: 'test input',
          overallSentiment: -0.5,
          riskFactors: [],
          contextualFactors: [],
          requiresAttention: testCase.riskLevel === 'critical',
        })

        const result = await engine.processRealTimeInput(session.sessionId, {
          type: 'message',
          content: 'Test content',
          timestamp: new Date(),
        })

        if (result.interventions.length > 0) {
          expect(result.interventions[0].type).toBe(testCase.expectedType)
          expect(result.interventions[0].content).toBeDefined()
          expect(result.interventions[0].delivery).toBeDefined()
          expect(result.interventions[0].followUp).toBeDefined()
        }
      }
    })

    it('should respect maximum interventions per session', async () => {
      mockEmotionEngine.detectEmotionsFromText.mockResolvedValue({
        id: 'moderate-analysis',
        timestamp: new Date().toISOString(),
        emotions: [{ type: 'sad', intensity: 0.6, confidence: 0.8 }],
        userId: 'test-user',
        source: 'text',
        input: 'test input',
        overallSentiment: -0.5,
        riskFactors: [],
        contextualFactors: [],
        requiresAttention: false,
      })

      // Generate multiple interventions to reach the limit
      for (let i = 0; i < 12; i++) {
        await engine.processRealTimeInput(session.sessionId, {
          type: 'message',
          content: `Test message ${i}`,
          timestamp: new Date(),
        })
      }

      const status = engine.getSessionStatus(session.sessionId)
      expect(status.session?.interventionHistory.length).toBeLessThanOrEqual(10)
    })
  })

  describe('Session Management', () => {
    let session: RealTimeSession

    beforeEach(async () => {
      session = await engine.initializeSession(
        'test-session-1',
        'test-client-1',
        'test-therapist-1',
        mockCognitiveModel,
      )
    })

    it('should provide accurate session status', () => {
      const status = engine.getSessionStatus(session.sessionId)

      expect(status.session).toBeDefined()
      expect(status.session?.sessionId).toBe(session.sessionId)
      expect(status.currentRisk).toBeNull() // No risk assessments yet
      expect(status.recentInterventions).toEqual([])
      expect(status.predictiveInsights).toEqual([])
    })

    it('should end session and generate comprehensive summary', async () => {
      // Add some activity to the session
      await engine.processRealTimeInput(session.sessionId, {
        type: 'message',
        content: 'I feel sad',
        timestamp: new Date(),
      })

      const summary = await engine.endSession(session.sessionId)

      expect(summary.sessionSummary).toBeDefined()
      expect(summary.sessionSummary.id).toBe(session.sessionId)
      expect(summary.sessionSummary.keyInsights).toBeDefined()
      expect(summary.sessionSummary.effectivenessRating).toBeGreaterThanOrEqual(
        0,
      )
      expect(summary.finalRiskAssessment).toBeDefined()
      expect(summary.interventionEffectiveness).toBeDefined()
      expect(summary.recommendations).toBeDefined()

      // Session should be cleaned up
      const status = engine.getSessionStatus(session.sessionId)
      expect(status.session).toBeNull()
    })

    it('should handle ending non-existent session', async () => {
      await expect(engine.endSession('non-existent-session')).rejects.toThrow(
        'Session non-existent-session not found',
      )
    })
  })

  describe('Intervention Effectiveness Tracking', () => {
    let session: RealTimeSession
    let interventionId: string

    beforeEach(async () => {
      session = await engine.initializeSession(
        'test-session-1',
        'test-client-1',
        'test-therapist-1',
        mockCognitiveModel,
      )

      // Generate an intervention
      mockEmotionEngine.detectEmotionsFromText.mockResolvedValue({
        id: 'test-analysis',
        timestamp: new Date().toISOString(),
        emotions: [{ type: 'sad', intensity: 0.6, confidence: 0.8 }],
        userId: 'test-user',
        source: 'text',
        input: 'test input',
        overallSentiment: -0.5,
        riskFactors: [],
        contextualFactors: [],
        requiresAttention: false,
      })

      const result = await engine.processRealTimeInput(session.sessionId, {
        type: 'message',
        content: 'I feel sad',
        timestamp: new Date(),
      })

      interventionId = result.interventions[0]?.id || 'test-intervention'
    })

    it('should update intervention effectiveness', async () => {
      const effectiveness = {
        immediateResponse: {
          emotionalChange: 0.3,
          engagementChange: 0.2,
          riskLevelChange: -0.1,
          therapeuticAllianceChange: 0.1,
          clientSatisfaction: 0.8,
          behavioralIndicators: ['improved mood'],
        },
      }

      await engine.updateInterventionEffectiveness(
        session.sessionId,
        interventionId,
        effectiveness,
      )

      const status = engine.getSessionStatus(session.sessionId)
      const intervention = status.session?.interventionHistory.find(
        (i) => i.id === interventionId,
      )

      expect(intervention?.effectiveness?.immediateResponse).toEqual(
        effectiveness.immediateResponse,
      )
      expect(intervention?.effectiveness?.measuredAt).toHaveLength(1)
    })

    it('should handle updating non-existent intervention', async () => {
      await expect(
        engine.updateInterventionEffectiveness(
          session.sessionId,
          'non-existent-intervention',
          {},
        ),
      ).resolves.toBeUndefined() // Should not throw, just log error
    })
  })

  describe('Communication Pattern Detection', () => {
    let session: RealTimeSession

    beforeEach(async () => {
      session = await engine.initializeSession(
        'test-session-1',
        'test-client-1',
        'test-therapist-1',
        mockCognitiveModel,
      )
    })

    it('should detect crisis language patterns', async () => {
      const crisisInputs = [
        'I want to hurt myself',
        'There is no point in living',
        'I should just give up',
        'I want to end it all',
      ]

      for (const content of crisisInputs) {
        await engine.processRealTimeInput(session.sessionId, {
          type: 'message',
          content,
          timestamp: new Date(),
        })
      }

      const status = engine.getSessionStatus(session.sessionId)
      const patterns =
        status.session?.contextualFactors.communicationPatterns || []

      expect(patterns.some((p) => p.pattern === 'crisis-language')).toBe(true)
    })

    it('should detect engagement patterns', async () => {
      const engagementInputs = [
        'I understand what you mean',
        'That makes sense to me',
        'This is really helpful',
        'I feel better now',
      ]

      for (const content of engagementInputs) {
        await engine.processRealTimeInput(session.sessionId, {
          type: 'message',
          content,
          timestamp: new Date(),
        })
      }

      const status = engine.getSessionStatus(session.sessionId)
      const patterns =
        status.session?.contextualFactors.communicationPatterns || []

      expect(patterns.some((p) => p.pattern === 'engagement')).toBe(true)
    })
  })

  describe('Session Phase Detection', () => {
    let session: RealTimeSession

    beforeEach(async () => {
      session = await engine.initializeSession(
        'test-session-1',
        'test-client-1',
        'test-therapist-1',
        mockCognitiveModel,
      )
    })

    it('should detect crisis phase', async () => {
      await engine.processRealTimeInput(session.sessionId, {
        type: 'message',
        content: 'This is a crisis situation',
        timestamp: new Date(),
      })

      const status = engine.getSessionStatus(session.sessionId)
      expect(status.session?.currentPhase).toBe('crisis')
    })

    it('should transition through session phases based on time', async () => {
      // Initially in opening phase
      expect(session.currentPhase).toBe('opening')

      // Simulate time passage by updating session duration
      session.contextualFactors.environmentalContext.sessionDuration = 10

      await engine.processRealTimeInput(session.sessionId, {
        type: 'message',
        content: 'We are in the middle of the session',
        timestamp: new Date(),
      })

      const status = engine.getSessionStatus(session.sessionId)
      expect(status.session?.currentPhase).toBe('working')
    })
  })
})

describe('Utility Functions', () => {
  describe('performQuickRiskAssessment', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should perform quick risk assessment for normal content', async () => {
      mockEmotionEngine.detectEmotionsFromText.mockResolvedValue({
        id: 'quick-analysis',
        timestamp: new Date().toISOString(),
        emotions: [{ type: 'neutral', intensity: 0.5, confidence: 0.8 }],
        userId: 'test-user',
        source: 'text',
        input: 'test input',
        overallSentiment: 0,
        riskFactors: [],
        contextualFactors: [],
        requiresAttention: false,
      })

      const result = await performQuickRiskAssessment(
        'I am feeling okay today',
        mockEmotionEngine as unknown as EmotionDetectionEngine,
      )

      expect(result.riskLevel).toBe('minimal')
      expect(result.confidence).toBe(0.8)
      expect(result.factors).toEqual([])
    })

    it('should detect high-risk content', async () => {
      mockEmotionEngine.detectEmotionsFromText.mockResolvedValue({
        id: 'crisis-analysis',
        timestamp: new Date().toISOString(),
        emotions: [
          { type: 'suicidal', intensity: 0.9, confidence: 0.9 },
          { type: 'hopeless', intensity: 0.8, confidence: 0.8 },
        ],
        userId: 'test-user',
        source: 'text',
        input: 'test input',
        overallSentiment: -0.9,
        riskFactors: [
          { type: 'suicidal-ideation', severity: 0.9, confidence: 0.9 },
        ],
        contextualFactors: [],
        requiresAttention: true,
      })

      const result = await performQuickRiskAssessment(
        'I want to hurt myself',
        mockEmotionEngine as unknown as EmotionDetectionEngine,
      )

      expect(result.riskLevel).toBe('critical')
      expect(result.confidence).toBe(0.8)
      expect(result.factors).toContain('suicidal-ideation')
    })

    it('should handle analysis errors gracefully', async () => {
      mockEmotionEngine.detectEmotionsFromText.mockRejectedValue(
        new Error('Analysis failed'),
      )

      const result = await performQuickRiskAssessment(
        'Test content',
        mockEmotionEngine as unknown as EmotionDetectionEngine,
      )

      expect(result.riskLevel).toBe('minimal')
      expect(result.confidence).toBe(0.1)
      expect(result.factors).toEqual([])
    })
  })

  describe('createRealTimeInterventionEngine', () => {
    it('should create engine with all dependencies', () => {
      const engine = createRealTimeInterventionEngine(
        mockEmotionEngine as unknown as EmotionDetectionEngine,
        mockInterventionAnalysis as unknown as InterventionAnalysisService,
        mockContextualEnhancement as unknown as ContextualEnhancementService,
      )

      expect(engine).toBeInstanceOf(RealTimeInterventionEngine)
    })
  })
})

describe('Edge Cases and Error Handling', () => {
  let engine: RealTimeInterventionEngine

  beforeEach(() => {
    engine = createRealTimeInterventionEngine(
      mockEmotionEngine as unknown as EmotionDetectionEngine,
      mockInterventionAnalysis as unknown as InterventionAnalysisService,
      mockContextualEnhancement as unknown as ContextualEnhancementService,
    )
  })

  it('should handle emotion analysis failures gracefully', async () => {
    mockEmotionEngine.detectEmotionsFromText.mockRejectedValue(
      new Error('Emotion analysis failed'),
    )

    const session = await engine.initializeSession(
      'test-session-1',
      'test-client-1',
      'test-therapist-1',
    )

    const result = await engine.processRealTimeInput(session.sessionId, {
      type: 'message',
      content: 'Test message',
      timestamp: new Date(),
    })

    // Should return safe defaults
    expect(result.riskAssessment.level).toBe('minimal')
    expect(result.riskAssessment.confidence).toBe(0.1)
    expect(result.interventions).toEqual([])
  })

  it('should handle empty or invalid input content', async () => {
    const session = await engine.initializeSession(
      'test-session-1',
      'test-client-1',
      'test-therapist-1',
    )

    const emptyInputs = ['', '   ', '\n\t', null, undefined]

    for (const content of emptyInputs) {
      const result = await engine.processRealTimeInput(session.sessionId, {
        type: 'message',
        content: content as string,
        timestamp: new Date(),
      })

      expect(result).toBeDefined()
      expect(result.riskAssessment).toBeDefined()
    }
  })

  it('should handle concurrent session operations', async () => {
    const session = await engine.initializeSession(
      'test-session-1',
      'test-client-1',
      'test-therapist-1',
    )

    // Simulate concurrent processing
    const promises = Array.from({ length: 5 }, (_, i) =>
      engine.processRealTimeInput(session.sessionId, {
        type: 'message',
        content: `Concurrent message ${i}`,
        timestamp: new Date(),
      }),
    )

    const results = await Promise.all(promises)

    expect(results).toHaveLength(5)
    results.forEach((result) => {
      expect(result).toBeDefined()
      expect(result.riskAssessment).toBeDefined()
    })
  })

  it('should handle very long session durations', async () => {
    const session = await engine.initializeSession(
      'test-session-1',
      'test-client-1',
      'test-therapist-1',
    )

    // Simulate very long session (over 2 hours)
    session.contextualFactors.environmentalContext.sessionDuration = 150

    const result = await engine.processRealTimeInput(session.sessionId, {
      type: 'message',
      content: 'This is a very long session',
      timestamp: new Date(),
    })

    expect(result.sessionUpdates.currentPhase).toBe('closing')
  })

  it('should handle malformed cognitive model data', async () => {
    const malformedModel = {
      id: 'malformed-model',
      name: 'Malformed Patient',
      coreBeliefs: null, // Malformed data
      distortionPatterns: undefined,
      behavioralPatterns: [],
    } as unknown as CognitiveModel

    // Should not throw error, but handle gracefully
    await expect(
      engine.initializeSession(
        'test-session-1',
        'test-client-1',
        'test-therapist-1',
        malformedModel,
      ),
    ).resolves.toBeDefined()
  })
})
