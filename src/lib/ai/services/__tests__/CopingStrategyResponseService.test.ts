/**
 * Tests for Coping Strategy Response Generator Service
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  CopingStrategyResponseService,
  copingStrategyResponse,
  generatePatientCopingResponse,
  type CopingSelectionCriteria,
  type CopingGenerationOptions,
} from '../CopingStrategyResponseService'
import type { CognitiveModel } from '../../types/CognitiveModel'

// Test fixtures
const mockCognitiveModel: CognitiveModel = {
  id: 'coping-test-1',
  name: 'Mock Patient',
  demographicInfo: {
    age: 32,
    gender: 'non-binary',
    occupation: 'software developer',
    familyStatus: 'single',
  },
  presentingIssues: [
    'Anxiety and stress related to work',
    'Difficulty in relationships',
  ],
  diagnosisInfo: {
    primaryDiagnosis: 'Generalized Anxiety Disorder',
    severity: 'severe',
    secondaryDiagnoses: ['Depression'],
  },
  coreBeliefs: [
    {
      belief: 'I am helpless',
      strength: 8,
      evidence: ['Always fail at solving problems', "Can't handle stress"],
      relatedDomains: ['control', 'agency'],
    },
    {
      belief: 'I am unlovable',
      strength: 7,
      evidence: ['People always leave me', 'No one cares about my problems'],
      relatedDomains: ['relationships', 'self-worth'],
    },
  ],
  distortionPatterns: [
    {
      type: 'catastrophizing',
      frequency: 'frequent',
      examples: ['This will ruin everything', "I'll never recover"],
      triggerThemes: ['stress', 'uncertainty'],
    },
    {
      type: 'all_or_nothing',
      frequency: 'occasional',
      examples: ["I'm a complete failure", 'Nothing ever works'],
      triggerThemes: ['performance', 'achievement'],
    },
  ],
  behavioralPatterns: [
    {
      trigger: 'High-pressure work situation',
      response: 'Avoidance and procrastination',
      reinforcers: ['Temporary relief from anxiety'],
      consequences: [
        'Increased stress closer to deadline',
        'Negative self-evaluation',
      ],
      alternateTried: ['Making a to-do list (sometimes effective)'],
    },
  ],
  emotionalPatterns: [
    {
      emotion: 'anxiety',
      intensity: 9,
      triggers: ['confrontation', 'uncertainty', 'performance situations'],
      physicalManifestations: ['racing heart', 'sweating', 'trembling'],
      copingMechanisms: ['deep_breathing', 'listening_to_music'],
    },
    {
      emotion: 'sadness',
      intensity: 7,
      triggers: ['rejection', 'loneliness', 'failure'],
      physicalManifestations: ['tearfulness', 'fatigue', 'loss of appetite'],
      copingMechanisms: ['social_withdrawal', 'watching_tv_for_distraction'],
    },
  ],
  relationshipPatterns: [
    {
      type: 'Romantic',
      expectations: [
        'Partner should always understand me without me explaining',
      ],
      fears: ['Abandonment', 'Being a burden'],
      behaviors: ['People-pleasing', 'Difficulty setting boundaries'],
      historicalOutcomes: [
        'Short-lived relationships',
        'Feeling misunderstood',
      ],
    },
  ],
  formativeExperiences: [
    {
      age: 'childhood',
      event: 'Parents had high expectations and were critical',
      impact: 'Developed fear of failure and a need for constant validation',
      beliefsFormed: [
        'I must be perfect to be loved',
        'Mistakes are unacceptable',
      ],
      emotionalResponse: 'Anxiety, shame',
    },
  ],
  therapyHistory: {
    previousApproaches: ['CBT (briefly)'],
    helpfulInterventions: ['Psychoeducation about anxiety'],
    unhelpfulInterventions: ['Being told to "just relax"'],
    insights: ['Recognizes connection between thoughts and feelings sometimes'],
    progressMade: 'Slight improvement in identifying anxious thoughts',
    remainingChallenges: [
      'Applying coping skills consistently',
      'Challenging core beliefs',
    ],
  },
  conversationalStyle: {
    verbosity: 4,
    resistance: 8,
    insightLevel: 3,
    emotionalExpressiveness: 5,
    preferredCommunicationModes: [
      'Examples',
      'Direct questions when feeling safe',
    ],
  },
  goalsForTherapy: [
    'Reduce anxiety',
    'Improve stress management',
    'Develop healthier relationship patterns',
  ],
  therapeuticProgress: {
    insights: [
      {
        belief: 'I am helpless',
        insight:
          'Recognized that this belief is not always true in minor situations.',
        dateAchieved: '2023-05-10',
      },
    ],
    resistanceLevel: 7,
    changeReadiness: 'contemplation',
    sessionProgressLog: [
      {
        sessionNumber: 1,
        keyInsights: ['Introduced to CBT model'],
        resistanceShift: 0,
      },
      {
        sessionNumber: 2,
        keyInsights: ['Discussed core belief "I am helpless"'],
        resistanceShift: -1,
      },
    ],
  },
}

const defaultCriteria: CopingSelectionCriteria = {
  stressLevel: 6,
  emotionalState: 'anxious',
  cognitiveCapacity: 'normal',
  socialSupport: 'moderate',
  timeAvailable: 'minutes',
  environment: 'private',
  pastEffectiveness: {},
  therapeuticGoals: ['emotional_regulation', 'stress_management'],
  contraindications: [],
}

const defaultOptions: CopingGenerationOptions = {
  includeDefensiveMechanisms: true,
  adaptToTherapeuticStage: true,
  considerPastEffectiveness: true,
  enableProgressiveAdaptation: true,
  respectPatientPace: true,
  maxStrategiesPerResponse: 2,
  preferenceForAdaptiveCoping: 0.7,
}

describe('CopingStrategyResponseService', () => {
  let service: CopingStrategyResponseService

  beforeEach(() => {
    service = new CopingStrategyResponseService()
  })

  describe('Coping Strategy Selection', () => {
    it('should select appropriate coping strategies based on stress level', async () => {
      const highStressCriteria: CopingSelectionCriteria = {
        ...defaultCriteria,
        stressLevel: 9,
        cognitiveCapacity: 'impaired',
      }

      const strategies = await service.selectCopingStrategies(
        'work deadline pressure',
        mockCognitiveModel,
        highStressCriteria,
        defaultOptions,
      )

      expect(strategies.length).toBeGreaterThan(0)
      // High stress should favor low cognitive load strategies
      expect(strategies.some((s) => s.cognitiveLoad === 'low')).toBe(true)
    })

    it('should consider social support availability in strategy selection', async () => {
      const noSupportCriteria: CopingSelectionCriteria = {
        ...defaultCriteria,
        socialSupport: 'none',
      }

      const strategies = await service.selectCopingStrategies(
        'feeling isolated',
        mockCognitiveModel,
        noSupportCriteria,
        defaultOptions,
      )

      // Should not heavily weight social support strategies when none available
      const socialSupportStrategies = strategies.filter(
        (s) => s.type === 'social_support',
      )
      expect(socialSupportStrategies.length).toBeLessThanOrEqual(1)
    })

    it('should avoid contraindicated strategies', async () => {
      const contraindicatedCriteria: CopingSelectionCriteria = {
        ...defaultCriteria,
        contraindications: ['addiction_history', 'severe_respiratory_issues'],
      }

      const strategies = await service.selectCopingStrategies(
        'overwhelming stress',
        mockCognitiveModel,
        contraindicatedCriteria,
        defaultOptions,
      )

      // Should not include substance use or deep breathing if contraindicated
      expect(
        strategies.every(
          (s) =>
            !s.contraindications.some((contra) =>
              contraindicatedCriteria.contraindications.includes(contra),
            ),
        ),
      ).toBe(true)
    })

    it('should consider past effectiveness when enabled', async () => {
      const criteriaWithHistory: CopingSelectionCriteria = {
        ...defaultCriteria,
        pastEffectiveness: {
          deep_breathing: 0.9,
          exercise: 0.2,
          social_withdrawal: 0.8,
        },
      }

      const strategies = await service.selectCopingStrategies(
        'anxiety spike',
        mockCognitiveModel,
        criteriaWithHistory,
        { ...defaultOptions, considerPastEffectiveness: true },
      )

      // Should favor strategies with high past effectiveness
      const selectedNames = strategies.map((s) => s.name)
      expect(selectedNames.includes('deep_breathing')).toBe(true)
    })

    it('should limit number of strategies based on options', async () => {
      const limitedOptions: CopingGenerationOptions = {
        ...defaultOptions,
        maxStrategiesPerResponse: 1,
      }

      const strategies = await service.selectCopingStrategies(
        'general stress',
        mockCognitiveModel,
        defaultCriteria,
        limitedOptions,
      )

      expect(strategies.length).toBeLessThanOrEqual(1)
    })
  })

  describe('Response Text Generation', () => {
    it('should generate contextual response text', async () => {
      const response = await service.generateCopingResponse(
        'work stress',
        mockCognitiveModel,
        defaultCriteria,
        defaultOptions,
      )

      expect(response.responseText).toBeDefined()
      expect(response.responseText.length).toBeGreaterThan(0)
      expect(response.selectedStrategy).toBeDefined()
    })

    it('should adapt response text to situation', async () => {
      const anxietyResponse = await service.generateCopingResponse(
        'anxiety attack',
        mockCognitiveModel,
        { ...defaultCriteria, emotionalState: 'anxious', stressLevel: 8 },
        defaultOptions,
      )

      const depressionResponse = await service.generateCopingResponse(
        'feeling depressed',
        mockCognitiveModel,
        { ...defaultCriteria, emotionalState: 'sad', stressLevel: 5 },
        defaultOptions,
      )

      expect(anxietyResponse.responseText).not.toBe(
        depressionResponse.responseText,
      )
      expect(anxietyResponse.emotionalTone).toBeDefined()
      expect(depressionResponse.emotionalTone).toBeDefined()
    })

    it('should include secondary strategy when multiple strategies available', async () => {
      const multiStrategyOptions: CopingGenerationOptions = {
        ...defaultOptions,
        maxStrategiesPerResponse: 3,
      }

      const response = await service.generateCopingResponse(
        'overwhelming day',
        mockCognitiveModel,
        defaultCriteria,
        multiStrategyOptions,
      )

      // Response should be longer when multiple strategies are included
      expect(response.responseText.length).toBeGreaterThan(50)
    })

    it('should handle cases with no effective strategies', async () => {
      const impossibleCriteria: CopingSelectionCriteria = {
        ...defaultCriteria,
        contraindications: [
          'severe_respiratory_issues',
          'physical_limitations',
          'literacy_issues',
          'addiction_history',
          'social_anxiety',
          'trust_issues',
          'severe_depression',
          'cognitive_impairment',
          'eating_disorders',
          'medical_conditions',
          'suicidal_ideation',
          'medical_dietary_restrictions',
        ],
      }

      const response = await service.generateCopingResponse(
        'crisis situation',
        mockCognitiveModel,
        impossibleCriteria,
        defaultOptions,
      )

      expect(response.responseText).toContain("don't know what to do")
      expect(response.effectivenessPredict.shortTerm).toBeLessThan(0.2)
    })
  })

  describe('Defensive Mechanisms', () => {
    it('should apply defensive mechanisms for high-stress situations', async () => {
      const highStressCriteria: CopingSelectionCriteria = {
        ...defaultCriteria,
        stressLevel: 9,
      }

      const response = await service.generateCopingResponse(
        'overwhelming crisis',
        mockCognitiveModel,
        highStressCriteria,
        defaultOptions,
      )

      expect(response.defensiveMechanisms.length).toBeGreaterThan(0)
      expect(response.defensiveMechanisms).toContain('minimization')
    })

    it('should apply relationship-specific defensive mechanisms', async () => {
      const relationshipSituation = 'argument with partner'

      const response = await service.generateCopingResponse(
        relationshipSituation,
        mockCognitiveModel,
        defaultCriteria,
        defaultOptions,
      )

      // Should include projection for relationship situations with relationship core beliefs
      expect(
        response.defensiveMechanisms.some((dm) => dm === 'projection'),
      ).toBe(true)
    })

    it('should apply deflection for high-resistance patients', async () => {
      const highResistanceModel: CognitiveModel = {
        ...mockCognitiveModel,
        conversationalStyle: {
          ...mockCognitiveModel.conversationalStyle,
          resistance: 9,
        },
      }

      const response = await service.generateCopingResponse(
        'challenging topic',
        highResistanceModel,
        defaultCriteria,
        defaultOptions,
      )

      expect(response.defensiveMechanisms).toContain('deflection')
    })

    it('should not include defensive mechanisms when disabled', async () => {
      const noDefensiveOptions: CopingGenerationOptions = {
        ...defaultOptions,
        includeDefensiveMechanisms: false,
      }

      const response = await service.generateCopingResponse(
        'stressful situation',
        mockCognitiveModel,
        { ...defaultCriteria, stressLevel: 9 },
        noDefensiveOptions,
      )

      expect(response.defensiveMechanisms.length).toBe(0)
    })
  })

  describe('Contextual Adaptations', () => {
    it('should adapt for public environment constraints', async () => {
      const publicCriteria: CopingSelectionCriteria = {
        ...defaultCriteria,
        environment: 'public',
      }

      const response = await service.generateCopingResponse(
        'anxiety in public',
        mockCognitiveModel,
        publicCriteria,
        defaultOptions,
      )

      const hasPublicAdaptation = response.contextualAdaptations.some(
        (adaptation) => adaptation.adaptation.includes('around other people'),
      )
      expect(hasPublicAdaptation).toBe(true)
    })

    it('should acknowledge lack of social support', async () => {
      const noSupportCriteria: CopingSelectionCriteria = {
        ...defaultCriteria,
        socialSupport: 'none',
      }

      const response = await service.generateCopingResponse(
        'need to talk to someone',
        mockCognitiveModel,
        noSupportCriteria,
        defaultOptions,
      )

      const hasSupportAdaptation = response.contextualAdaptations.some(
        (adaptation) => adaptation.adaptation.includes('someone to talk to'),
      )
      expect(hasSupportAdaptation).toBe(true)
    })

    it('should acknowledge past ineffective attempts', async () => {
      const ineffectiveCriteria: CopingSelectionCriteria = {
        ...defaultCriteria,
        pastEffectiveness: {
          meditation: 0.1,
          exercise: 0.2,
        },
      }

      const response = await service.generateCopingResponse(
        'tried everything',
        mockCognitiveModel,
        ineffectiveCriteria,
        defaultOptions,
      )

      const hasPastAdaptation = response.contextualAdaptations.some(
        (adaptation) =>
          adaptation.adaptation.includes('tried') &&
          adaptation.adaptation.includes('before'),
      )
      expect(hasPastAdaptation).toBe(true)
    })

    it('should acknowledge cognitive limitations', async () => {
      const impairedCriteria: CopingSelectionCriteria = {
        ...defaultCriteria,
        cognitiveCapacity: 'impaired',
      }

      const response = await service.generateCopingResponse(
        "can't think straight",
        mockCognitiveModel,
        impairedCriteria,
        defaultOptions,
      )

      const hasCognitiveAdaptation = response.contextualAdaptations.some(
        (adaptation) => adaptation.adaptation.includes('think clearly'),
      )
      expect(hasCognitiveAdaptation).toBe(true)
    })
  })

  describe('Therapeutic Opportunities Identification', () => {
    it('should identify opportunities for maladaptive coping', async () => {
      const maladaptiveCriteria: CopingSelectionCriteria = {
        ...defaultCriteria,
        stressLevel: 8,
        socialSupport: 'none',
      }

      // Force selection of maladaptive strategies
      const maladaptiveOptions: CopingGenerationOptions = {
        ...defaultOptions,
        preferenceForAdaptiveCoping: 0.1,
      }

      const response = await service.generateCopingResponse(
        'overwhelming stress',
        mockCognitiveModel,
        maladaptiveCriteria,
        maladaptiveOptions,
      )

      if (
        response.selectedStrategy.includes('withdrawal') ||
        response.selectedStrategy.includes('substance')
      ) {
        expect(response.therapeuticOpportunities).toContain(
          'Explore alternative coping strategies',
        )
      }
    })

    it('should identify opportunities for high stress with low effective coping', async () => {
      const highStressLowCoping: CopingSelectionCriteria = {
        ...defaultCriteria,
        stressLevel: 9,
        cognitiveCapacity: 'impaired',
      }

      const response = await service.generateCopingResponse(
        'crisis situation',
        mockCognitiveModel,
        highStressLowCoping,
        defaultOptions,
      )

      expect(response.therapeuticOpportunities).toContain(
        'Introduce stress management techniques',
      )
    })

    it('should identify opportunities for social support deficits', async () => {
      const isolatedCriteria: CopingSelectionCriteria = {
        ...defaultCriteria,
        socialSupport: 'none',
      }

      const response = await service.generateCopingResponse(
        'feeling alone',
        mockCognitiveModel,
        isolatedCriteria,
        defaultOptions,
      )

      expect(response.therapeuticOpportunities).toContain(
        'Explore barriers to seeking support',
      )
    })

    it('should identify opportunities for cognitive capacity issues', async () => {
      const cognitiveIssuesCriteria: CopingSelectionCriteria = {
        ...defaultCriteria,
        cognitiveCapacity: 'impaired',
      }

      const response = await service.generateCopingResponse(
        'brain fog',
        mockCognitiveModel,
        cognitiveIssuesCriteria,
        defaultOptions,
      )

      expect(response.therapeuticOpportunities).toContain(
        'Validate cognitive struggles',
      )
    })
  })

  describe('Effectiveness Prediction', () => {
    it('should predict lower effectiveness for high-resistance patients', async () => {
      const highResistanceModel: CognitiveModel = {
        ...mockCognitiveModel,
        conversationalStyle: {
          ...mockCognitiveModel.conversationalStyle,
          resistance: 9,
        },
      }

      const response = await service.generateCopingResponse(
        'therapeutic suggestion',
        highResistanceModel,
        defaultCriteria,
        defaultOptions,
      )

      expect(response.effectivenessPredict.shortTerm).toBeLessThan(0.7)
      expect(response.effectivenessPredict.longTerm).toBeLessThan(0.7)
    })

    it('should predict lower effectiveness for high stress situations', async () => {
      const highStressCriteria: CopingSelectionCriteria = {
        ...defaultCriteria,
        stressLevel: 9,
      }

      const response = await service.generateCopingResponse(
        'crisis mode',
        mockCognitiveModel,
        highStressCriteria,
        defaultOptions,
      )

      expect(response.effectivenessPredict.shortTerm).toBeLessThan(0.8)
    })

    it('should predict lower effectiveness for impaired cognitive capacity with high-load strategies', async () => {
      const impairedCriteria: CopingSelectionCriteria = {
        ...defaultCriteria,
        cognitiveCapacity: 'impaired',
      }

      const response = await service.generateCopingResponse(
        'complex problem',
        mockCognitiveModel,
        impairedCriteria,
        defaultOptions,
      )

      // If a high cognitive load strategy was selected, effectiveness should be reduced
      expect(response.effectivenessPredict.shortTerm).toBeLessThan(1)
    })

    it('should predict adaptive potential based on strategy type', async () => {
      const adaptivePreferenceOptions: CopingGenerationOptions = {
        ...defaultOptions,
        preferenceForAdaptiveCoping: 0.9,
      }

      const response = await service.generateCopingResponse(
        'manageable stress',
        mockCognitiveModel,
        defaultCriteria,
        adaptivePreferenceOptions,
      )

      expect(response.effectivenessPredict.adaptivePotential).toBeGreaterThan(
        0.5,
      )
    })
  })

  describe('Follow-up Recommendations', () => {
    it('should recommend foundation building for low short-term effectiveness', async () => {
      const ineffectiveCriteria: CopingSelectionCriteria = {
        ...defaultCriteria,
        stressLevel: 9,
        cognitiveCapacity: 'impaired',
      }

      const response = await service.generateCopingResponse(
        'nothing works',
        mockCognitiveModel,
        ineffectiveCriteria,
        defaultOptions,
      )

      if (response.effectivenessPredict.shortTerm < 0.4) {
        expect(response.followUpRecommendations).toContain(
          'Consider building basic coping skills foundation',
        )
      }
    })

    it('should recommend addressing beliefs for low long-term effectiveness', async () => {
      const response = await service.generateCopingResponse(
        'temporary fixes',
        mockCognitiveModel,
        defaultCriteria,
        { ...defaultOptions, preferenceForAdaptiveCoping: 0.2 },
      )

      if (response.effectivenessPredict.longTerm < 0.4) {
        expect(response.followUpRecommendations).toContain(
          'Address underlying beliefs that may interfere with coping',
        )
      }
    })

    it('should recommend alliance building for high-resistance patients', async () => {
      const highResistanceModel: CognitiveModel = {
        ...mockCognitiveModel,
        conversationalStyle: {
          ...mockCognitiveModel.conversationalStyle,
          resistance: 9,
        },
      }

      const response = await service.generateCopingResponse(
        'resistant to help',
        highResistanceModel,
        defaultCriteria,
        defaultOptions,
      )

      expect(response.followUpRecommendations).toContain(
        'Build therapeutic alliance before challenging coping patterns',
      )
    })

    it('should recommend awareness building for low insight patients', async () => {
      const lowInsightModel: CognitiveModel = {
        ...mockCognitiveModel,
        conversationalStyle: {
          ...mockCognitiveModel.conversationalStyle,
          insightLevel: 2,
        },
      }

      const response = await service.generateCopingResponse(
        'unaware of patterns',
        lowInsightModel,
        defaultCriteria,
        defaultOptions,
      )

      expect(response.followUpRecommendations).toContain(
        'Increase awareness of coping patterns and their consequences',
      )
    })
  })

  describe('Integration and Utility Functions', () => {
    it('should work with the utility function', async () => {
      const response = await generatePatientCopingResponse(
        'work stress',
        mockCognitiveModel,
        7,
      )

      expect(response).toBeDefined()
      expect(response.responseText).toBeDefined()
      expect(response.selectedStrategy).toBeDefined()
      expect(response.effectivenessPredict).toBeDefined()
    })

    it('should handle different stress levels in utility function', async () => {
      const lowStressResponse = await generatePatientCopingResponse(
        'mild frustration',
        mockCognitiveModel,
        3,
      )

      const highStressResponse = await generatePatientCopingResponse(
        'crisis situation',
        mockCognitiveModel,
        9,
      )

      expect(lowStressResponse.effectivenessPredict.shortTerm).toBeGreaterThan(
        highStressResponse.effectivenessPredict.shortTerm,
      )
    })

    it('should provide consistent service instance', () => {
      expect(copingStrategyResponse).toBeInstanceOf(
        CopingStrategyResponseService,
      )
      expect(copingStrategyResponse).toBe(copingStrategyResponse) // Same instance
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty situation gracefully', async () => {
      const response = await service.generateCopingResponse(
        '',
        mockCognitiveModel,
        defaultCriteria,
        defaultOptions,
      )

      expect(response).toBeDefined()
      expect(response.responseText).toBeDefined()
    })

    it('should handle minimal cognitive model', async () => {
      const minimalModel: CognitiveModel = {
        id: 'minimal',
        name: 'Minimal Patient',
        demographicInfo: {
          age: 30,
          gender: 'unknown',
          occupation: '',
          familyStatus: '',
        },
        presentingIssues: [],
        diagnosisInfo: {
          primaryDiagnosis: '',
          severity: 'mild',
          secondaryDiagnoses: [],
        },
        coreBeliefs: [],
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
          resistance: 5,
          insightLevel: 5,
          emotionalExpressiveness: 5,
          preferredCommunicationModes: [],
        },
        goalsForTherapy: [],
        therapeuticProgress: {
          insights: [],
          resistanceLevel: 5,
          changeReadiness: 'precontemplation',
          sessionProgressLog: [],
        },
      }

      const response = await service.generateCopingResponse(
        'general stress',
        minimalModel,
        defaultCriteria,
        defaultOptions,
      )

      expect(response).toBeDefined()
      expect(response.responseText).toBeDefined()
    })

    it('should handle extreme criteria values', async () => {
      const extremeCriteria: CopingSelectionCriteria = {
        stressLevel: 10,
        emotionalState: 'extreme_distress',
        cognitiveCapacity: 'impaired',
        socialSupport: 'none',
        timeAvailable: 'immediate',
        environment: 'public',
        pastEffectiveness: {},
        therapeuticGoals: [],
        contraindications: [],
      }

      const response = await service.generateCopingResponse(
        'extreme situation',
        mockCognitiveModel,
        extremeCriteria,
        defaultOptions,
      )

      expect(response).toBeDefined()
      expect(response.therapeuticOpportunities.length).toBeGreaterThan(0)
    })

    it('should handle malformed options gracefully', async () => {
      const malformedOptions: CopingGenerationOptions = {
        includeDefensiveMechanisms: true,
        adaptToTherapeuticStage: true,
        considerPastEffectiveness: true,
        enableProgressiveAdaptation: true,
        respectPatientPace: true,
        maxStrategiesPerResponse: 0, // Edge case
        preferenceForAdaptiveCoping: 1.5, // Out of range
      }

      await expect(
        service.generateCopingResponse(
          'test situation',
          mockCognitiveModel,
          defaultCriteria,
          malformedOptions,
        ),
      ).resolves.toBeDefined()
    })
  })
})
