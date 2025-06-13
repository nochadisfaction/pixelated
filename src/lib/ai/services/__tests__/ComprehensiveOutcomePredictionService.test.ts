/**
 * Comprehensive Outcome Prediction Service Tests
 *
 * Test suite for the Comprehensive Outcome Prediction Service covering
 * treatment outcome forecasting algorithms and challenge prediction algorithms.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  ComprehensiveOutcomePredictionService,
  createComprehensiveOutcomePredictionService,
  OutcomePredictionUtils,
  type PredictionConfiguration,
  type TreatmentOutcomePrediction,
  type OutcomeMetrics,
} from '../ComprehensiveOutcomePredictionService'
import type { Goal } from '../TreatmentPlanningService'
import type { EmotionAnalysis } from '../../../../types/emotion'
import type { TherapySession } from '../../../../types/therapy'

// Mock data for testing
const mockGoal: Goal = {
  id: 'goal-123',
  clientId: 'client-123',
  title: 'Reduce anxiety symptoms',
  description: 'Work on managing anxiety through CBT techniques',
  category: 'mental_health',
  priority: 'high',
  status: 'active',
  progress: 45,
  targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
  createdAt: new Date(),
  updatedAt: new Date(),
  milestones: [
    {
      id: 'milestone-1',
      title: 'Learn breathing techniques',
      description: 'Master deep breathing exercises',
      targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      completed: true,
      completedAt: new Date(),
    },
  ],
  barriers: ['work stress', 'perfectionism'],
  supportingFactors: ['family support', 'motivation'],
  progressUpdates: [
    {
      id: 'update-1',
      date: new Date(),
      previousProgress: 30,
      newProgress: 45,
      notes: 'Good progress with breathing exercises',
      evidence: ['completed homework', 'reported less anxiety'],
      observations: ['more confident in sessions'],
      nextSteps: ['practice mindfulness', 'challenge negative thoughts'],
    },
  ],
}

const mockSessionData: TherapySession[] = [
  {
    id: 'session-1',
    clientId: 'client-123',
    therapistId: 'therapist-456',
    startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    endTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
    duration: 60,
    sessionType: 'individual',
    status: 'completed',
    notes: 'Client showed good engagement and progress',
    goals: ['goal-123'],
    interventions: ['CBT', 'breathing exercises'],
    homework: ['practice breathing daily'],
    nextSession: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'session-2',
    clientId: 'client-123',
    therapistId: 'therapist-456',
    startTime: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    endTime: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000 + 50 * 60 * 1000),
    duration: 50,
    sessionType: 'individual',
    status: 'completed',
    notes: 'Initial assessment and goal setting',
    goals: ['goal-123'],
    interventions: ['assessment', 'psychoeducation'],
    homework: ['mood tracking'],
    nextSession: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  },
]

const mockEmotionAnalyses: EmotionAnalysis[] = [
  {
    id: 'emotion-1',
    sessionId: 'session-1',
    timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    emotions: {
      anxiety: 0.6,
      sadness: 0.3,
      joy: 0.4,
      anger: 0.2,
      fear: 0.5,
      surprise: 0.1,
      disgust: 0.1,
    },
    valence: 0.3,
    arousal: 0.7,
    dominance: 0.4,
    overallSentiment: 'negative',
    confidence: 0.85,
    context: 'discussing work stress',
    triggers: ['work deadline', 'perfectionism'],
    copingStrategies: ['breathing exercises'],
    recommendations: ['continue CBT techniques'],
  },
  {
    id: 'emotion-2',
    sessionId: 'session-2',
    timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    emotions: {
      anxiety: 0.8,
      sadness: 0.4,
      joy: 0.2,
      anger: 0.3,
      fear: 0.7,
      surprise: 0.1,
      disgust: 0.1,
    },
    valence: 0.2,
    arousal: 0.8,
    dominance: 0.3,
    overallSentiment: 'negative',
    confidence: 0.9,
    context: 'initial assessment',
    triggers: ['general anxiety', 'work stress'],
    copingStrategies: [],
    recommendations: ['start CBT', 'learn relaxation techniques'],
  },
]

describe('ComprehensiveOutcomePredictionService', () => {
  let service: ComprehensiveOutcomePredictionService
  let config: PredictionConfiguration

  beforeEach(() => {
    config = {
      enableOutcomeForecasting: true,
      enableChallengePrediction: true,
      predictionHorizon: 90,
      updateFrequency: 24,
      confidenceThreshold: 0.7,
      modelSelectionStrategy: 'ensemble',
      uncertaintyQuantification: true,
      realTimeUpdates: true,
    }
    service = new ComprehensiveOutcomePredictionService(config)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      const defaultService = new ComprehensiveOutcomePredictionService()
      expect(defaultService).toBeDefined()
    })

    it('should merge provided configuration with defaults', () => {
      const customConfig = { predictionHorizon: 60, confidenceThreshold: 0.8 }
      const customService = new ComprehensiveOutcomePredictionService(
        customConfig,
      )
      expect(customService).toBeDefined()
    })

    it('should create service using factory function', () => {
      const factoryService = createComprehensiveOutcomePredictionService(config)
      expect(factoryService).toBeInstanceOf(
        ComprehensiveOutcomePredictionService,
      )
    })
  })

  describe('Treatment Outcome Prediction', () => {
    it('should generate comprehensive treatment outcome predictions', async () => {
      const predictions = await service.generateTreatmentOutcomePrediction(
        'client-123',
        'treatment-plan-456',
        mockSessionData,
        mockEmotionAnalyses,
        [mockGoal],
      )

      expect(predictions).toBeDefined()
      expect(predictions.length).toBeGreaterThan(0)

      // Should include goal achievement, symptom reduction, and engagement predictions
      const predictionTypes = predictions.map((p) => p.predictionType)
      expect(predictionTypes).toContain('goal_achievement')
      expect(predictionTypes).toContain('symptom_reduction')
      expect(predictionTypes).toContain('engagement')
    })

    it('should generate goal achievement predictions with proper structure', async () => {
      const predictions = await service.generateTreatmentOutcomePrediction(
        'client-123',
        'treatment-plan-456',
        mockSessionData,
        mockEmotionAnalyses,
        [mockGoal],
      )

      const goalPrediction = predictions.find(
        (p) => p.predictionType === 'goal_achievement',
      )
      expect(goalPrediction).toBeDefined()
      expect(goalPrediction!.targetGoalId).toBe(mockGoal.id)
      expect(goalPrediction!.probability).toBeGreaterThan(0)
      expect(goalPrediction!.probability).toBeLessThanOrEqual(1)
      expect(goalPrediction!.confidence).toBeGreaterThan(0)
      expect(goalPrediction!.confidence).toBeLessThanOrEqual(1)
      expect(goalPrediction!.keyFactors).toBeDefined()
      expect(goalPrediction!.recommendations).toBeDefined()
      expect(goalPrediction!.uncertaintyBounds).toBeDefined()
    })

    it('should generate symptom reduction predictions', async () => {
      const predictions = await service.generateTreatmentOutcomePrediction(
        'client-123',
        'treatment-plan-456',
        mockSessionData,
        mockEmotionAnalyses,
        [mockGoal],
      )

      const symptomPrediction = predictions.find(
        (p) => p.predictionType === 'symptom_reduction',
      )
      expect(symptomPrediction).toBeDefined()
      expect(symptomPrediction!.expectedOutcome).toBeDefined()
      expect(
        symptomPrediction!.expectedOutcome.symptomSeverity,
      ).toBeGreaterThan(0)
      expect(
        symptomPrediction!.expectedOutcome.functionalImprovement,
      ).toBeGreaterThan(0)
    })

    it('should generate engagement predictions', async () => {
      const predictions = await service.generateTreatmentOutcomePrediction(
        'client-123',
        'treatment-plan-456',
        mockSessionData,
        mockEmotionAnalyses,
        [mockGoal],
      )

      const engagementPrediction = predictions.find(
        (p) => p.predictionType === 'engagement',
      )
      expect(engagementPrediction).toBeDefined()
      expect(engagementPrediction!.probability).toBeGreaterThan(0)
      expect(engagementPrediction!.riskFactors).toBeDefined()
      expect(engagementPrediction!.protectiveFactors).toBeDefined()
    })

    it('should include model information in predictions', async () => {
      const predictions = await service.generateTreatmentOutcomePrediction(
        'client-123',
        'treatment-plan-456',
        mockSessionData,
        mockEmotionAnalyses,
        [mockGoal],
      )

      for (const prediction of predictions) {
        expect(prediction.modelUsed).toBeDefined()
        expect(prediction.modelVersion).toBeDefined()
        expect(prediction.predictionDate).toBeInstanceOf(Date)
      }
    })

    it('should handle empty session data gracefully', async () => {
      const predictions = await service.generateTreatmentOutcomePrediction(
        'client-123',
        'treatment-plan-456',
        [],
        [],
        [mockGoal],
      )

      expect(predictions).toBeDefined()
      expect(predictions.length).toBeGreaterThan(0)

      // Predictions should still be generated with default values
      for (const prediction of predictions) {
        expect(prediction.probability).toBeGreaterThan(0)
        expect(prediction.confidence).toBeGreaterThan(0)
      }
    })
  })

  describe('Challenge Prediction', () => {
    it('should generate challenge predictions', async () => {
      const challengePredictions = await service.generateChallengePredictions(
        'client-123',
        mockSessionData,
        mockEmotionAnalyses,
        [mockGoal],
      )

      expect(challengePredictions).toBeDefined()
      expect(Array.isArray(challengePredictions)).toBe(true)

      // Should only include predictions above confidence threshold
      for (const prediction of challengePredictions) {
        expect(prediction.confidence).toBeGreaterThanOrEqual(
          config.confidenceThreshold,
        )
      }
    })

    it('should predict different challenge types', async () => {
      const challengePredictions = await service.generateChallengePredictions(
        'client-123',
        mockSessionData,
        mockEmotionAnalyses,
        [mockGoal],
      )

      const challengeTypes = challengePredictions.map((p) => p.challengeType)
      const expectedTypes = [
        'resistance',
        'dropout',
        'relapse',
        'stagnation',
        'non_compliance',
      ]

      // At least some challenge types should be predicted
      expect(challengeTypes.length).toBeGreaterThan(0)
      for (const type of challengeTypes) {
        expect(expectedTypes).toContain(type)
      }
    })

    it('should include challenge details and intervention plans', async () => {
      const challengePredictions = await service.generateChallengePredictions(
        'client-123',
        mockSessionData,
        mockEmotionAnalyses,
        [mockGoal],
      )

      for (const prediction of challengePredictions) {
        expect(prediction.severity).toBeDefined()
        expect(prediction.duration).toBeDefined()
        expect(prediction.impact).toBeDefined()
        expect(prediction.triggers).toBeDefined()
        expect(prediction.warningSignals).toBeDefined()
        expect(prediction.preventionStrategies).toBeDefined()
        expect(prediction.interventionPlan).toBeDefined()

        // Timeframe should be properly structured
        expect(prediction.timeframe.earliest).toBeInstanceOf(Date)
        expect(prediction.timeframe.mostLikely).toBeInstanceOf(Date)
        expect(prediction.timeframe.latest).toBeInstanceOf(Date)
      }
    })

    it('should assess challenge impact correctly', async () => {
      const challengePredictions = await service.generateChallengePredictions(
        'client-123',
        mockSessionData,
        mockEmotionAnalyses,
        [mockGoal],
      )

      for (const prediction of challengePredictions) {
        const impact = prediction.impact
        expect(['minimal', 'moderate', 'significant', 'severe']).toContain(
          impact.treatmentProgress,
        )
        expect(['minimal', 'moderate', 'significant', 'severe']).toContain(
          impact.goalAchievement,
        )
        expect(['minimal', 'moderate', 'significant', 'severe']).toContain(
          impact.therapeuticAlliance,
        )
        expect(['minimal', 'moderate', 'significant', 'severe']).toContain(
          impact.overallWellbeing,
        )
      }
    })

    it('should provide prevention strategies and intervention plans', async () => {
      const challengePredictions = await service.generateChallengePredictions(
        'client-123',
        mockSessionData,
        mockEmotionAnalyses,
        [mockGoal],
      )

      for (const prediction of challengePredictions) {
        expect(prediction.preventionStrategies.length).toBeGreaterThan(0)

        for (const strategy of prediction.preventionStrategies) {
          expect(strategy.strategy).toBeDefined()
          expect(['proactive', 'reactive', 'adaptive']).toContain(strategy.type)
          expect(strategy.effectiveness).toBeGreaterThan(0)
          expect(strategy.feasibility).toBeGreaterThan(0)
        }

        const plan = prediction.interventionPlan
        expect(plan.immediateActions).toBeDefined()
        expect(plan.shortTermStrategies).toBeDefined()
        expect(plan.longTermAdjustments).toBeDefined()
        expect(plan.escalationProtocol).toBeDefined()
        expect(plan.successMetrics).toBeDefined()
        expect(plan.reviewSchedule).toBeDefined()
      }
    })
  })

  describe('Prediction Reports', () => {
    it('should generate comprehensive prediction reports', async () => {
      // First generate some predictions
      await service.generateTreatmentOutcomePrediction(
        'client-123',
        'treatment-plan-456',
        mockSessionData,
        mockEmotionAnalyses,
        [mockGoal],
      )

      await service.generateChallengePredictions(
        'client-123',
        mockSessionData,
        mockEmotionAnalyses,
        [mockGoal],
      )

      const report = await service.generatePredictionReport(
        'client-123',
        'treatment-plan-456',
        'comprehensive',
      )

      expect(report).toBeDefined()
      expect(report.reportId).toBeDefined()
      expect(report.clientId).toBe('client-123')
      expect(report.generatedAt).toBeInstanceOf(Date)
      expect(report.reportType).toBe('comprehensive')

      expect(report.outcomePredictions).toBeDefined()
      expect(report.challengePredictions).toBeDefined()
      expect(report.overallPrognosis).toBeDefined()
      expect(report.treatmentRecommendations).toBeDefined()
      expect(report.riskLevel).toBeDefined()

      expect(report.modelAccuracy).toBeGreaterThan(0)
      expect(report.predictionConfidence).toBeGreaterThan(0)
      expect(report.uncertaintyLevel).toBeGreaterThanOrEqual(0)

      expect(report.monitoringPlan).toBeDefined()
      expect(report.reviewSchedule).toBeInstanceOf(Date)
      expect(report.escalationTriggers).toBeDefined()
    })

    it('should calculate overall prognosis correctly', async () => {
      await service.generateTreatmentOutcomePrediction(
        'client-123',
        'treatment-plan-456',
        mockSessionData,
        mockEmotionAnalyses,
        [mockGoal],
      )

      const report = await service.generatePredictionReport(
        'client-123',
        'treatment-plan-456',
      )

      expect(['excellent', 'good', 'fair', 'poor', 'guarded']).toContain(
        report.overallPrognosis,
      )
    })

    it('should assess risk level appropriately', async () => {
      await service.generateChallengePredictions(
        'client-123',
        mockSessionData,
        mockEmotionAnalyses,
        [mockGoal],
      )

      const report = await service.generatePredictionReport(
        'client-123',
        'treatment-plan-456',
      )

      expect(['low', 'moderate', 'high', 'critical']).toContain(
        report.riskLevel,
      )
    })

    it('should generate treatment recommendations', async () => {
      await service.generateTreatmentOutcomePrediction(
        'client-123',
        'treatment-plan-456',
        mockSessionData,
        mockEmotionAnalyses,
        [mockGoal],
      )

      const report = await service.generatePredictionReport(
        'client-123',
        'treatment-plan-456',
      )

      expect(report.treatmentRecommendations).toBeDefined()
      expect(Array.isArray(report.treatmentRecommendations)).toBe(true)

      for (const recommendation of report.treatmentRecommendations) {
        expect([
          'intervention',
          'monitoring',
          'adjustment',
          'referral',
        ]).toContain(recommendation.type)
        expect(['low', 'medium', 'high', 'urgent']).toContain(
          recommendation.priority,
        )
        expect(recommendation.recommendation).toBeDefined()
        expect(recommendation.rationale).toBeDefined()
        expect(recommendation.expectedImpact).toBeGreaterThan(0)
        expect(recommendation.timeframe).toBeDefined()
        expect(recommendation.resources).toBeDefined()
      }
    })

    it('should create monitoring plan and review schedule', async () => {
      await service.generateChallengePredictions(
        'client-123',
        mockSessionData,
        mockEmotionAnalyses,
        [mockGoal],
      )

      const report = await service.generatePredictionReport(
        'client-123',
        'treatment-plan-456',
      )

      expect(report.monitoringPlan).toBeDefined()
      expect(Array.isArray(report.monitoringPlan)).toBe(true)
      expect(report.reviewSchedule).toBeInstanceOf(Date)
      expect(report.reviewSchedule.getTime()).toBeGreaterThan(Date.now())

      expect(report.escalationTriggers).toBeDefined()
      expect(Array.isArray(report.escalationTriggers)).toBe(true)
    })
  })

  describe('Prediction Updates', () => {
    it('should update predictions with new data', async () => {
      // Generate initial predictions
      await service.generateTreatmentOutcomePrediction(
        'client-123',
        'treatment-plan-456',
        mockSessionData,
        mockEmotionAnalyses,
        [mockGoal],
      )

      await service.generateChallengePredictions(
        'client-123',
        mockSessionData,
        mockEmotionAnalyses,
        [mockGoal],
      )

      // Create new session data
      const newSessionData = [
        ...mockSessionData,
        {
          id: 'session-3',
          clientId: 'client-123',
          therapistId: 'therapist-456',
          startTime: new Date(),
          endTime: new Date(Date.now() + 60 * 60 * 1000),
          duration: 60,
          sessionType: 'individual',
          status: 'completed',
          notes: 'Excellent progress with anxiety management',
          goals: ['goal-123'],
          interventions: ['CBT', 'mindfulness'],
          homework: ['daily mindfulness practice'],
          nextSession: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      ]

      // Update predictions
      await expect(
        service.updatePredictions(
          'client-123',
          newSessionData,
          mockEmotionAnalyses,
          [mockGoal],
        ),
      ).resolves.not.toThrow()
    })

    it('should handle updates for non-existent client gracefully', async () => {
      await expect(
        service.updatePredictions(
          'non-existent-client',
          mockSessionData,
          mockEmotionAnalyses,
          [mockGoal],
        ),
      ).resolves.not.toThrow()
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid client ID gracefully', async () => {
      await expect(
        service.generateTreatmentOutcomePrediction(
          '',
          'treatment-plan-456',
          mockSessionData,
          mockEmotionAnalyses,
          [mockGoal],
        ),
      ).rejects.toThrow()
    })

    it('should handle invalid treatment plan ID gracefully', async () => {
      await expect(
        service.generateTreatmentOutcomePrediction(
          'client-123',
          '',
          mockSessionData,
          mockEmotionAnalyses,
          [mockGoal],
        ),
      ).rejects.toThrow()
    })

    it('should handle empty goals array', async () => {
      const predictions = await service.generateTreatmentOutcomePrediction(
        'client-123',
        'treatment-plan-456',
        mockSessionData,
        mockEmotionAnalyses,
        [],
      )

      // Should still generate symptom reduction and engagement predictions
      expect(predictions.length).toBeGreaterThanOrEqual(2)
      expect(
        predictions.some((p) => p.predictionType === 'symptom_reduction'),
      ).toBe(true)
      expect(predictions.some((p) => p.predictionType === 'engagement')).toBe(
        true,
      )
    })

    it('should handle report generation for non-existent client', async () => {
      const report = await service.generatePredictionReport(
        'non-existent-client',
        'treatment-plan-456',
      )

      expect(report).toBeDefined()
      expect(report.outcomePredictions.length).toBe(0)
      expect(report.challengePredictions.length).toBe(0)
    })
  })

  describe('Model Performance', () => {
    it('should have reasonable prediction accuracy', async () => {
      const predictions = await service.generateTreatmentOutcomePrediction(
        'client-123',
        'treatment-plan-456',
        mockSessionData,
        mockEmotionAnalyses,
        [mockGoal],
      )

      for (const prediction of predictions) {
        // Predictions should be within reasonable bounds
        expect(prediction.probability).toBeGreaterThanOrEqual(0.05)
        expect(prediction.probability).toBeLessThanOrEqual(0.95)
        expect(prediction.confidence).toBeGreaterThan(0.1)
        expect(prediction.confidence).toBeLessThanOrEqual(0.95)
      }
    })

    it('should provide uncertainty quantification', async () => {
      const predictions = await service.generateTreatmentOutcomePrediction(
        'client-123',
        'treatment-plan-456',
        mockSessionData,
        mockEmotionAnalyses,
        [mockGoal],
      )

      for (const prediction of predictions) {
        const bounds = prediction.uncertaintyBounds
        expect(bounds.lower).toBeLessThanOrEqual(prediction.probability)
        expect(bounds.upper).toBeGreaterThanOrEqual(prediction.probability)
        expect(bounds.lower).toBeGreaterThanOrEqual(0)
        expect(bounds.upper).toBeLessThanOrEqual(1)
        expect(bounds.confidenceInterval).toBe(0.95)
      }
    })

    it('should identify meaningful key factors', async () => {
      const predictions = await service.generateTreatmentOutcomePrediction(
        'client-123',
        'treatment-plan-456',
        mockSessionData,
        mockEmotionAnalyses,
        [mockGoal],
      )

      for (const prediction of predictions) {
        expect(prediction.keyFactors.length).toBeGreaterThan(0)
        expect(prediction.keyFactors.length).toBeLessThanOrEqual(5)

        for (const factor of prediction.keyFactors) {
          expect(['positive', 'negative', 'neutral']).toContain(factor.impact)
          expect(factor.strength).toBeGreaterThan(0)
          expect(factor.strength).toBeLessThanOrEqual(1)
          expect(factor.confidence).toBeGreaterThan(0)
          expect(factor.confidence).toBeLessThanOrEqual(1)
          expect([
            'demographic',
            'clinical',
            'behavioral',
            'environmental',
            'therapeutic',
          ]).toContain(factor.category)
        }
      }
    })
  })

  describe('Configuration Options', () => {
    it('should respect confidence threshold setting', async () => {
      const lowThresholdService = new ComprehensiveOutcomePredictionService({
        confidenceThreshold: 0.3,
      })

      const highThresholdService = new ComprehensiveOutcomePredictionService({
        confidenceThreshold: 0.9,
      })

      const lowThresholdPredictions =
        await lowThresholdService.generateChallengePredictions(
          'client-123',
          mockSessionData,
          mockEmotionAnalyses,
          [mockGoal],
        )

      const highThresholdPredictions =
        await highThresholdService.generateChallengePredictions(
          'client-123',
          mockSessionData,
          mockEmotionAnalyses,
          [mockGoal],
        )

      // Lower threshold should generally produce more predictions
      expect(lowThresholdPredictions.length).toBeGreaterThanOrEqual(
        highThresholdPredictions.length,
      )
    })

    it('should use correct prediction horizon', async () => {
      const customHorizonService = new ComprehensiveOutcomePredictionService({
        predictionHorizon: 60,
      })

      const predictions =
        await customHorizonService.generateTreatmentOutcomePrediction(
          'client-123',
          'treatment-plan-456',
          mockSessionData,
          mockEmotionAnalyses,
          [{ ...mockGoal, targetDate: undefined }], // Remove target date to use default horizon
        )

      const symptomPrediction = predictions.find(
        (p) => p.predictionType === 'symptom_reduction',
      )
      expect(symptomPrediction?.timeHorizon).toBe(60)
    })
  })
})

describe('OutcomePredictionUtils', () => {
  const mockPredictions: TreatmentOutcomePrediction[] = [
    {
      id: 'pred-1',
      clientId: 'client-123',
      treatmentPlanId: 'plan-456',
      predictionType: 'goal_achievement',
      probability: 0.8,
      confidence: 0.85,
      timeHorizon: 30,
      expectedOutcome: {
        goalProgress: 80,
        symptomSeverity: 3,
        functionalImprovement: 75,
        qualityOfLife: 70,
        therapeuticAlliance: 85,
        treatmentSatisfaction: 80,
      },
      modelUsed: 'goal-achievement-v1',
      modelVersion: '1.0',
      predictionDate: new Date(),
      keyFactors: [],
      riskFactors: [],
      protectiveFactors: [],
      recommendations: [],
      uncertaintyBounds: { lower: 0.7, upper: 0.9, confidenceInterval: 0.95 },
    },
    {
      id: 'pred-2',
      clientId: 'client-123',
      treatmentPlanId: 'plan-456',
      predictionType: 'symptom_reduction',
      probability: 0.7,
      confidence: 0.75,
      timeHorizon: 60,
      expectedOutcome: {
        goalProgress: 70,
        symptomSeverity: 4,
        functionalImprovement: 65,
        qualityOfLife: 60,
        therapeuticAlliance: 75,
        treatmentSatisfaction: 70,
      },
      modelUsed: 'symptom-reduction-v1',
      modelVersion: '1.0',
      predictionDate: new Date(),
      keyFactors: [],
      riskFactors: [],
      protectiveFactors: [],
      recommendations: [],
      uncertaintyBounds: { lower: 0.6, upper: 0.8, confidenceInterval: 0.95 },
    },
  ]

  const mockActualOutcomes: OutcomeMetrics[] = [
    {
      goalProgress: 75,
      symptomSeverity: 3.5,
      functionalImprovement: 70,
      qualityOfLife: 65,
      therapeuticAlliance: 80,
      treatmentSatisfaction: 75,
    },
    {
      goalProgress: 65,
      symptomSeverity: 4.5,
      functionalImprovement: 60,
      qualityOfLife: 55,
      therapeuticAlliance: 70,
      treatmentSatisfaction: 65,
    },
  ]

  describe('calculatePredictionAccuracy', () => {
    it('should calculate prediction accuracy correctly', () => {
      const accuracy = OutcomePredictionUtils.calculatePredictionAccuracy(
        mockPredictions,
        mockActualOutcomes,
      )

      expect(accuracy).toBeGreaterThan(0)
      expect(accuracy).toBeLessThanOrEqual(1)
    })

    it('should handle empty arrays', () => {
      const accuracy = OutcomePredictionUtils.calculatePredictionAccuracy(
        [],
        [],
      )
      expect(accuracy).toBe(0)
    })

    it('should handle mismatched array lengths', () => {
      const accuracy = OutcomePredictionUtils.calculatePredictionAccuracy(
        mockPredictions,
        [mockActualOutcomes[0]],
      )

      expect(accuracy).toBeGreaterThan(0)
      expect(accuracy).toBeLessThanOrEqual(1)
    })
  })

  describe('generatePredictionSummary', () => {
    it('should generate comprehensive prediction summary', () => {
      const summary =
        OutcomePredictionUtils.generatePredictionSummary(mockPredictions)

      expect(summary.averageProbability).toBeCloseTo(0.75, 2)
      expect(summary.averageConfidence).toBeCloseTo(0.8, 2)

      expect(summary.riskDistribution).toBeDefined()
      expect(summary.riskDistribution.low).toBeDefined()
      expect(summary.riskDistribution.moderate).toBeDefined()
      expect(summary.riskDistribution.high).toBeDefined()

      expect(summary.predictionTypeDistribution).toBeDefined()
      expect(summary.predictionTypeDistribution.goal_achievement).toBe(1)
      expect(summary.predictionTypeDistribution.symptom_reduction).toBe(1)
    })

    it('should handle empty predictions array', () => {
      const summary = OutcomePredictionUtils.generatePredictionSummary([])

      expect(summary.averageProbability).toBe(0)
      expect(summary.averageConfidence).toBe(0)
      expect(Object.keys(summary.riskDistribution)).toHaveLength(0)
      expect(Object.keys(summary.predictionTypeDistribution)).toHaveLength(0)
    })

    it('should categorize risk levels correctly', () => {
      const highRiskPredictions = [
        { ...mockPredictions[0], probability: 0.8 },
        { ...mockPredictions[1], probability: 0.2 },
      ]

      const summary =
        OutcomePredictionUtils.generatePredictionSummary(highRiskPredictions)

      expect(summary.riskDistribution.high).toBe(1)
      expect(summary.riskDistribution.low).toBe(1)
      expect(summary.riskDistribution.moderate).toBe(0)
    })
  })

  describe('validateModelPerformance', () => {
    it('should validate model performance metrics', () => {
      const mockModel = {
        id: 'test-model',
        name: 'Test Model',
        type: 'classification' as const,
        version: '1.0',
        accuracy: 0.8,
        precision: 0.75,
        recall: 0.85,
        f1Score: 0.8,
        lastTrained: new Date(),
        features: [],
        hyperparameters: {},
        validationMetrics: {
          crossValidationScore: 0.78,
          testSetAccuracy: 0.8,
          auc: 0.85,
          calibrationScore: 0.75,
          featureStability: 0.9,
        },
      }

      const metrics = OutcomePredictionUtils.validateModelPerformance(
        mockModel,
        mockPredictions,
        mockActualOutcomes,
      )

      expect(metrics.testSetAccuracy).toBeGreaterThan(0)
      expect(metrics.crossValidationScore).toBeGreaterThan(0)
      expect(metrics.auc).toBeGreaterThan(0)
      expect(metrics.calibrationScore).toBeGreaterThan(0)
      expect(metrics.featureStability).toBe(0.85)
    })
  })
})

describe('Integration Tests', () => {
  let service: ComprehensiveOutcomePredictionService

  beforeEach(() => {
    service = createComprehensiveOutcomePredictionService({
      enableOutcomeForecasting: true,
      enableChallengePrediction: true,
      confidenceThreshold: 0.6,
    })
  })

  it('should demonstrate end-to-end prediction workflow', async () => {
    // Generate outcome predictions
    const outcomePredictions = await service.generateTreatmentOutcomePrediction(
      'client-123',
      'treatment-plan-456',
      mockSessionData,
      mockEmotionAnalyses,
      [mockGoal],
    )

    expect(outcomePredictions.length).toBeGreaterThan(0)

    // Generate challenge predictions
    const challengePredictions = await service.generateChallengePredictions(
      'client-123',
      mockSessionData,
      mockEmotionAnalyses,
      [mockGoal],
    )

    expect(challengePredictions).toBeDefined()

    // Generate comprehensive report
    const report = await service.generatePredictionReport(
      'client-123',
      'treatment-plan-456',
      'comprehensive',
    )

    expect(report.outcomePredictions.length).toBe(outcomePredictions.length)
    expect(report.challengePredictions.length).toBe(challengePredictions.length)
    expect(report.overallPrognosis).toBeDefined()
    expect(report.treatmentRecommendations.length).toBeGreaterThan(0)

    // Update predictions with new data
    const newSessionData = [
      ...mockSessionData,
      {
        id: 'session-new',
        clientId: 'client-123',
        therapistId: 'therapist-456',
        startTime: new Date(),
        endTime: new Date(Date.now() + 60 * 60 * 1000),
        duration: 60,
        sessionType: 'individual',
        status: 'completed',
        notes: 'Continued progress',
        goals: ['goal-123'],
        interventions: ['CBT'],
        homework: ['practice techniques'],
        nextSession: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    ]

    await expect(
      service.updatePredictions(
        'client-123',
        newSessionData,
        mockEmotionAnalyses,
        [mockGoal],
      ),
    ).resolves.not.toThrow()

    // Generate updated report
    const updatedReport = await service.generatePredictionReport(
      'client-123',
      'treatment-plan-456',
      'summary',
    )

    expect(updatedReport.reportType).toBe('summary')
    expect(updatedReport.generatedAt.getTime()).toBeGreaterThan(
      report.generatedAt.getTime(),
    )
  })

  it('should handle multiple clients and treatment plans', async () => {
    const clients = ['client-1', 'client-2', 'client-3']
    const treatmentPlans = ['plan-1', 'plan-2', 'plan-3']

    for (let i = 0; i < clients.length; i++) {
      const predictions = await service.generateTreatmentOutcomePrediction(
        clients[i],
        treatmentPlans[i],
        mockSessionData,
        mockEmotionAnalyses,
        [{ ...mockGoal, id: `goal-${i}`, clientId: clients[i] }],
      )

      expect(predictions.length).toBeGreaterThan(0)
      expect(predictions.every((p) => p.clientId === clients[i])).toBe(true)
      expect(
        predictions.every((p) => p.treatmentPlanId === treatmentPlans[i]),
      ).toBe(true)
    }

    // Generate reports for each client
    for (let i = 0; i < clients.length; i++) {
      const report = await service.generatePredictionReport(
        clients[i],
        treatmentPlans[i],
      )

      expect(report.clientId).toBe(clients[i])
      expect(report.outcomePredictions.length).toBeGreaterThan(0)
    }
  })

  it('should maintain prediction consistency over time', async () => {
    // Generate initial predictions
    const initialPredictions = await service.generateTreatmentOutcomePrediction(
      'client-123',
      'treatment-plan-456',
      mockSessionData,
      mockEmotionAnalyses,
      [mockGoal],
    )

    // Generate predictions again with same data
    const secondPredictions = await service.generateTreatmentOutcomePrediction(
      'client-123',
      'treatment-plan-456',
      mockSessionData,
      mockEmotionAnalyses,
      [mockGoal],
    )

    // Predictions should be similar (within reasonable variance)
    expect(initialPredictions.length).toBe(secondPredictions.length)

    for (let i = 0; i < initialPredictions.length; i++) {
      const initial = initialPredictions[i]
      const second = secondPredictions[i]

      expect(initial.predictionType).toBe(second.predictionType)
      // Allow for some variance due to randomization in the mock implementation
      expect(Math.abs(initial.probability - second.probability)).toBeLessThan(
        0.3,
      )
      expect(Math.abs(initial.confidence - second.confidence)).toBeLessThan(0.3)
    }
  })
})
