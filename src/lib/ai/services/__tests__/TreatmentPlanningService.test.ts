/**
 * Test suite for TreatmentPlanningService
 *
 * Tests comprehensive treatment planning functionality including:
 * - Goal creation and management
 * - Treatment plan generation
 * - Outcome forecasting
 * - Session integration
 * - Progress tracking
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TreatmentPlanningService } from '../TreatmentPlanningService'
import type { KVStore } from '../../../stores/types'
import type { SessionDocumentation } from '../../interfaces/therapy'

// Mock KVStore implementation
class MockKVStore implements KVStore {
  private store = new Map<string, string>()

  async get(key: string): Promise<string | null> {
    return this.store.get(key) || null
  }

  async set(key: string, value: string): Promise<void> {
    this.store.set(key, value)
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key)
  }

  async clear(): Promise<void> {
    this.store.clear()
  }

  async keys(): Promise<string[]> {
    return Array.from(this.store.keys())
  }

  async has(key: string): Promise<boolean> {
    return this.store.has(key)
  }
}

describe('TreatmentPlanningService', () => {
  let service: TreatmentPlanningService
  let mockKVStore: MockKVStore

  beforeEach(() => {
    mockKVStore = new MockKVStore()
    service = new TreatmentPlanningService(mockKVStore)
  })

  describe('Goal Management', () => {
    it('should create a new goal successfully', async () => {
      const goalData = {
        userId: 'user123',
        therapistId: 'therapist456',
        title: 'Reduce anxiety symptoms',
        description: 'Learn coping strategies to manage anxiety',
        status: 'active' as const,
        priority: 'high' as const,
        category: 'Symptom Management',
        startDate: new Date(),
        barriers: ['avoidance behaviors'],
        supportingFactors: ['motivation for change'],
      }

      const goal = await service.createGoal(goalData)

      expect(goal).toBeDefined()
      expect(goal.id).toBeTruthy()
      expect(goal.title).toBe(goalData.title)
      expect(goal.progress).toBe(0)
      expect(goal.status).toBe('active')
      expect(goal.milestones).toEqual([])
      expect(goal.createdAt).toBeInstanceOf(Date)
      expect(goal.updatedAt).toBeInstanceOf(Date)
    })

    it('should update goal progress correctly', async () => {
      // First create a goal
      const goalData = {
        userId: 'user123',
        title: 'Test Goal',
        description: 'Test description',
        status: 'active' as const,
        priority: 'medium' as const,
        category: 'Test',
        startDate: new Date(),
        barriers: [],
        supportingFactors: [],
      }

      const goal = await service.createGoal(goalData)

      // Update progress
      const progressData = {
        newProgress: 50,
        progressNotes: 'Good progress made this week',
        evidenceOfProgress: ['Completed homework', 'Practiced techniques'],
        barriers: ['Time constraints'],
        nextSteps: ['Continue practice'],
        therapistObservations: 'Client showing improvement',
        clientFeedback: 'Feeling more confident',
        sessionId: 'session123',
      }

      const progressUpdate = await service.updateGoalProgress(
        goal.id,
        progressData,
      )

      expect(progressUpdate).toBeDefined()
      expect(progressUpdate.goalId).toBe(goal.id)
      expect(progressUpdate.newProgress).toBe(50)
      expect(progressUpdate.previousProgress).toBe(0)
      expect(progressUpdate.sessionId).toBe('session123')
      expect(progressUpdate.evidenceOfProgress).toEqual([
        'Completed homework',
        'Practiced techniques',
      ])
    })

    it('should mark goal as achieved when progress reaches 100%', async () => {
      const goalData = {
        userId: 'user123',
        title: 'Test Goal',
        description: 'Test description',
        status: 'active' as const,
        priority: 'medium' as const,
        category: 'Test',
        startDate: new Date(),
        barriers: [],
        supportingFactors: [],
      }

      const goal = await service.createGoal(goalData)

      const progressData = {
        newProgress: 100,
        progressNotes: 'Goal achieved!',
        evidenceOfProgress: ['All objectives met'],
        therapistObservations: 'Excellent progress',
      }

      await service.updateGoalProgress(goal.id, progressData)

      // Get updated goals to verify status change
      const userGoals = await service.getUserGoals('user123')
      const updatedGoal = userGoals.find((g) => g.id === goal.id)

      expect(updatedGoal?.status).toBe('achieved')
      expect(updatedGoal?.achievedDate).toBeInstanceOf(Date)
    })

    it('should retrieve user goals with optional status filter', async () => {
      // Create multiple goals with different statuses
      const goal1Data = {
        userId: 'user123',
        title: 'Active Goal',
        description: 'Active goal description',
        status: 'active' as const,
        priority: 'high' as const,
        category: 'Test',
        startDate: new Date(),
        barriers: [],
        supportingFactors: [],
      }

      const goal2Data = {
        userId: 'user123',
        title: 'Paused Goal',
        description: 'Paused goal description',
        status: 'paused' as const,
        priority: 'medium' as const,
        category: 'Test',
        startDate: new Date(),
        barriers: [],
        supportingFactors: [],
      }

      await service.createGoal(goal1Data)
      await service.createGoal(goal2Data)

      // Get all goals
      const allGoals = await service.getUserGoals('user123')
      expect(allGoals).toHaveLength(2)

      // Get only active goals
      const activeGoals = await service.getUserGoals('user123', 'active')
      expect(activeGoals).toHaveLength(1)
      expect(activeGoals[0].status).toBe('active')

      // Get only paused goals
      const pausedGoals = await service.getUserGoals('user123', 'paused')
      expect(pausedGoals).toHaveLength(1)
      expect(pausedGoals[0].status).toBe('paused')
    })
  })

  describe('Treatment Plan Management', () => {
    it('should create a comprehensive treatment plan', async () => {
      const planData = {
        clientId: 'client123',
        therapistId: 'therapist456',
        planName: 'Anxiety Treatment Plan',
        description: 'Comprehensive plan for anxiety management',
        status: 'active' as const,
        lastReviewDate: new Date(),
        nextReviewDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        primaryDiagnosis: ['Generalized Anxiety Disorder'],
        secondaryDiagnosis: [],
        treatmentGoals: [],
        interventions: [],
        clientStrengths: ['Motivated', 'Insightful'],
        riskFactors: ['Social isolation'],
        protectiveFactors: ['Family support'],
        treatmentHistory: [],
        outcomeMeasures: [],
        progressIndicators: [],
        planRationale: 'Evidence-based approach for anxiety treatment',
        expectedDuration: 12,
        reviewFrequency: 4,
        dischargeCriteria: ['Symptom reduction', 'Improved functioning'],
      }

      const plan = await service.createTreatmentPlan(planData)

      expect(plan).toBeDefined()
      expect(plan.id).toBeTruthy()
      expect(plan.planName).toBe(planData.planName)
      expect(plan.status).toBe('active')
      expect(plan.outcomeForecasts).toBeDefined()
      expect(plan.riskAssessments).toBeDefined()
      expect(plan.createdAt).toBeInstanceOf(Date)
      expect(plan.updatedAt).toBeInstanceOf(Date)
    })

    it('should generate automated treatment plan from assessment', async () => {
      const assessmentData = {
        primaryDiagnosis: ['anxiety'],
        secondaryDiagnosis: ['depression'],
        clientStrengths: ['motivated', 'insightful', 'supportive family'],
        riskFactors: ['social isolation', 'work stress'],
        treatmentHistory: ['previous therapy'],
        clientPreferences: ['CBT', 'weekly sessions'],
      }

      const plan = await service.generateAutomatedTreatmentPlan(
        'client123',
        'therapist456',
        assessmentData,
      )

      expect(plan).toBeDefined()
      expect(plan.planName).toContain('anxiety')
      expect(plan.primaryDiagnosis).toEqual(['anxiety'])
      expect(plan.secondaryDiagnosis).toEqual(['depression'])
      expect(plan.clientStrengths).toEqual(assessmentData.clientStrengths)
      expect(plan.riskFactors).toEqual(assessmentData.riskFactors)
      expect(plan.treatmentGoals.length).toBeGreaterThan(0)
      expect(plan.interventions.length).toBeGreaterThan(0)
      expect(plan.outcomeMeasures.length).toBeGreaterThan(0)
      expect(plan.outcomeForecasts.length).toBeGreaterThan(0)
      expect(plan.riskAssessments.length).toBeGreaterThan(0)
    })

    it('should retrieve treatment plan by ID', async () => {
      const planData = {
        clientId: 'client123',
        therapistId: 'therapist456',
        planName: 'Test Plan',
        description: 'Test description',
        status: 'active' as const,
        lastReviewDate: new Date(),
        nextReviewDate: new Date(),
        primaryDiagnosis: ['test'],
        secondaryDiagnosis: [],
        treatmentGoals: [],
        interventions: [],
        clientStrengths: [],
        riskFactors: [],
        protectiveFactors: [],
        treatmentHistory: [],
        outcomeMeasures: [],
        progressIndicators: [],
        planRationale: 'Test rationale',
        expectedDuration: 12,
        reviewFrequency: 4,
        dischargeCriteria: [],
      }

      const createdPlan = await service.createTreatmentPlan(planData)
      const retrievedPlan = await service.getTreatmentPlan(createdPlan.id)

      expect(retrievedPlan).toBeDefined()
      expect(retrievedPlan?.id).toBe(createdPlan.id)
      expect(retrievedPlan?.planName).toBe(planData.planName)
    })

    it('should return null for non-existent treatment plan', async () => {
      const plan = await service.getTreatmentPlan('non-existent-id')
      expect(plan).toBeNull()
    })
  })

  describe('Session Documentation Integration', () => {
    it('should integrate session documentation with treatment plan', async () => {
      // Create a treatment plan with goals
      const assessmentData = {
        primaryDiagnosis: ['anxiety'],
        secondaryDiagnosis: [],
        clientStrengths: ['motivated'],
        riskFactors: ['stress'],
        treatmentHistory: [],
      }

      const plan = await service.generateAutomatedTreatmentPlan(
        'client123',
        'therapist456',
        assessmentData,
      )

      // Create mock session documentation
      const sessionDocumentation: SessionDocumentation = {
        summary: 'Client made good progress on anxiety management techniques',
        keyInsights: ['Improved coping skills', 'Reduced avoidance behaviors'],
        therapeuticTechniques: [
          {
            name: 'Cognitive Behavioral Therapy',
            description: 'CBT techniques for anxiety',
            effectiveness: 8,
          },
        ],
        emotionalPatterns: [
          {
            pattern: 'Anxiety reduction',
            significance: 'Significant improvement noted',
          },
        ],
        recommendedFollowUp: 'Continue CBT techniques',
        treatmentProgress: {
          goals: [
            {
              description: 'Reduce anxiety symptoms',
              progress: 60,
              notes: 'Good progress this week',
            },
          ],
          overallAssessment: 'Client showing steady improvement',
        },
        nextSessionPlan: 'Focus on exposure exercises',
        emergentIssues: ['Work stress increasing'],
        clientStrengths: ['Motivated', 'Compliant with homework'],
      }

      const integration = await service.integrateWithSessionDocumentation(
        sessionDocumentation,
        plan.id,
        'session123',
      )

      expect(integration).toBeDefined()
      expect(integration.sessionId).toBe('session123')
      expect(integration.treatmentPlanId).toBe(plan.id)
      expect(integration.goalsAddressed).toBeDefined()
      expect(integration.interventionsUsed).toBeDefined()
      expect(integration.progressUpdates).toBeDefined()
      expect(integration.planModifications).toBeDefined()
      expect(integration.nextSessionPlanning).toBeDefined()

      // Check for emergent issues leading to plan modifications
      expect(integration.planModifications.length).toBeGreaterThan(0)
      expect(integration.planModifications[0].description).toContain(
        'Work stress increasing',
      )
    })

    it('should generate progress updates from session content', async () => {
      // Create a goal first
      const goalData = {
        userId: 'client123',
        title: 'Reduce anxiety symptoms',
        description: 'Learn coping strategies',
        status: 'active' as const,
        priority: 'high' as const,
        category: 'Symptom Management',
        startDate: new Date(),
        barriers: [],
        supportingFactors: [],
      }

      const goal = await service.createGoal(goalData)

      // Create treatment plan with this goal
      const planData = {
        clientId: 'client123',
        therapistId: 'therapist456',
        planName: 'Test Plan',
        description: 'Test description',
        status: 'active' as const,
        lastReviewDate: new Date(),
        nextReviewDate: new Date(),
        primaryDiagnosis: ['anxiety'],
        secondaryDiagnosis: [],
        treatmentGoals: [goal.id],
        interventions: [],
        clientStrengths: [],
        riskFactors: [],
        protectiveFactors: [],
        treatmentHistory: [],
        outcomeMeasures: [],
        progressIndicators: [],
        planRationale: 'Test rationale',
        expectedDuration: 12,
        reviewFrequency: 4,
        dischargeCriteria: [],
      }

      const plan = await service.createTreatmentPlan(planData)

      const sessionDocumentation: SessionDocumentation = {
        summary:
          'Client worked on anxiety reduction techniques and showed improvement',
        keyInsights: ['Progress noted', 'Improvement in coping'],
        therapeuticTechniques: [
          {
            name: 'CBT',
            description: 'Cognitive restructuring',
            effectiveness: 9,
          },
        ],
        emotionalPatterns: [],
        recommendedFollowUp: 'Continue practice',
        treatmentProgress: {
          goals: [],
          overallAssessment: 'Good progress',
        },
        nextSessionPlan: 'Next steps',
      }

      const integration = await service.integrateWithSessionDocumentation(
        sessionDocumentation,
        plan.id,
        'session123',
      )

      expect(integration.progressUpdates.length).toBeGreaterThan(0)
      const progressUpdate = integration.progressUpdates[0]
      expect(progressUpdate.goalId).toBe(goal.id)
      expect(progressUpdate.sessionId).toBe('session123')
      expect(progressUpdate.newProgress).toBeGreaterThan(
        progressUpdate.previousProgress,
      )
    })
  })

  describe('Treatment Plan Reporting', () => {
    it('should generate comprehensive treatment plan report', async () => {
      // Create a treatment plan with goals
      const assessmentData = {
        primaryDiagnosis: ['anxiety'],
        secondaryDiagnosis: [],
        clientStrengths: ['motivated'],
        riskFactors: ['stress'],
        treatmentHistory: [],
      }

      const plan = await service.generateAutomatedTreatmentPlan(
        'client123',
        'therapist456',
        assessmentData,
      )

      const report = await service.generateTreatmentPlanReport(plan.id)

      expect(report).toBeDefined()
      expect(report.plan).toBeDefined()
      expect(report.goals).toBeDefined()
      expect(report.progressSummary).toBeDefined()
      expect(report.outcomeAnalysis).toBeDefined()
      expect(report.nextSteps).toBeDefined()

      // Check progress summary structure
      expect(report.progressSummary.totalGoals).toBeGreaterThanOrEqual(0)
      expect(report.progressSummary.activeGoals).toBeGreaterThanOrEqual(0)
      expect(report.progressSummary.achievedGoals).toBeGreaterThanOrEqual(0)
      expect(report.progressSummary.averageProgress).toBeGreaterThanOrEqual(0)
      expect(report.progressSummary.recentUpdates).toBeDefined()

      // Check outcome analysis structure
      expect(report.outcomeAnalysis.forecasts).toBeDefined()
      expect(report.outcomeAnalysis.riskAssessments).toBeDefined()
      expect(report.outcomeAnalysis.recommendations).toBeDefined()

      // Check next steps
      expect(Array.isArray(report.nextSteps)).toBe(true)
    })

    it('should handle report generation for non-existent plan', async () => {
      await expect(
        service.generateTreatmentPlanReport('non-existent-id'),
      ).rejects.toThrow('Treatment plan not found')
    })
  })

  describe('Outcome Forecasting', () => {
    it('should generate outcome forecasts for treatment plan', async () => {
      const assessmentData = {
        primaryDiagnosis: ['anxiety'],
        secondaryDiagnosis: [],
        clientStrengths: ['motivated', 'insightful'],
        riskFactors: ['stress'],
        treatmentHistory: [],
      }

      const plan = await service.generateAutomatedTreatmentPlan(
        'client123',
        'therapist456',
        assessmentData,
      )

      expect(plan.outcomeForecasts.length).toBeGreaterThan(0)

      // Check goal achievement forecasts
      const goalForecasts = plan.outcomeForecasts.filter(
        (f) => f.forecastType === 'goal_achievement',
      )
      expect(goalForecasts.length).toBeGreaterThan(0)

      const goalForecast = goalForecasts[0]
      expect(goalForecast.probability).toBeGreaterThan(0)
      expect(goalForecast.probability).toBeLessThanOrEqual(1)
      expect(goalForecast.confidence).toBeGreaterThan(0)
      expect(goalForecast.confidence).toBeLessThanOrEqual(1)
      expect(goalForecast.keyFactors).toBeDefined()
      expect(goalForecast.recommendations).toBeDefined()

      // Check engagement forecast
      const engagementForecasts = plan.outcomeForecasts.filter(
        (f) => f.forecastType === 'engagement',
      )
      expect(engagementForecasts.length).toBeGreaterThan(0)

      const engagementForecast = engagementForecasts[0]
      expect(engagementForecast.timeHorizon).toBe(30)
      expect(engagementForecast.probability).toBeGreaterThan(0)
      expect(engagementForecast.confidence).toBe(0.7)
    })
  })

  describe('Risk Assessment', () => {
    it('should generate risk assessments for treatment plan', async () => {
      const assessmentData = {
        primaryDiagnosis: ['depression'],
        secondaryDiagnosis: [],
        clientStrengths: ['motivated'],
        riskFactors: [
          'suicidal ideation',
          'substance use',
          'poor treatment history',
        ],
        treatmentHistory: [],
      }

      const plan = await service.generateAutomatedTreatmentPlan(
        'client123',
        'therapist456',
        assessmentData,
      )

      expect(plan.riskAssessments.length).toBeGreaterThan(0)

      // Check dropout risk assessment
      const dropoutRisk = plan.riskAssessments.find(
        (r) => r.riskType === 'dropout',
      )
      expect(dropoutRisk).toBeDefined()
      expect(dropoutRisk?.riskLevel).toBe('high') // Due to poor treatment history
      expect(dropoutRisk?.probability).toBeGreaterThan(0)
      expect(dropoutRisk?.riskFactors.length).toBeGreaterThan(0)
      expect(dropoutRisk?.mitigationStrategies.length).toBeGreaterThan(0)

      // Check deterioration risk assessment
      const deteriorationRisk = plan.riskAssessments.find(
        (r) => r.riskType === 'deterioration',
      )
      expect(deteriorationRisk).toBeDefined()
      expect(deteriorationRisk?.riskLevel).toBe('high') // Due to suicidal ideation
      expect(deteriorationRisk?.probability).toBeGreaterThan(0)
      expect(deteriorationRisk?.riskFactors.length).toBeGreaterThan(0)
      expect(deteriorationRisk?.mitigationStrategies.length).toBeGreaterThan(0)
    })

    it('should assess lower risk for clients with fewer risk factors', async () => {
      const assessmentData = {
        primaryDiagnosis: ['anxiety'],
        secondaryDiagnosis: [],
        clientStrengths: ['motivated', 'supportive family'],
        riskFactors: ['mild stress'],
        treatmentHistory: ['successful previous therapy'],
      }

      const plan = await service.generateAutomatedTreatmentPlan(
        'client123',
        'therapist456',
        assessmentData,
      )

      const dropoutRisk = plan.riskAssessments.find(
        (r) => r.riskType === 'dropout',
      )
      expect(dropoutRisk?.riskLevel).toBe('low')

      const deteriorationRisk = plan.riskAssessments.find(
        (r) => r.riskType === 'deterioration',
      )
      expect(deteriorationRisk?.riskLevel).toBe('low')
    })
  })

  describe('Template System', () => {
    it('should use anxiety template for anxiety diagnosis', async () => {
      const assessmentData = {
        primaryDiagnosis: ['generalized anxiety disorder'],
        secondaryDiagnosis: [],
        clientStrengths: ['motivated'],
        riskFactors: ['stress'],
        treatmentHistory: [],
      }

      const plan = await service.generateAutomatedTreatmentPlan(
        'client123',
        'therapist456',
        assessmentData,
      )

      // Should have goals related to anxiety
      const goals = await Promise.all(
        plan.treatmentGoals.map(async (goalId) => {
          const userGoals = await service.getUserGoals('client123')
          return userGoals.find((g) => g.id === goalId)
        }),
      )

      const anxietyGoal = goals.find((g) =>
        g?.title.toLowerCase().includes('anxiety'),
      )
      expect(anxietyGoal).toBeDefined()

      // Should have CBT intervention
      const cbtIntervention = plan.interventions.find((i) =>
        i.name.toLowerCase().includes('cognitive behavioral therapy'),
      )
      expect(cbtIntervention).toBeDefined()

      // Should have GAD-7 outcome measure
      const gadMeasure = plan.outcomeMeasures.find((m) => m.name === 'GAD-7')
      expect(gadMeasure).toBeDefined()
    })

    it('should use depression template for depression diagnosis', async () => {
      const assessmentData = {
        primaryDiagnosis: ['major depressive disorder'],
        secondaryDiagnosis: [],
        clientStrengths: ['motivated'],
        riskFactors: ['stress'],
        treatmentHistory: [],
      }

      const plan = await service.generateAutomatedTreatmentPlan(
        'client123',
        'therapist456',
        assessmentData,
      )

      // Should have goals related to depression
      const goals = await Promise.all(
        plan.treatmentGoals.map(async (goalId) => {
          const userGoals = await service.getUserGoals('client123')
          return userGoals.find((g) => g.id === goalId)
        }),
      )

      const depressionGoal = goals.find(
        (g) =>
          g?.title.toLowerCase().includes('mood') ||
          g?.title.toLowerCase().includes('depression'),
      )
      expect(depressionGoal).toBeDefined()

      // Should have PHQ-9 outcome measure
      const phqMeasure = plan.outcomeMeasures.find((m) => m.name === 'PHQ-9')
      expect(phqMeasure).toBeDefined()
    })

    it('should generate generic plan when no template matches', async () => {
      const assessmentData = {
        primaryDiagnosis: ['rare condition'],
        secondaryDiagnosis: [],
        clientStrengths: ['motivated'],
        riskFactors: ['stress'],
        treatmentHistory: [],
      }

      const plan = await service.generateAutomatedTreatmentPlan(
        'client123',
        'therapist456',
        assessmentData,
      )

      // Should still generate a plan with goals and interventions
      expect(plan.treatmentGoals.length).toBeGreaterThan(0)
      expect(plan.interventions.length).toBeGreaterThan(0)
      expect(plan.outcomeMeasures.length).toBeGreaterThan(0)

      // Should have generic intervention
      const genericIntervention = plan.interventions.find(
        (i) => i.name === 'Individual Therapy',
      )
      expect(genericIntervention).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    it('should handle goal creation errors gracefully', async () => {
      // Mock KVStore to throw error
      const errorStore = {
        ...mockKVStore,
        set: vi.fn().mockRejectedValue(new Error('Storage error')),
      }

      const errorService = new TreatmentPlanningService(errorStore as any)

      const goalData = {
        userId: 'user123',
        title: 'Test Goal',
        description: 'Test description',
        status: 'active' as const,
        priority: 'medium' as const,
        category: 'Test',
        startDate: new Date(),
        barriers: [],
        supportingFactors: [],
      }

      await expect(errorService.createGoal(goalData)).rejects.toThrow(
        'Failed to create goal',
      )
    })

    it('should handle progress update errors gracefully', async () => {
      const progressData = {
        newProgress: 50,
        progressNotes: 'Test notes',
        evidenceOfProgress: [],
        therapistObservations: 'Test observations',
      }

      await expect(
        service.updateGoalProgress('non-existent-goal', progressData),
      ).rejects.toThrow('Goal not found')
    })

    it('should handle treatment plan creation errors gracefully', async () => {
      const errorStore = {
        ...mockKVStore,
        set: vi.fn().mockRejectedValue(new Error('Storage error')),
      }

      const errorService = new TreatmentPlanningService(errorStore as any)

      const planData = {
        clientId: 'client123',
        therapistId: 'therapist456',
        planName: 'Test Plan',
        description: 'Test description',
        status: 'active' as const,
        lastReviewDate: new Date(),
        nextReviewDate: new Date(),
        primaryDiagnosis: ['test'],
        secondaryDiagnosis: [],
        treatmentGoals: [],
        interventions: [],
        clientStrengths: [],
        riskFactors: [],
        protectiveFactors: [],
        treatmentHistory: [],
        outcomeMeasures: [],
        progressIndicators: [],
        planRationale: 'Test rationale',
        expectedDuration: 12,
        reviewFrequency: 4,
        dischargeCriteria: [],
      }

      await expect(errorService.createTreatmentPlan(planData)).rejects.toThrow(
        'Failed to create treatment plan',
      )
    })

    it('should handle session integration errors gracefully', async () => {
      const sessionDocumentation: SessionDocumentation = {
        summary: 'Test summary',
        keyInsights: [],
        therapeuticTechniques: [],
        emotionalPatterns: [],
        recommendedFollowUp: 'Test follow-up',
        treatmentProgress: {
          goals: [],
          overallAssessment: 'Test assessment',
        },
        nextSessionPlan: 'Test plan',
      }

      await expect(
        service.integrateWithSessionDocumentation(
          sessionDocumentation,
          'non-existent-plan',
          'session123',
        ),
      ).rejects.toThrow('Treatment plan not found')
    })
  })

  describe('Data Persistence', () => {
    it('should persist and retrieve goals correctly', async () => {
      const goalData = {
        userId: 'user123',
        title: 'Persistent Goal',
        description: 'Test persistence',
        status: 'active' as const,
        priority: 'medium' as const,
        category: 'Test',
        startDate: new Date(),
        barriers: [],
        supportingFactors: [],
      }

      const goal = await service.createGoal(goalData)

      // Create new service instance to test persistence
      const newService = new TreatmentPlanningService(mockKVStore)
      const retrievedGoals = await newService.getUserGoals('user123')

      expect(retrievedGoals.length).toBe(1)
      expect(retrievedGoals[0].id).toBe(goal.id)
      expect(retrievedGoals[0].title).toBe(goal.title)
    })

    it('should persist and retrieve treatment plans correctly', async () => {
      const planData = {
        clientId: 'client123',
        therapistId: 'therapist456',
        planName: 'Persistent Plan',
        description: 'Test persistence',
        status: 'active' as const,
        lastReviewDate: new Date(),
        nextReviewDate: new Date(),
        primaryDiagnosis: ['test'],
        secondaryDiagnosis: [],
        treatmentGoals: [],
        interventions: [],
        clientStrengths: [],
        riskFactors: [],
        protectiveFactors: [],
        treatmentHistory: [],
        outcomeMeasures: [],
        progressIndicators: [],
        planRationale: 'Test rationale',
        expectedDuration: 12,
        reviewFrequency: 4,
        dischargeCriteria: [],
      }

      const plan = await service.createTreatmentPlan(planData)

      // Create new service instance to test persistence
      const newService = new TreatmentPlanningService(mockKVStore)
      const retrievedPlan = await newService.getTreatmentPlan(plan.id)

      expect(retrievedPlan).toBeDefined()
      expect(retrievedPlan?.id).toBe(plan.id)
      expect(retrievedPlan?.planName).toBe(plan.planName)
    })
  })
})
