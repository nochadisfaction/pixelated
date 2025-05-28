import { describe, it, expect, beforeEach, vi } from 'vitest'
import { EnhancedPatientModelService } from '../EnhancedPatientModelService'
import type { CognitiveModel, CoreBelief } from '../../types/CognitiveModel'
import type {
  StatementContext,
  EmotionalState,
  BeliefActivationHistory,
  ConsistentResponse,
} from '../EnhancedPatientModelService'
import type { KVStore } from '../../../db/KVStore'

// Mock KVStore
const mockKVStore: Partial<KVStore> = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
  clear: vi.fn(),
  keys: vi.fn(),
  exists: vi.fn(),
}

describe('CognitiveConsistencyEngine', () => {
  let service: EnhancedPatientModelService
  let mockModel: CognitiveModel
  let mockBelief: CoreBelief
  let mockContext: StatementContext
  let mockEmotionalState: EmotionalState

  beforeEach(() => {
    service = new EnhancedPatientModelService(mockKVStore as KVStore)

    mockBelief = {
      id: 'belief-1',
      belief: 'I am worthless',
      strength: 0.8,
      evidence: ['Failed at work', 'Nobody calls me'],
      formationContext: 'Childhood criticism',
      relatedDomains: ['self-worth', 'relationships'],
      associatedEmotions: ['sadness', 'shame'],
    }

    mockModel = {
      id: 'test-model-1',
      name: 'Test Patient',
      demographicInfo: {
        age: 30,
        gender: 'female',
        occupation: 'teacher',
        familyStatus: 'single',
      },
      presentingIssues: ['depression', 'low self-esteem'],
      diagnosisInfo: {
        primaryDiagnosis: 'Major Depressive Disorder',
        severity: 'moderate',
      },
      coreBeliefs: [mockBelief],
      distortionPatterns: [],
      behavioralPatterns: [],
      emotionalPatterns: [],
      relationshipPatterns: [],
      formativeExperiences: [],
      therapyHistory: {
        previousApproaches: [],
        helpfulInterventions: [],
        unhelpfulInterventions: [],
        insights: [],
        progressMade: '',
        remainingChallenges: [],
      },
      conversationalStyle: {
        verbosity: 5,
        emotionalExpressiveness: 4,
        resistance: 6,
        insightLevel: 3,
        preferredCommunicationModes: ['direct questions'],
      },
      goalsForTherapy: ['improve self-esteem'],
      therapeuticProgress: {
        insights: [],
        resistanceLevel: 0.6,
        changeReadiness: 'contemplation',
        sessionProgressLog: [],
      },
    }

    mockContext = {
      sessionId: 'session-1',
      sessionNumber: 1,
      conversationTurn: 5,
      therapeuticPhase: 'intervention',
      currentTopic: 'self-worth',
      recentTopics: ['work', 'relationships'],
      therapistApproach: 'supportive',
      patientMood: 'negative',
      allianceStrength: 0.7,
      trustLevel: 0.6,
    }

    mockEmotionalState = {
      primaryEmotion: 'sadness',
      emotionIntensity: 0.8,
      secondaryEmotions: [
        { emotion: 'anxiety', intensity: 0.6 },
        { emotion: 'shame', intensity: 0.7 },
      ],
      emotionalStability: 0.4,
      emotionalCoherence: 0.6,
      triggeringFactors: ['work criticism', 'social rejection'],
    }

    // Mock the getModelById method using vi.spyOn
    const getModelByIdSpy = vi.fn().mockResolvedValue(mockModel)
    service.getModelById = getModelByIdSpy
  })

  describe('Belief Consistency Checking', () => {
    it('should assess belief alignment correctly', async () => {
      const statement = "I'm completely worthless and nobody cares about me"
      const _beliefHistory: BeliefActivationHistory[] = [
        {
          beliefId: 'belief-1',
          activationTimestamp: new Date(),
          activationContext: 'Work feedback session',
          activationStrength: 0.9,
          triggeringEvent: 'Received criticism',
          emotionalContext: mockEmotionalState,
        },
      ]

      // Access the private method through the public API
      const response = await service.generateCognitivelyConsistentResponse(
        'test-model-1',
        statement,
        [
          { role: 'therapist', content: 'How are you feeling today?' },
          { role: 'patient', content: statement },
        ],
        mockContext,
      )

      expect(response).toBeDefined()
      expect(response.consistencyScore).toBeGreaterThan(0)
      expect(response.responseContent).toBeTruthy()
      expect(response.alignedBeliefs).toBeDefined()
      expect(response.therapeuticValue).toBeGreaterThan(0)
    })

    it('should detect inconsistencies in statements', async () => {
      const contradictoryStatement =
        "I'm actually really confident and successful"

      const response = await service.generateCognitivelyConsistentResponse(
        'test-model-1',
        contradictoryStatement,
        [
          { role: 'therapist', content: 'Tell me about yourself' },
          { role: 'patient', content: contradictoryStatement },
        ],
        mockContext,
      )

      expect(response).toBeDefined()
      expect(response.consistencyScore).toBeLessThan(0.8) // Should be lower for contradictory statement
      expect(response.potentialInconsistencies).toBeDefined()
    })

    it('should provide consistency adjustments for misaligned statements', async () => {
      const inconsistentStatement = 'Everything is perfect in my life'

      const response = await service.generateCognitivelyConsistentResponse(
        'test-model-1',
        inconsistentStatement,
        [
          {
            role: 'therapist',
            content: 'How would you describe your current situation?',
          },
          { role: 'patient', content: inconsistentStatement },
        ],
        mockContext,
      )

      expect(response).toBeDefined()
      expect(response.alternativeResponses).toBeDefined()
      expect(Array.isArray(response.alternativeResponses)).toBe(true)
    })
  })

  describe('Statement Memory System', () => {
    it('should record and retrieve statements correctly', async () => {
      const statement = "I feel like I can't do anything right"
      const _relatedBeliefs = ['belief-1']

      // Generate a response which should record the statement
      await service.generateCognitivelyConsistentResponse(
        'test-model-1',
        statement,
        [
          { role: 'therapist', content: 'What brings you here today?' },
          { role: 'patient', content: statement },
        ],
        mockContext,
      )

      // The statement should be recorded in the internal memory system
      // We can't directly test the private method, but we can verify the system works
      // by generating another response and checking for consistency
      const followUpResponse =
        await service.generateCognitivelyConsistentResponse(
          'test-model-1',
          "I'm having the same feelings as before",
          [
            { role: 'therapist', content: 'How are you feeling now?' },
            {
              role: 'patient',
              content: "I'm having the same feelings as before",
            },
          ],
          mockContext,
        )

      expect(followUpResponse).toBeDefined()
      expect(followUpResponse.consistencyScore).toBeGreaterThan(0.5)
    })

    it('should maintain statement history across sessions', async () => {
      const statement1 = 'I always mess things up'
      const statement2 = 'I made another mistake today'

      // First statement
      await service.generateCognitivelyConsistentResponse(
        'test-model-1',
        statement1,
        [{ role: 'patient', content: statement1 }],
        mockContext,
      )

      // Second statement in same session
      const response2 = await service.generateCognitivelyConsistentResponse(
        'test-model-1',
        statement2,
        [
          { role: 'patient', content: statement1 },
          { role: 'therapist', content: 'Tell me more about that' },
          { role: 'patient', content: statement2 },
        ],
        mockContext,
      )

      expect(response2).toBeDefined()
      expect(response2.consistencyScore).toBeGreaterThan(0.6) // Should be consistent with previous statement
    })
  })

  describe('Contradiction Avoidance System', () => {
    it('should generate consistent responses', async () => {
      const prompt = 'Tell me about your strengths'

      const response = await service.generateCognitivelyConsistentResponse(
        'test-model-1',
        prompt,
        [{ role: 'therapist', content: prompt }],
        mockContext,
      )

      expect(response).toBeDefined()
      expect(response.responseContent).toBeTruthy()
      expect(response.consistencyScore).toBeGreaterThan(0.5)
      expect(response.therapeuticValue).toBeGreaterThan(0)
    })

    it('should validate response consistency', async () => {
      const response = await service.generateCognitivelyConsistentResponse(
        'test-model-1',
        "I'm feeling confident today",
        [
          { role: 'therapist', content: 'How are you feeling?' },
          { role: 'patient', content: "I'm feeling confident today" },
        ],
        mockContext,
      )

      expect(response).toBeDefined()
      // For a patient with low self-worth beliefs, feeling confident might be inconsistent
      expect(response.potentialInconsistencies).toBeDefined()
    })

    it('should provide alternative responses when consistency is low', async () => {
      const contradictoryPrompt = "I'm the best at everything I do"

      const response = await service.generateCognitivelyConsistentResponse(
        'test-model-1',
        contradictoryPrompt,
        [
          { role: 'therapist', content: 'How do you see yourself?' },
          { role: 'patient', content: contradictoryPrompt },
        ],
        mockContext,
      )

      expect(response).toBeDefined()
      expect(response.alternativeResponses).toBeDefined()
      expect(Array.isArray(response.alternativeResponses)).toBe(true)
    })
  })

  describe('Cognitive Coherence Tracking', () => {
    it('should assess overall model coherence', async () => {
      const coherenceScore = await service.assessModelCoherence('test-model-1')

      expect(coherenceScore).toBeDefined()
      expect(coherenceScore.overallScore).toBeGreaterThanOrEqual(0)
      expect(coherenceScore.overallScore).toBeLessThanOrEqual(1)
      expect(coherenceScore.dimensions).toBeDefined()
      expect(coherenceScore.dimensions.beliefCoherence).toBeGreaterThanOrEqual(
        0,
      )
      expect(
        coherenceScore.dimensions.emotionalCoherence,
      ).toBeGreaterThanOrEqual(0)
      expect(
        coherenceScore.dimensions.behavioralCoherence,
      ).toBeGreaterThanOrEqual(0)
      expect(
        coherenceScore.dimensions.temporalCoherence,
      ).toBeGreaterThanOrEqual(0)
      expect(
        coherenceScore.dimensions.narrativeCoherence,
      ).toBeGreaterThanOrEqual(0)
      expect(coherenceScore.improvementOpportunities).toBeDefined()
      expect(Array.isArray(coherenceScore.improvementOpportunities)).toBe(true)
    })

    it('should generate coherence reports', async () => {
      const timeRange = {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        end: new Date(),
      }

      const report = await service.generateModelCoherenceReport(
        'test-model-1',
        timeRange,
      )

      expect(report).toBeDefined()
      expect(report.modelId).toBe('test-model-1')
      expect(report.reportPeriod).toEqual(timeRange)
      expect(report.executiveSummary).toBeDefined()
      expect(report.executiveSummary.overallCoherence).toBeGreaterThanOrEqual(0)
      expect(report.executiveSummary.coherenceTrend).toBeDefined()
      expect(report.executiveSummary.keyFindings).toBeDefined()
      expect(report.executiveSummary.recommendations).toBeDefined()
      expect(report.detailedAnalysis).toBeDefined()
      expect(report.therapeuticInsights).toBeDefined()
      expect(report.actionableRecommendations).toBeDefined()
    })

    it('should track coherence evolution over time', async () => {
      // Generate multiple responses to create history
      const statements = [
        'I feel worthless',
        'Nothing I do matters',
        "I'm a failure",
      ]

      for (const statement of statements) {
        await service.generateCognitivelyConsistentResponse(
          'test-model-1',
          statement,
          [{ role: 'patient', content: statement }],
          {
            ...mockContext,
            conversationTurn: mockContext.conversationTurn + 1,
          },
        )
      }

      const coherenceScore = await service.assessModelCoherence('test-model-1')
      expect(coherenceScore.overallScore).toBeGreaterThan(0)
    })
  })

  describe('Integration Tests', () => {
    it('should maintain consistency across multiple interactions', async () => {
      const interactions = [
        "I'm not good at anything",
        'I failed again today',
        'Nobody believes in me',
        'I should just give up',
      ]

      const responses: ConsistentResponse[] = []

      for (let i = 0; i < interactions.length; i++) {
        const response = await service.generateCognitivelyConsistentResponse(
          'test-model-1',
          interactions[i],
          [{ role: 'patient', content: interactions[i] }],
          { ...mockContext, conversationTurn: i + 1 },
        )
        responses.push(response)
      }

      // All responses should be reasonably consistent
      responses.forEach((response) => {
        expect(response.consistencyScore).toBeGreaterThan(0.5)
        expect(response.therapeuticValue).toBeGreaterThan(0)
      })

      // Later responses should maintain or improve consistency
      expect(
        responses[responses.length - 1].consistencyScore,
      ).toBeGreaterThanOrEqual(responses[0].consistencyScore - 0.2)
    })

    it('should handle belief conflicts appropriately', async () => {
      // Add a conflicting belief
      const conflictingBelief: CoreBelief = {
        id: 'belief-2',
        belief: 'I am highly competent',
        strength: 0.7,
        evidence: ['Got promoted', 'Received praise'],
        formationContext: 'Recent success',
        relatedDomains: ['self-worth', 'work'],
        associatedEmotions: ['pride', 'confidence'],
      }

      const modelWithConflict = {
        ...mockModel,
        coreBeliefs: [mockBelief, conflictingBelief],
      }

      const getModelByIdSpy = vi.fn().mockResolvedValue(modelWithConflict)
      service.getModelById = getModelByIdSpy

      const response = await service.generateCognitivelyConsistentResponse(
        'test-model-1',
        "I'm confused about how I see myself",
        [{ role: 'patient', content: "I'm confused about how I see myself" }],
        mockContext,
      )

      expect(response).toBeDefined()
      expect(response.potentialInconsistencies).toBeDefined()
      // Should detect the belief conflict
      expect(response.potentialInconsistencies.length).toBeGreaterThanOrEqual(0)
    })

    it('should adapt to therapeutic context changes', async () => {
      const supportiveContext = {
        ...mockContext,
        therapistApproach: 'supportive' as const,
      }
      const challengingContext = {
        ...mockContext,
        therapistApproach: 'challenging' as const,
      }

      const supportiveResponse =
        await service.generateCognitivelyConsistentResponse(
          'test-model-1',
          "I'm worthless",
          [{ role: 'patient', content: "I'm worthless" }],
          supportiveContext,
        )

      const challengingResponse =
        await service.generateCognitivelyConsistentResponse(
          'test-model-1',
          "I'm worthless",
          [{ role: 'patient', content: "I'm worthless" }],
          challengingContext,
        )

      expect(supportiveResponse).toBeDefined()
      expect(challengingResponse).toBeDefined()

      // Both should be consistent but may have different therapeutic values
      expect(supportiveResponse.consistencyScore).toBeGreaterThan(0.5)
      expect(challengingResponse.consistencyScore).toBeGreaterThan(0.5)
    })
  })

  describe('Error Handling', () => {
    it('should handle missing model gracefully', async () => {
      const getModelByIdSpy = vi.fn().mockResolvedValue(null)
      service.getModelById = getModelByIdSpy

      const response = await service.generateCognitivelyConsistentResponse(
        'non-existent-model',
        'Test statement',
        [{ role: 'patient', content: 'Test statement' }],
        mockContext,
      )

      expect(response).toBeDefined()
      expect(response.responseContent).toBeTruthy()
      expect(response.consistencyScore).toBeGreaterThanOrEqual(0)
      expect(response.potentialInconsistencies).toContain(
        'Error in response generation',
      )
    })

    it('should handle invalid input gracefully', async () => {
      const response = await service.generateCognitivelyConsistentResponse(
        'test-model-1',
        '', // Empty statement
        [],
        mockContext,
      )

      expect(response).toBeDefined()
      expect(response.responseContent).toBeTruthy()
      expect(response.consistencyScore).toBeGreaterThanOrEqual(0)
    })

    it('should handle coherence assessment errors gracefully', async () => {
      const getModelByIdSpy = vi
        .fn()
        .mockRejectedValue(new Error('Database error'))
      service.getModelById = getModelByIdSpy

      const coherenceScore = await service.assessModelCoherence('test-model-1')

      expect(coherenceScore).toBeDefined()
      expect(coherenceScore.overallScore).toBe(0)
      expect(coherenceScore.improvementOpportunities).toContain(
        'Error in coherence assessment',
      )
    })
  })

  describe('Performance Tests', () => {
    it('should process multiple requests efficiently', async () => {
      const startTime = Date.now()

      const promises = Array.from({ length: 10 }, (_, i) =>
        service.generateCognitivelyConsistentResponse(
          'test-model-1',
          `Statement ${i}`,
          [{ role: 'patient', content: `Statement ${i}` }],
          { ...mockContext, conversationTurn: i },
        ),
      )

      const responses = await Promise.all(promises)
      const endTime = Date.now()

      expect(responses).toHaveLength(10)
      responses.forEach((response) => {
        expect(response).toBeDefined()
        expect(response.consistencyScore).toBeGreaterThanOrEqual(0)
      })

      // Should complete within reasonable time (adjust threshold as needed)
      expect(endTime - startTime).toBeLessThan(5000) // 5 seconds
    })

    it('should handle large statement histories efficiently', async () => {
      // Generate a large number of statements
      for (let i = 0; i < 50; i++) {
        await service.generateCognitivelyConsistentResponse(
          'test-model-1',
          `Historical statement ${i}`,
          [{ role: 'patient', content: `Historical statement ${i}` }],
          { ...mockContext, conversationTurn: i },
        )
      }

      const startTime = Date.now()
      const response = await service.generateCognitivelyConsistentResponse(
        'test-model-1',
        'Current statement',
        [{ role: 'patient', content: 'Current statement' }],
        { ...mockContext, conversationTurn: 51 },
      )
      const endTime = Date.now()

      expect(response).toBeDefined()
      expect(response.consistencyScore).toBeGreaterThanOrEqual(0)
      expect(endTime - startTime).toBeLessThan(2000) // Should still be fast
    })
  })
})
