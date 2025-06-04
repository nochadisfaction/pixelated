/**
 * Tests for Contextual Response Enhancement Service
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  ContextualResponseService,
  enhanceResponseWithContext,
  type ContextualEnhancementOptions,
  type ResponseContext,
} from '../ContextualResponseService'
import type { CognitiveModel } from '../../types/CognitiveModel'

// Test fixtures
const mockCognitiveModel: CognitiveModel = {
  id: 'contextual-test-1',
  name: 'Test Patient',
  coreBeliefs: [
    {
      belief: 'I am not good enough',
      strength: 8,
      evidence: ['Failed at previous job', 'Parents always criticized me'],
      relatedDomains: ['self-worth', 'performance'],
      formationContext: 'Childhood criticism from parents',
    },
    {
      belief: 'People will abandon me',
      strength: 7,
      evidence: ['Best friend stopped calling', 'Romantic relationships ended'],
      relatedDomains: ['relationships', 'trust'],
      formationContext: 'Multiple relationship losses',
    },
  ],
  emotionalPatterns: [
    {
      emotion: 'anxiety',
      intensity: 8,
      triggers: ['performance evaluations', 'social situations'],
      physicalManifestations: ['racing heart', 'sweating', 'trembling'],
      copingMechanisms: ['avoidance', 'overthinking'],
    },
    {
      emotion: 'sadness',
      intensity: 6,
      triggers: ['rejection', 'criticism', 'loneliness'],
      physicalManifestations: ['tearfulness', 'fatigue'],
      copingMechanisms: ['isolation', 'sleeping'],
    },
  ],
  distortionPatterns: [
    {
      type: 'catastrophizing',
      frequency: 'frequent',
      examples: ['This will be a disaster', 'Everything will go wrong'],
      triggerThemes: ['uncertainty', 'performance'],
    },
    {
      type: 'mind reading',
      frequency: 'occasional',
      examples: ["They think I'm incompetent", "She doesn't like me"],
      triggerThemes: ['social interactions', 'relationships'],
    },
  ],
  conversationalStyle: {
    verbosity: 5,
    emotionalExpressiveness: 4,
    resistance: 6,
    insightLevel: 4,
    preferredCommunicationModes: ['direct questions', 'examples'],
  },
  diagnosisInfo: {
    primaryDiagnosis: 'Generalized Anxiety Disorder',
    severity: 'moderate',
    secondaryDiagnoses: ['Depression'],
    durationOfSymptoms: '6 months',
  },
  demographicInfo: {
    age: 29,
    gender: 'female',
    occupation: 'marketing coordinator',
    familyStatus: 'single',
    culturalFactors: ['Western', 'Urban'],
  },
  presentingIssues: ['anxiety', 'low self-esteem'],
  behavioralPatterns: [
    {
      trigger: 'work stress',
      response: 'procrastination',
      reinforcers: ['anxiety reduction'],
      consequences: ['increased stress'],
      alternateTried: ['time management'],
    },
  ],
  relationshipPatterns: [
    {
      type: 'romantic',
      expectations: ['unconditional acceptance'],
      fears: ['abandonment'],
      behaviors: ['clingy', 'jealous'],
      historicalOutcomes: ['relationships ended'],
    },
  ],
  formativeExperiences: [
    {
      age: 8,
      event: 'parents divorce',
      impact: 'abandonment fears',
      beliefsFormed: ["relationships don't last"],
      emotionalResponse: 'sadness and fear',
    },
  ],
  therapyHistory: {
    previousApproaches: ['CBT'],
    helpfulInterventions: ['thought challenging'],
    unhelpfulInterventions: ['exposure therapy'],
    insights: ['thoughts affect emotions'],
    progressMade: 'some improvement in awareness',
    remainingChallenges: ['still avoiding social situations'],
  },
  goalsForTherapy: ['reduce anxiety', 'improve self-esteem'],
  therapeuticProgress: {
    insights: [
      {
        belief: 'I am not good enough',
        insight: 'This is not based on facts',
        dateAchieved: '2025-01-01',
      },
    ],
    resistanceLevel: 6,
    changeReadiness: 'contemplation',
    sessionProgressLog: [
      {
        sessionNumber: 1,
        keyInsights: ['aware of negative thoughts'],
        resistanceShift: -1,
      },
    ],
  },
}

const mockConversationHistory = [
  {
    speaker: 'therapist',
    message: 'How are you feeling today?',
    timestamp: Date.now() - 3600000, // 1 hour ago
  },
  {
    speaker: 'patient',
    message: "I'm really anxious about the presentation at work tomorrow.",
    timestamp: Date.now() - 3500000,
  },
  {
    speaker: 'therapist',
    message: 'What specifically about the presentation is making you anxious?',
    timestamp: Date.now() - 3400000,
  },
  {
    speaker: 'patient',
    message:
      "I just know I'm going to mess it up and everyone will think I'm incompetent.",
    timestamp: Date.now() - 3300000,
  },
  {
    speaker: 'therapist',
    message:
      "That sounds like a really distressing thought. What evidence do you have that you'll mess it up?",
    timestamp: Date.now() - 3200000,
  },
  {
    speaker: 'patient',
    message:
      "Well, I guess I don't have actual evidence, but it feels so real.",
    timestamp: Date.now() - 3100000,
  },
]

const mockSessionInfo = {
  sessionNumber: 5,
  sessionDuration: 50,
  timeRemaining: 25,
  currentPhase: 'working',
}

const defaultOptions: ContextualEnhancementOptions = {
  includeHistory: true,
  situationAwareness: true,
  temporalTracking: true,
  progressReflection: true,
  adaptiveMemory: true,
  minRelevanceThreshold: 0.3,
}

describe('ContextualResponseService', () => {
  let service: ContextualResponseService

  beforeEach(() => {
    service = new ContextualResponseService()
  })

  describe('Response Context Building', () => {
    it('should build comprehensive response context', async () => {
      const context = await service.buildResponseContext(
        mockConversationHistory,
        mockCognitiveModel,
        mockSessionInfo,
      )

      expect(context).toBeDefined()
      expect(context.historyContext).toBeDefined()
      expect(context.situationContext).toBeDefined()
      expect(context.temporalContext).toBeDefined()
      expect(context.therapeuticAlliance).toBeDefined()

      // Check therapeutic alliance assessment
      expect(
        context.therapeuticAlliance.workingAlliance,
      ).toBeGreaterThanOrEqual(0)
      expect(context.therapeuticAlliance.workingAlliance).toBeLessThanOrEqual(
        10,
      )
      expect(context.therapeuticAlliance.taskAgreement).toBeGreaterThanOrEqual(
        0,
      )
      expect(context.therapeuticAlliance.goalConsensus).toBeGreaterThanOrEqual(
        0,
      )
      expect(context.therapeuticAlliance.bondStrength).toBeGreaterThanOrEqual(0)
    })

    it('should include session progression details', async () => {
      const context = await service.buildResponseContext(
        mockConversationHistory,
        mockCognitiveModel,
        mockSessionInfo,
      )

      expect(context.temporalContext.sessionProgression.sessionNumber).toBe(5)
      expect(context.temporalContext.sessionProgression.sessionDuration).toBe(
        50,
      )
      expect(context.temporalContext.sessionProgression.timeRemaining).toBe(25)
      expect(context.temporalContext.sessionProgression.phase).toBe('working')
    })

    it('should handle empty conversation history', async () => {
      const context = await service.buildResponseContext(
        [],
        mockCognitiveModel,
        mockSessionInfo,
      )

      expect(context).toBeDefined()
      expect(context.historyContext.previousSessions).toHaveLength(0)
      expect(context.therapeuticAlliance.workingAlliance).toBeGreaterThan(0)
    })
  })

  describe('Response Enhancement', () => {
    it('should enhance basic response with contextual information', async () => {
      const baseResponse = "That's an understandable concern."
      const context = await service.buildResponseContext(
        mockConversationHistory,
        mockCognitiveModel,
        mockSessionInfo,
      )

      const enhancement = await service.enhanceResponse(
        baseResponse,
        mockCognitiveModel,
        context,
        defaultOptions,
      )

      expect(enhancement).toBeDefined()
      expect(enhancement.baseResponse).toBe(baseResponse)
      expect(enhancement.enhancedResponse).toBeDefined()
      expect(enhancement.enhancedResponse.length).toBeGreaterThan(
        baseResponse.length,
      )
      expect(enhancement.contextualModifications).toBeDefined()
      expect(enhancement.therapeuticImpact).toBeDefined()
    })

    it('should apply history-based modifications when relevant', async () => {
      const baseResponse = "Let's explore this fear of failure."
      const context = await service.buildResponseContext(
        mockConversationHistory,
        mockCognitiveModel,
        mockSessionInfo,
      )

      // Add some mock history context
      context.historyContext.recurringThemes = [
        {
          theme: 'performance anxiety',
          frequency: 8,
          lastMentioned: '2025-01-09', // 7+ days ago
          emotionalAssociation: 'anxiety',
          progressLevel: 3,
        },
      ]

      const enhancement = await service.enhanceResponse(
        baseResponse,
        mockCognitiveModel,
        context,
        defaultOptions,
      )

      const historyMods = enhancement.contextualModifications.filter(
        (mod) => mod.type === 'history_reference',
      )
      expect(historyMods.length).toBeGreaterThan(0)
    })

    it('should acknowledge high-impact recent events', async () => {
      const baseResponse = 'How are you coping with that?'
      const context = await service.buildResponseContext(
        mockConversationHistory,
        mockCognitiveModel,
        mockSessionInfo,
      )

      // Add high-impact recent event
      context.situationContext.recentEvents = [
        {
          event: 'job interview rejection',
          timeframe: 'yesterday',
          impact: -8,
          category: 'work',
        },
      ]

      const enhancement = await service.enhanceResponse(
        baseResponse,
        mockCognitiveModel,
        context,
        defaultOptions,
      )

      const situationMods = enhancement.contextualModifications.filter(
        (mod) => mod.type === 'situation_acknowledgment',
      )
      expect(situationMods.length).toBeGreaterThan(0)
    })

    it('should track belief evolution over time', async () => {
      const baseResponse = 'I notice a shift in how you talk about yourself.'
      const context = await service.buildResponseContext(
        mockConversationHistory,
        mockCognitiveModel,
        mockSessionInfo,
      )

      // Add belief evolution data
      context.temporalContext.beliefEvolution = [
        {
          beliefId: 'not-good-enough',
          strengthHistory: [
            { date: '2025-01-01', strength: 9, context: 'initial assessment' },
            {
              date: '2025-01-15',
              strength: 7,
              context: 'after cognitive work',
            },
          ],
          changeDirection: 'weakening',
          changeRate: -0.6,
        },
      ]

      const enhancement = await service.enhanceResponse(
        baseResponse,
        mockCognitiveModel,
        context,
        defaultOptions,
      )

      const temporalMods = enhancement.contextualModifications.filter(
        (mod) => mod.type === 'temporal_connection',
      )
      expect(temporalMods.length).toBeGreaterThan(0)
    })

    it('should respect relevance threshold filtering', async () => {
      const baseResponse = 'Tell me more about that.'
      const context = await service.buildResponseContext(
        mockConversationHistory,
        mockCognitiveModel,
        mockSessionInfo,
      )

      const highThresholdOptions: ContextualEnhancementOptions = {
        ...defaultOptions,
        minRelevanceThreshold: 0.9, // Very high threshold
      }

      const enhancement = await service.enhanceResponse(
        baseResponse,
        mockCognitiveModel,
        context,
        highThresholdOptions,
      )

      // With high threshold, fewer modifications should be applied
      expect(enhancement.contextualModifications.length).toBeLessThan(3)
    })

    it('should disable specific enhancement types when requested', async () => {
      const baseResponse = 'That sounds challenging.'
      const context = await service.buildResponseContext(
        mockConversationHistory,
        mockCognitiveModel,
        mockSessionInfo,
      )

      const limitedOptions: ContextualEnhancementOptions = {
        includeHistory: false,
        situationAwareness: false,
        temporalTracking: true,
        progressReflection: true,
        adaptiveMemory: false,
        minRelevanceThreshold: 0.3,
      }

      const enhancement = await service.enhanceResponse(
        baseResponse,
        mockCognitiveModel,
        context,
        limitedOptions,
      )

      const historyMods = enhancement.contextualModifications.filter(
        (mod) => mod.type === 'history_reference',
      )
      const situationMods = enhancement.contextualModifications.filter(
        (mod) => mod.type === 'situation_acknowledgment',
      )

      expect(historyMods.length).toBe(0)
      expect(situationMods.length).toBe(0)
    })
  })

  describe('Conversation Pattern Analysis', () => {
    it('should analyze conversation patterns correctly', () => {
      const patterns = service.analyzeConversationPatterns(
        mockConversationHistory,
      )

      expect(patterns).toBeDefined()
      expect(patterns.recurringThemes).toBeDefined()
      expect(patterns.emotionalProgression).toBeDefined()
      expect(patterns.engagementLevel).toBeGreaterThanOrEqual(0)
      expect(patterns.engagementLevel).toBeLessThanOrEqual(10)
      expect(patterns.resistancePatterns).toBeDefined()
    })

    it('should extract recurring themes from patient messages', () => {
      const patterns = service.analyzeConversationPatterns(
        mockConversationHistory,
      )

      // Should identify themes based on keywords in messages
      expect(patterns.recurringThemes).toContain('anxiety')
    })

    it('should calculate engagement level based on message content', () => {
      const shortMessages = [
        { speaker: 'patient', message: 'Yes.', timestamp: Date.now() },
        { speaker: 'patient', message: 'No.', timestamp: Date.now() },
        { speaker: 'patient', message: 'Maybe.', timestamp: Date.now() },
      ]

      const longMessages = [
        {
          speaker: 'patient',
          message:
            "I've been thinking a lot about what we discussed last week, and I realize that my anxiety really does stem from my childhood experiences with my parents always expecting perfection.",
          timestamp: Date.now(),
        },
      ]

      const shortPatterns = service.analyzeConversationPatterns(shortMessages)
      const longPatterns = service.analyzeConversationPatterns(longMessages)

      expect(longPatterns.engagementLevel).toBeGreaterThan(
        shortPatterns.engagementLevel,
      )
    })

    it('should identify resistance patterns in patient responses', () => {
      const resistantMessages = [
        {
          speaker: 'patient',
          message: "I don't know what to say.",
          timestamp: Date.now(),
        },
        {
          speaker: 'patient',
          message: "I guess that's true.",
          timestamp: Date.now(),
        },
        {
          speaker: 'patient',
          message: "Maybe, I don't know.",
          timestamp: Date.now(),
        },
        {
          speaker: 'patient',
          message: 'Whatever you think.',
          timestamp: Date.now(),
        },
      ]

      const patterns = service.analyzeConversationPatterns(resistantMessages)

      expect(patterns.resistancePatterns.length).toBeGreaterThan(0)
      expect(patterns.resistancePatterns).toContain("frequent_i_don't_know")
    })
  })

  describe('Therapeutic Impact Assessment', () => {
    it('should calculate therapeutic impact metrics', async () => {
      const baseResponse = "That's a significant realization."
      const context = await service.buildResponseContext(
        mockConversationHistory,
        mockCognitiveModel,
        mockSessionInfo,
      )

      const enhancement = await service.enhanceResponse(
        baseResponse,
        mockCognitiveModel,
        context,
        defaultOptions,
      )

      expect(
        enhancement.therapeuticImpact.allianceEffect,
      ).toBeGreaterThanOrEqual(-1)
      expect(enhancement.therapeuticImpact.allianceEffect).toBeLessThanOrEqual(
        1,
      )
      expect(
        enhancement.therapeuticImpact.trustBuilding,
      ).toBeGreaterThanOrEqual(-1)
      expect(enhancement.therapeuticImpact.trustBuilding).toBeLessThanOrEqual(1)
      expect(
        enhancement.therapeuticImpact.insightPotential,
      ).toBeGreaterThanOrEqual(0)
      expect(
        enhancement.therapeuticImpact.insightPotential,
      ).toBeLessThanOrEqual(1)
      expect(
        enhancement.therapeuticImpact.continuityStrength,
      ).toBeGreaterThanOrEqual(0)
      expect(
        enhancement.therapeuticImpact.continuityStrength,
      ).toBeLessThanOrEqual(1)
    })

    it('should extract contextual cues from modifications', async () => {
      const baseResponse = "Let's build on your progress."
      const context = await service.buildResponseContext(
        mockConversationHistory,
        mockCognitiveModel,
        mockSessionInfo,
      )

      // Add various types of context
      context.historyContext.recurringThemes = [
        {
          theme: 'self-worth',
          frequency: 5,
          lastMentioned: '2025-01-10',
          emotionalAssociation: 'sadness',
          progressLevel: 4,
        },
      ]

      const enhancement = await service.enhanceResponse(
        baseResponse,
        mockCognitiveModel,
        context,
        defaultOptions,
      )

      expect(enhancement.contextualCues).toBeDefined()
      expect(enhancement.contextualCues.historyReferences).toBeDefined()
      expect(enhancement.contextualCues.situationalAdaptations).toBeDefined()
      expect(enhancement.contextualCues.temporalConnections).toBeDefined()
      expect(enhancement.contextualCues.progressIndications).toBeDefined()
    })
  })

  describe('Integration and Performance', () => {
    it('should integrate modifications naturally into response', async () => {
      const baseResponse = "That's a valid concern."
      const context = await service.buildResponseContext(
        mockConversationHistory,
        mockCognitiveModel,
        mockSessionInfo,
      )

      const enhancement = await service.enhanceResponse(
        baseResponse,
        mockCognitiveModel,
        context,
        defaultOptions,
      )

      // Enhanced response should flow naturally
      expect(enhancement.enhancedResponse).toContain(baseResponse)
      expect(enhancement.enhancedResponse.split('.').length).toBeGreaterThan(1)
    })

    it('should limit number of modifications to avoid overwhelming', async () => {
      const baseResponse = 'I understand.'
      const context = await service.buildResponseContext(
        mockConversationHistory,
        mockCognitiveModel,
        mockSessionInfo,
      )

      // Add many potential modifications
      context.historyContext.recurringThemes = Array(10)
        .fill(null)
        .map((_, i) => ({
          theme: `theme-${i}`,
          frequency: 8,
          lastMentioned: '2025-01-01',
          emotionalAssociation: 'anxiety',
          progressLevel: 3,
        }))

      const enhancement = await service.enhanceResponse(
        baseResponse,
        mockCognitiveModel,
        context,
        defaultOptions,
      )

      // Should limit to reasonable number of modifications
      expect(enhancement.contextualModifications.length).toBeLessThanOrEqual(3)
    })

    it('should handle error cases gracefully', async () => {
      const baseResponse = 'Test response.'
      const invalidContext = {} as ResponseContext

      await expect(
        service.enhanceResponse(
          baseResponse,
          mockCognitiveModel,
          invalidContext,
          defaultOptions,
        ),
      ).rejects.toThrow()
    })
  })

  describe('Utility Functions', () => {
    it('should provide quick contextual enhancement utility', async () => {
      const baseResponse = 'How does that make you feel?'

      const enhancement = await enhanceResponseWithContext(
        baseResponse,
        mockCognitiveModel,
        mockConversationHistory,
        mockSessionInfo,
      )

      expect(enhancement).toBeDefined()
      expect(enhancement.baseResponse).toBe(baseResponse)
      expect(enhancement.enhancedResponse).toBeDefined()
    })

    it('should work with minimal conversation history', async () => {
      const minimalHistory = [
        { speaker: 'therapist', message: 'Hello.', timestamp: Date.now() },
      ]

      const enhancement = await enhanceResponseWithContext(
        'How are you today?',
        mockCognitiveModel,
        minimalHistory,
        mockSessionInfo,
      )

      expect(enhancement).toBeDefined()
      expect(enhancement.enhancedResponse).toBeDefined()
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle models with minimal data', async () => {
      const minimalModel: CognitiveModel = {
        id: 'minimal',
        name: 'Minimal Patient',
        coreBeliefs: [],
        emotionalPatterns: [],
        distortionPatterns: [],
        conversationalStyle: {
          verbosity: 5,
          emotionalExpressiveness: 4,
          resistance: 5,
          insightLevel: 5,
          preferredCommunicationModes: [],
        },
        diagnosisInfo: {
          primaryDiagnosis: '',
          severity: 'mild',
          secondaryDiagnoses: [],
          durationOfSymptoms: '',
        },
        demographicInfo: {
          age: 30,
          gender: 'unknown',
          occupation: '',
          familyStatus: '',
          culturalFactors: [],
        },
        presentingIssues: [],
        behavioralPatterns: [],
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
        goalsForTherapy: [],
        therapeuticProgress: {
          insights: [],
          resistanceLevel: 5,
          changeReadiness: 'precontemplation',
          sessionProgressLog: [],
        },
      }

      const context = await service.buildResponseContext(
        mockConversationHistory,
        minimalModel,
        mockSessionInfo,
      )

      const enhancement = await service.enhanceResponse(
        "That's interesting.",
        minimalModel,
        context,
        defaultOptions,
      )

      expect(enhancement).toBeDefined()
      expect(enhancement.enhancedResponse).toBeDefined()
    })

    it('should handle very long conversation histories efficiently', async () => {
      const longHistory = Array(100)
        .fill(null)
        .map((_, i) => ({
          speaker: i % 2 === 0 ? 'therapist' : 'patient',
          message: `Message ${i}: This is a test message for performance testing.`,
          timestamp: Date.now() - (100 - i) * 60000, // Spread over 100 minutes
        }))

      const startTime = Date.now()
      const context = await service.buildResponseContext(
        longHistory,
        mockCognitiveModel,
        mockSessionInfo,
      )
      const duration = Date.now() - startTime

      expect(context).toBeDefined()
      expect(duration).toBeLessThan(1000) // Should complete within 1 second
    })
  })
})
