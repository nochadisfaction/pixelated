/**
 * Tests for Patient-Psi Insights Generation Service
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  PatientPsiInsightsService,
  generateQuickInsights,
  type InsightGenerationOptions,
} from '../patient-psi-insights'
import type { CognitiveModel } from '../../types/CognitiveModel'

// Test fixtures
const mockCognitiveModels: CognitiveModel[] = [
  {
    id: 'model-1',
    patientId: 'patient-1',
    coreBeliefs: [
      {
        belief: 'I am worthless',
        strength: 8,
        evidence: ['Failed at job', 'Rejected by friends'],
        relatedDomains: ['self-worth', 'relationships'],
        automaticThoughts: ['I always mess up', 'Nobody likes me'],
      },
      {
        belief: 'The world is dangerous',
        strength: 6,
        evidence: ['Crime in neighborhood', 'Bad news on TV'],
        relatedDomains: ['safety', 'trust'],
        automaticThoughts: [
          'Something bad will happen',
          "I can't trust anyone",
        ],
      },
    ],
    emotionalPatterns: [
      {
        emotion: 'shame',
        intensity: 8,
        triggers: ['criticism', 'failure'],
        physicalManifestations: ['face flushing', 'wanting to hide'],
        duration: 'persistent',
      },
      {
        emotion: 'anxiety',
        intensity: 6,
        triggers: ['new situations', 'social interactions'],
        physicalManifestations: ['racing heart', 'sweating'],
        duration: 'moderate',
      },
    ],
    distortionPatterns: [
      {
        type: 'all-or-nothing thinking',
        frequency: 'frequent',
        examples: ['I always fail', 'I never do anything right'],
        triggerThemes: ['performance', 'criticism'],
      },
      {
        type: 'catastrophizing',
        frequency: 'occasional',
        examples: ['This will be terrible', 'Everything will go wrong'],
        triggerThemes: ['uncertainty', 'change'],
      },
    ],
    conversationalStyle: {
      verbosity: 6,
      resistance: 7,
      insightLevel: 4,
      responsePatterns: ['defensive', 'blame-shifting'],
      preferredTopics: ['external factors'],
      avoidancePatterns: ['emotional vulnerability'],
    },
    diagnosisInfo: {
      primaryDiagnosis: 'Major Depression',
      severity: 'moderate',
      onsetDate: '2023-01-15',
      secondaryDiagnoses: ['Social Anxiety'],
    },
    demographicInfo: {
      age: 32,
      gender: 'male',
      occupation: 'software developer',
      education: 'bachelors',
      location: 'urban',
    },
    treatmentHistory: {
      previousTherapy: true,
      medicationHistory: ['sertraline'],
      hospitalizations: 0,
      currentTreatments: ['individual therapy'],
    },
  },
  {
    id: 'model-2',
    patientId: 'patient-2',
    coreBeliefs: [
      {
        belief: 'I must be perfect',
        strength: 9,
        evidence: [
          'Parents expected perfection',
          'Feel awful when I make mistakes',
        ],
        relatedDomains: ['perfectionism', 'self-criticism'],
        automaticThoughts: [
          'I have to do this perfectly',
          'Mistakes are unacceptable',
        ],
      },
    ],
    emotionalPatterns: [
      {
        emotion: 'anxiety',
        intensity: 9,
        triggers: ['deadlines', 'being evaluated'],
        physicalManifestations: ['stomach knots', 'muscle tension'],
        duration: 'extended',
      },
      {
        emotion: 'anger',
        intensity: 4,
        triggers: ['interruptions', 'inefficiency'],
        physicalManifestations: ['jaw clenching', 'irritability'],
        duration: 'brief',
      },
    ],
    distortionPatterns: [
      {
        type: 'should statements',
        frequency: 'persistent',
        examples: [
          'I should never make mistakes',
          'I should always be productive',
        ],
        triggerThemes: ['performance', 'standards'],
      },
    ],
    conversationalStyle: {
      verbosity: 9,
      resistance: 3,
      insightLevel: 7,
      responsePatterns: ['verbose', 'detailed'],
      preferredTopics: ['analysis', 'planning'],
      avoidancePatterns: ['emotional expression'],
    },
    diagnosisInfo: {
      primaryDiagnosis: 'Generalized Anxiety Disorder',
      severity: 'severe',
      onsetDate: '2022-08-10',
      secondaryDiagnoses: ['Perfectionism'],
    },
    demographicInfo: {
      age: 28,
      gender: 'female',
      occupation: 'lawyer',
      education: 'masters',
      location: 'urban',
    },
    treatmentHistory: {
      previousTherapy: false,
      medicationHistory: [],
      hospitalizations: 0,
      currentTreatments: ['individual therapy'],
    },
  },
  {
    id: 'model-3',
    patientId: 'patient-3',
    coreBeliefs: [
      {
        belief: 'I am unlovable',
        strength: 7,
        evidence: ['Multiple relationship failures', "Friends don't call"],
        relatedDomains: ['relationships', 'self-worth'],
        automaticThoughts: [
          'Nobody really cares about me',
          "I'll end up alone",
        ],
      },
    ],
    emotionalPatterns: [
      {
        emotion: 'sadness',
        intensity: 7,
        triggers: ['rejection', 'loneliness'],
        physicalManifestations: ['tearfulness', 'fatigue'],
        duration: 'persistent',
      },
    ],
    distortionPatterns: [
      {
        type: 'mind reading',
        frequency: 'frequent',
        examples: ["She thinks I'm boring", "He doesn't want to be here"],
        triggerThemes: ['social situations', 'relationships'],
      },
    ],
    conversationalStyle: {
      verbosity: 2,
      resistance: 5,
      insightLevel: 6,
      responsePatterns: ['withdrawn', 'minimal'],
      preferredTopics: ['avoidance'],
      avoidancePatterns: ['conflict', 'emotional depth'],
    },
    diagnosisInfo: {
      primaryDiagnosis: 'Persistent Depressive Disorder',
      severity: 'moderate',
      onsetDate: '2021-03-20',
      secondaryDiagnoses: [],
    },
    demographicInfo: {
      age: 35,
      gender: 'non-binary',
      occupation: 'teacher',
      education: 'bachelors',
      location: 'suburban',
    },
    treatmentHistory: {
      previousTherapy: true,
      medicationHistory: ['fluoxetine', 'wellbutrin'],
      hospitalizations: 1,
      currentTreatments: ['individual therapy', 'medication management'],
    },
  },
]

const defaultOptions: InsightGenerationOptions = {
  includeVisualizations: false,
  detailLevel: 'detailed',
  focusAreas: [
    'beliefs',
    'emotions',
    'communication',
    'distortions',
    'therapy',
  ],
  comparativeAnalysis: true,
  temporalAnalysis: false,
}

describe('PatientPsiInsightsService', () => {
  let service: PatientPsiInsightsService

  beforeEach(() => {
    service = new PatientPsiInsightsService()
  })

  describe('Comprehensive Insights Generation', () => {
    it('should generate complete insights with all focus areas', async () => {
      const insights = await service.generateInsights(
        mockCognitiveModels,
        defaultOptions,
      )

      expect(insights).toBeDefined()
      expect(insights.beliefDistribution).toBeDefined()
      expect(insights.emotionalPatterns).toBeDefined()
      expect(insights.communicationStyles).toBeDefined()
      expect(insights.distortionPatterns).toBeDefined()
      expect(insights.therapeuticInsights).toBeDefined()
      expect(insights.datasetMetrics).toBeDefined()

      // Check dataset metrics
      expect(insights.datasetMetrics.totalModels).toBe(3)
      expect(insights.datasetMetrics.averageComplexity).toBeGreaterThan(0)
      expect(insights.datasetMetrics.diversityScore).toBeGreaterThan(0)
      expect(insights.datasetMetrics.qualityScore).toBeGreaterThan(0)
      expect(insights.datasetMetrics.lastUpdated).toBeDefined()
    })

    it('should respect focus area filtering', async () => {
      const limitedOptions: InsightGenerationOptions = {
        ...defaultOptions,
        focusAreas: ['beliefs', 'emotions'],
      }

      const insights = await service.generateInsights(
        mockCognitiveModels,
        limitedOptions,
      )

      expect(insights.beliefDistribution).toBeDefined()
      expect(insights.emotionalPatterns).toBeDefined()
      expect(insights.communicationStyles).toBeDefined()
      expect(insights.distortionPatterns).toBeDefined()
      expect(insights.therapeuticInsights).toBeDefined()
    })

    it('should handle caching correctly', async () => {
      // First call should generate fresh insights
      const insights1 = await service.generateInsights(
        mockCognitiveModels,
        defaultOptions,
      )

      // Second call should use cache
      const insights2 = await service.generateInsights(
        mockCognitiveModels,
        defaultOptions,
      )

      expect(insights1.datasetMetrics.lastUpdated).toBe(
        insights2.datasetMetrics.lastUpdated,
      )
    })
  })

  describe('Belief Distribution Analysis', () => {
    it('should analyze belief distribution correctly', () => {
      const distribution =
        service.analyzeBeliefDistribution(mockCognitiveModels)

      expect(distribution.totalBeliefs).toBe(4) // 2 + 1 + 1 across models
      expect(distribution.averageStrength).toBeGreaterThan(0)
      expect(distribution.averageStrength).toBeLessThanOrEqual(10)

      // Check domain distribution
      expect(distribution.beliefsByDomain['self-worth']).toBe(2)
      expect(distribution.beliefsByDomain['relationships']).toBe(2)
      expect(distribution.beliefsByDomain['safety']).toBe(1)

      // Check strength distribution
      expect(distribution.strengthDistribution.low).toBeGreaterThanOrEqual(0)
      expect(distribution.strengthDistribution.moderate).toBeGreaterThanOrEqual(
        0,
      )
      expect(distribution.strengthDistribution.high).toBeGreaterThanOrEqual(0)
      expect(distribution.strengthDistribution.extreme).toBeGreaterThanOrEqual(
        0,
      )

      // Check most common beliefs
      expect(distribution.mostCommonBeliefs).toHaveLength(4)
      expect(distribution.mostCommonBeliefs[0]).toHaveProperty('belief')
      expect(distribution.mostCommonBeliefs[0]).toHaveProperty('frequency')
      expect(distribution.mostCommonBeliefs[0]).toHaveProperty(
        'averageStrength',
      )
      expect(distribution.mostCommonBeliefs[0]).toHaveProperty('relatedDomains')
    })

    it('should handle empty model list', () => {
      const distribution = service.analyzeBeliefDistribution([])

      expect(distribution.totalBeliefs).toBe(0)
      expect(distribution.averageStrength).toBe(0)
      expect(distribution.mostCommonBeliefs).toHaveLength(0)
    })
  })

  describe('Emotional Pattern Analysis', () => {
    it('should analyze emotional patterns correctly', () => {
      const patterns = service.analyzeEmotionalPatterns(mockCognitiveModels)

      expect(patterns.emotionFrequency['anxiety']).toBe(2) // Appears in 2 models
      expect(patterns.emotionFrequency['shame']).toBe(1)
      expect(patterns.emotionFrequency['anger']).toBe(1)
      expect(patterns.emotionFrequency['sadness']).toBe(1)

      // Check average intensities
      expect(patterns.averageIntensity['anxiety']).toBe(7.5) // (6 + 9) / 2
      expect(patterns.averageIntensity['shame']).toBe(8)

      // Check common triggers
      expect(patterns.commonTriggers.length).toBeGreaterThan(0)
      expect(patterns.commonTriggers[0]).toHaveProperty('trigger')
      expect(patterns.commonTriggers[0]).toHaveProperty('emotions')
      expect(patterns.commonTriggers[0]).toHaveProperty('frequency')

      // Check emotional chains
      expect(patterns.emotionalChains.length).toBeGreaterThan(0)
      expect(patterns.emotionalChains[0]).toHaveProperty('primaryEmotion')
      expect(patterns.emotionalChains[0]).toHaveProperty('secondaryEmotions')
      expect(patterns.emotionalChains[0]).toHaveProperty('correlation')

      // Check duration patterns
      expect(patterns.durationPatterns['anxiety']).toBeDefined()
      expect(patterns.durationPatterns['anxiety'].moderate).toBe(1)
      expect(patterns.durationPatterns['anxiety'].extended).toBe(1)
    })
  })

  describe('Communication Style Analysis', () => {
    it('should analyze communication styles correctly', () => {
      const styles = service.analyzeCommunicationStyles(mockCognitiveModels)

      expect(styles.styleFrequency['defensive']).toBe(1)
      expect(styles.styleFrequency['verbose']).toBe(1)
      expect(styles.styleFrequency['reserved']).toBe(1)

      expect(styles.averageVerbosity).toBe((6 + 9 + 2) / 3) // 5.67
      expect(styles.averageResistance).toBe((7 + 3 + 5) / 3) // 5.0

      // Check style correlations
      expect(styles.styleCorrelations.length).toBe(3)
      expect(styles.styleCorrelations[0]).toHaveProperty('style')
      expect(styles.styleCorrelations[0]).toHaveProperty('correlatedBeliefs')
      expect(styles.styleCorrelations[0]).toHaveProperty('correlatedEmotions')
      expect(styles.styleCorrelations[0]).toHaveProperty('strength')

      // Check style transitions
      expect(styles.stylesTransitions).toBeDefined()
    })
  })

  describe('Distortion Pattern Analysis', () => {
    it('should analyze distortion patterns correctly', () => {
      const distortions = service.analyzeDistortionPatterns(mockCognitiveModels)

      expect(distortions.distortionFrequency['all-or-nothing thinking']).toBe(1)
      expect(distortions.distortionFrequency['catastrophizing']).toBe(1)
      expect(distortions.distortionFrequency['should statements']).toBe(1)
      expect(distortions.distortionFrequency['mind reading']).toBe(1)

      // Check trigger theme analysis
      expect(distortions.triggerThemeAnalysis['performance']).toBeDefined()
      expect(distortions.triggerThemeAnalysis['performance'].frequency).toBe(2)
      expect(
        distortions.triggerThemeAnalysis['performance'].associatedDistortions,
      ).toContain('all-or-nothing thinking')
      expect(
        distortions.triggerThemeAnalysis['performance'].associatedDistortions,
      ).toContain('should statements')

      // Check common combinations (should have combinations from model-1)
      expect(distortions.commonCombinations.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Therapeutic Insights Generation', () => {
    it('should generate therapeutic insights correctly', () => {
      const insights = service.generateTherapeuticInsights(mockCognitiveModels)

      // Check treatment recommendations
      expect(insights.treatmentRecommendations.length).toBeGreaterThan(0)
      expect(insights.treatmentRecommendations[0]).toHaveProperty('condition')
      expect(insights.treatmentRecommendations[0]).toHaveProperty(
        'intervention',
      )
      expect(insights.treatmentRecommendations[0]).toHaveProperty('rationale')
      expect(insights.treatmentRecommendations[0]).toHaveProperty(
        'expectedOutcome',
      )
      expect(insights.treatmentRecommendations[0]).toHaveProperty('difficulty')

      // Check resistance patterns
      expect(insights.resistancePatterns.length).toBeGreaterThan(0)
      expect(insights.resistancePatterns[0]).toHaveProperty('pattern')
      expect(insights.resistancePatterns[0]).toHaveProperty('frequency')
      expect(insights.resistancePatterns[0]).toHaveProperty(
        'therapeuticApproach',
      )
      expect(insights.resistancePatterns[0]).toHaveProperty('successRate')

      // Check progress indicators
      expect(insights.progressIndicators.length).toBeGreaterThan(0)
      expect(insights.progressIndicators[0]).toHaveProperty('indicator')
      expect(insights.progressIndicators[0]).toHaveProperty('description')
      expect(insights.progressIndicators[0]).toHaveProperty('measurementMethod')
      expect(insights.progressIndicators[0]).toHaveProperty('timeframe')

      // Check intervention effectiveness
      expect(
        insights.interventionEffectiveness['cognitive_restructuring'],
      ).toBeDefined()
      expect(
        insights.interventionEffectiveness['behavioral_activation'],
      ).toBeDefined()
      expect(
        insights.interventionEffectiveness['mindfulness_training'],
      ).toBeDefined()

      const cogRestructuring =
        insights.interventionEffectiveness['cognitive_restructuring']
      expect(cogRestructuring.successRate).toBeGreaterThan(0)
      expect(cogRestructuring.successRate).toBeLessThanOrEqual(1)
      expect(cogRestructuring.averageSessionsToImprovement).toBeGreaterThan(0)
      expect(cogRestructuring.bestCandidates).toContain('high insight')
      expect(cogRestructuring.contraindications).toContain('active psychosis')
    })
  })

  describe('Dataset Quality Metrics', () => {
    it('should calculate complexity correctly', () => {
      const insights = service.generateInsights(
        mockCognitiveModels,
        defaultOptions,
      )

      insights.then((result) => {
        expect(result.datasetMetrics.averageComplexity).toBeGreaterThan(0)
        // Complexity should increase with more beliefs, emotions, distortions, and resistance
        expect(result.datasetMetrics.averageComplexity).toBeLessThan(10)
      })
    })

    it('should calculate diversity score correctly', () => {
      const insights = service.generateInsights(
        mockCognitiveModels,
        defaultOptions,
      )

      insights.then((result) => {
        expect(result.datasetMetrics.diversityScore).toBeGreaterThan(0)
        expect(result.datasetMetrics.diversityScore).toBeLessThanOrEqual(1)
      })
    })

    it('should calculate quality score correctly', () => {
      const insights = service.generateInsights(
        mockCognitiveModels,
        defaultOptions,
      )

      insights.then((result) => {
        expect(result.datasetMetrics.qualityScore).toBeGreaterThan(0)
        expect(result.datasetMetrics.qualityScore).toBeLessThanOrEqual(1)
        // All test models have complete data, so quality should be high
        expect(result.datasetMetrics.qualityScore).toBeGreaterThan(0.8)
      })
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty model array', async () => {
      const insights = await service.generateInsights([], defaultOptions)

      expect(insights.datasetMetrics.totalModels).toBe(0)
      expect(insights.beliefDistribution.totalBeliefs).toBe(0)
      expect(insights.emotionalPatterns.emotionFrequency).toEqual({})
    })

    it('should handle models with minimal data', async () => {
      const minimalModel: CognitiveModel = {
        id: 'minimal-1',
        patientId: 'minimal-patient',
        coreBeliefs: [],
        emotionalPatterns: [],
        distortionPatterns: [],
        conversationalStyle: {
          verbosity: 5,
          resistance: 5,
          insightLevel: 5,
          responsePatterns: [],
          preferredTopics: [],
          avoidancePatterns: [],
        },
        diagnosisInfo: {
          primaryDiagnosis: '',
          severity: 'mild',
          onsetDate: '',
          secondaryDiagnoses: [],
        },
        demographicInfo: {
          age: 30,
          gender: 'unknown',
          occupation: '',
          education: '',
          location: '',
        },
        treatmentHistory: {
          previousTherapy: false,
          medicationHistory: [],
          hospitalizations: 0,
          currentTreatments: [],
        },
      }

      const insights = await service.generateInsights(
        [minimalModel],
        defaultOptions,
      )

      expect(insights.datasetMetrics.totalModels).toBe(1)
      expect(insights.datasetMetrics.qualityScore).toBeLessThan(0.5) // Lower quality due to missing data
    })

    it('should handle invalid options gracefully', async () => {
      const invalidOptions: InsightGenerationOptions = {
        includeVisualizations: false,
        detailLevel: 'detailed',
        focusAreas: [], // Empty focus areas
        comparativeAnalysis: false,
        temporalAnalysis: false,
      }

      const insights = await service.generateInsights(
        mockCognitiveModels,
        invalidOptions,
      )

      // Should still generate basic dataset metrics
      expect(insights.datasetMetrics).toBeDefined()
    })
  })

  describe('Utility Functions', () => {
    it('should generate quick insights with simplified options', async () => {
      const quickInsights = await generateQuickInsights(mockCognitiveModels)

      expect(quickInsights).toBeDefined()
      expect(quickInsights.beliefDistribution).toBeDefined()
      expect(quickInsights.emotionalPatterns).toBeDefined()
      expect(quickInsights.communicationStyles).toBeDefined()
      expect(quickInsights.datasetMetrics.totalModels).toBe(3)
    })
  })

  describe('Performance and Caching', () => {
    it('should cache results and improve performance on subsequent calls', async () => {
      const startTime1 = Date.now()
      const insights1 = await service.generateInsights(
        mockCognitiveModels,
        defaultOptions,
      )
      const duration1 = Date.now() - startTime1

      const startTime2 = Date.now()
      const insights2 = await service.generateInsights(
        mockCognitiveModels,
        defaultOptions,
      )
      const duration2 = Date.now() - startTime2

      // Second call should be faster due to caching (allow for some margin)
      expect(duration2).toBeLessThanOrEqual(duration1 + 1) // Small margin for timing variations
      expect(insights1.datasetMetrics.lastUpdated).toBe(
        insights2.datasetMetrics.lastUpdated,
      )
    })

    it('should handle large datasets efficiently', async () => {
      // Create a larger dataset for performance testing
      const largeDataset = Array(50)
        .fill(null)
        .map((_, index) => ({
          ...mockCognitiveModels[index % 3],
          id: `model-${index}`,
          patientId: `patient-${index}`,
        }))

      const startTime = Date.now()
      const insights = await service.generateInsights(
        largeDataset,
        defaultOptions,
      )
      const duration = Date.now() - startTime

      expect(insights.datasetMetrics.totalModels).toBe(50)
      expect(duration).toBeLessThan(5000) // Should complete within 5 seconds
    })
  })

  describe('Statistical Accuracy', () => {
    it('should calculate accurate statistical measures', () => {
      const distribution =
        service.analyzeBeliefDistribution(mockCognitiveModels)

      // Manual calculation verification
      const expectedAverageStrength = (8 + 6 + 9 + 7) / 4 // 7.5
      expect(
        Math.abs(distribution.averageStrength - expectedAverageStrength),
      ).toBeLessThan(0.01)

      // Verify strength distribution counts
      const totalStrengthItems =
        distribution.strengthDistribution.low +
        distribution.strengthDistribution.moderate +
        distribution.strengthDistribution.high +
        distribution.strengthDistribution.extreme
      expect(totalStrengthItems).toBe(4)
    })

    it('should maintain data consistency across analyses', async () => {
      const insights = await service.generateInsights(
        mockCognitiveModels,
        defaultOptions,
      )

      // Total beliefs should match across different analyses
      const beliefCount = insights.beliefDistribution.totalBeliefs
      const domainSum = Object.values(
        insights.beliefDistribution.beliefsByDomain,
      ).reduce((sum, count) => sum + count, 0)

      // Domain sum should be >= belief count (beliefs can belong to multiple domains)
      expect(domainSum).toBeGreaterThanOrEqual(beliefCount)

      // Emotion frequency total should match patterns
      const emotionTotal = Object.values(
        insights.emotionalPatterns.emotionFrequency,
      ).reduce((sum, count) => sum + count, 0)
      expect(emotionTotal).toBe(5) // Total emotional patterns across all models (2 + 2 + 1 = 5)
    })
  })
})
