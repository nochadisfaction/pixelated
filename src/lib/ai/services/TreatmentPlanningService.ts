/**
 * Treatment Planning Service for Documentation Automation
 *
 * This service provides comprehensive treatment planning capabilities including:
 * - Goal tracking and management
 * - Automated treatment plan generation
 * - Outcome prediction and forecasting
 * - Progress monitoring and documentation
 * - Integration with session documentation
 */

import { getLogger } from '../../logging'
import type { KVStore } from '../../stores/types'
import type { SessionDocumentation } from '../interfaces/therapy'
import type { TreatmentRecommendation } from './RecommendationService'

const logger = getLogger({ prefix: 'treatment-planning-service' })

// Core interfaces for treatment planning
export interface Goal {
  id: string
  userId: string
  therapistId?: string
  title: string
  description: string
  status: 'active' | 'paused' | 'achieved' | 'not_achieved' | 'abandoned'
  priority: 'high' | 'medium' | 'low'
  category: string
  startDate: Date
  targetDate?: Date
  achievedDate?: Date
  createdAt: Date
  updatedAt: Date
  progress: number // 0-100
  milestones: GoalMilestone[]
  barriers: string[]
  supportingFactors: string[]
}

export interface SubGoal {
  id: string
  parentGoalId: string
  title: string
  description: string
  status: 'active' | 'paused' | 'achieved' | 'not_achieved' | 'abandoned'
  targetDate?: Date
  achievedDate?: Date
  createdAt: Date
  updatedAt: Date
  progress: number // 0-100
  dependencies: string[] // IDs of other subgoals this depends on
}

export interface GoalMilestone {
  id: string
  goalId: string
  title: string
  description: string
  targetDate: Date
  achievedDate?: Date
  status: 'pending' | 'achieved' | 'missed'
  significance: 'minor' | 'major' | 'breakthrough'
  evidence: string[]
}

export interface GoalProgressUpdate {
  id: string
  goalId: string
  sessionId?: string
  updateDate: Date
  previousProgress: number
  newProgress: number
  progressNotes: string
  evidenceOfProgress: string[]
  barriers: string[]
  nextSteps: string[]
  therapistObservations: string
  clientFeedback?: string
}

export interface TreatmentPlan {
  id: string
  clientId: string
  therapistId: string
  planName: string
  description: string
  status: 'active' | 'completed' | 'discontinued' | 'on_hold'
  createdAt: Date
  updatedAt: Date
  lastReviewDate: Date
  nextReviewDate: Date

  // Core components
  primaryDiagnosis: string[]
  secondaryDiagnosis: string[]
  treatmentGoals: string[] // Goal IDs
  interventions: PlannedIntervention[]

  // Assessment and planning
  clientStrengths: string[]
  riskFactors: string[]
  protectiveFactors: string[]
  treatmentHistory: string[]

  // Outcome tracking
  outcomeMeasures: OutcomeMeasure[]
  progressIndicators: ProgressIndicator[]

  // Documentation
  planRationale: string
  expectedDuration: number // weeks
  reviewFrequency: number // weeks
  dischargeCriteria: string[]

  // Predictions and forecasting
  outcomeForecasts: OutcomeForecast[]
  riskAssessments: RiskAssessment[]
}

export interface PlannedIntervention {
  id: string
  name: string
  type:
    | 'individual'
    | 'group'
    | 'family'
    | 'medication'
    | 'psychoeducation'
    | 'homework'
  description: string
  frequency: string // e.g., "weekly", "bi-weekly"
  duration: number // sessions
  targetGoals: string[] // Goal IDs
  evidenceBase: string[]
  expectedOutcomes: string[]
  contraindications: string[]
  adaptations: string[]
}

export interface OutcomeMeasure {
  id: string
  name: string
  type: 'standardized' | 'custom' | 'behavioral' | 'functional'
  description: string
  frequency: 'session' | 'weekly' | 'monthly' | 'quarterly'
  targetGoals: string[]
  baselineValue?: number
  currentValue?: number
  targetValue?: number
  measurements: Array<{
    date: Date
    value: number
    notes: string
    sessionId?: string
  }>
}

export interface ProgressIndicator {
  id: string
  name: string
  description: string
  type: 'behavioral' | 'cognitive' | 'emotional' | 'functional' | 'social'
  measurementMethod: string
  frequency: string
  targetGoals: string[]
  currentStatus: 'improving' | 'stable' | 'declining' | 'fluctuating'
  trend: Array<{
    date: Date
    status: string
    evidence: string[]
    sessionId?: string
  }>
}

export interface OutcomeForecast {
  id: string
  forecastType:
    | 'goal_achievement'
    | 'symptom_trajectory'
    | 'engagement'
    | 'relapse_risk'
  targetGoalId?: string
  timeHorizon: number // days
  probability: number // 0-1
  confidence: number // 0-1
  keyFactors: Array<{
    factor: string
    impact: 'positive' | 'negative' | 'neutral'
    strength: number // 0-1
  }>
  recommendations: string[]
  lastUpdated: Date
  modelVersion: string
}

export interface RiskAssessment {
  id: string
  riskType:
    | 'deterioration'
    | 'dropout'
    | 'crisis'
    | 'relapse'
    | 'non_compliance'
  riskLevel: 'low' | 'moderate' | 'high' | 'critical'
  probability: number // 0-1
  timeframe: number // days
  riskFactors: Array<{
    factor: string
    severity: 'low' | 'moderate' | 'high'
    modifiable: boolean
  }>
  protectiveFactors: Array<{
    factor: string
    strength: 'low' | 'moderate' | 'high'
  }>
  mitigationStrategies: string[]
  monitoringPlan: string[]
  lastAssessed: Date
}

export interface TreatmentPlanTemplate {
  id: string
  name: string
  description: string
  targetConditions: string[]
  defaultGoals: Partial<Goal>[]
  defaultInterventions: Partial<PlannedIntervention>[]
  defaultOutcomeMeasures: Partial<OutcomeMeasure>[]
  evidenceBase: string[]
  adaptationGuidelines: string[]
}

export interface DocumentationIntegration {
  sessionId: string
  treatmentPlanId: string
  goalsAddressed: string[]
  interventionsUsed: string[]
  progressUpdates: GoalProgressUpdate[]
  outcomeChanges: Array<{
    measureId: string
    previousValue: number
    newValue: number
    changeSignificance: 'minimal' | 'moderate' | 'significant' | 'major'
  }>
  planModifications: Array<{
    type:
      | 'goal_added'
      | 'goal_modified'
      | 'intervention_added'
      | 'intervention_modified'
      | 'timeline_adjusted'
    description: string
    rationale: string
  }>
  nextSessionPlanning: {
    priorityGoals: string[]
    plannedInterventions: string[]
    assessmentNeeds: string[]
  }
}

export interface TreatmentPlanningOptions {
  includeOutcomeForecasting?: boolean
  includeRiskAssessment?: boolean
  useTemplates?: boolean
  autoGenerateGoals?: boolean
  integrationLevel?: 'basic' | 'standard' | 'comprehensive'
}

/**
 * Comprehensive Treatment Planning Service
 */
export class TreatmentPlanningService {
  private goals: Map<string, Goal> = new Map()
  private subGoals: Map<string, SubGoal> = new Map()
  private treatmentPlans: Map<string, TreatmentPlan> = new Map()
  private templates: Map<string, TreatmentPlanTemplate> = new Map()
  private progressUpdates: Map<string, GoalProgressUpdate[]> = new Map()

  constructor(private kvStore: KVStore) {
    this.initializeTemplates()
  }

  /**
   * Create a new treatment goal
   */
  async createGoal(
    goalData: Omit<
      Goal,
      'id' | 'createdAt' | 'updatedAt' | 'progress' | 'milestones'
    >,
  ): Promise<Goal> {
    try {
      const goal: Goal = {
        ...goalData,
        id: this.generateId(),
        createdAt: new Date(),
        updatedAt: new Date(),
        progress: 0,
        milestones: [],
        barriers: goalData.barriers || [],
        supportingFactors: goalData.supportingFactors || [],
      }

      this.goals.set(goal.id, goal)
      await this.persistGoal(goal)

      logger.info('Goal created successfully', {
        goalId: goal.id,
        userId: goal.userId,
      })
      return goal
    } catch (error) {
      logger.error('Failed to create goal', { error, goalData })
      throw new Error(
        `Failed to create goal: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  /**
   * Update goal progress
   */
  async updateGoalProgress(
    goalId: string,
    progressData: {
      newProgress: number
      progressNotes: string
      evidenceOfProgress: string[]
      barriers?: string[]
      nextSteps?: string[]
      therapistObservations: string
      clientFeedback?: string
      sessionId?: string
    },
  ): Promise<GoalProgressUpdate> {
    try {
      const goal = this.goals.get(goalId)
      if (!goal) {
        throw new Error(`Goal not found: ${goalId}`)
      }

      const progressUpdate: GoalProgressUpdate = {
        id: this.generateId(),
        goalId,
        sessionId: progressData.sessionId,
        updateDate: new Date(),
        previousProgress: goal.progress,
        newProgress: progressData.newProgress,
        progressNotes: progressData.progressNotes,
        evidenceOfProgress: progressData.evidenceOfProgress,
        barriers: progressData.barriers || [],
        nextSteps: progressData.nextSteps || [],
        therapistObservations: progressData.therapistObservations,
        clientFeedback: progressData.clientFeedback,
      }

      // Update goal progress
      goal.progress = progressData.newProgress
      goal.updatedAt = new Date()

      // Check if goal is achieved
      if (progressData.newProgress >= 100 && goal.status === 'active') {
        goal.status = 'achieved'
        goal.achievedDate = new Date()
      }

      // Store progress update
      const updates = this.progressUpdates.get(goalId) || []
      updates.push(progressUpdate)
      this.progressUpdates.set(goalId, updates)

      await this.persistGoal(goal)
      await this.persistProgressUpdate(progressUpdate)

      logger.info('Goal progress updated', {
        goalId,
        newProgress: progressData.newProgress,
      })
      return progressUpdate
    } catch (error) {
      logger.error('Failed to update goal progress', { error, goalId })
      throw new Error(
        `Failed to update goal progress: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  /**
   * Create a comprehensive treatment plan
   */
  async createTreatmentPlan(
    planData: Omit<
      TreatmentPlan,
      'id' | 'createdAt' | 'updatedAt' | 'outcomeForecasts' | 'riskAssessments'
    >,
  ): Promise<TreatmentPlan> {
    try {
      const treatmentPlan: TreatmentPlan = {
        ...planData,
        id: this.generateId(),
        createdAt: new Date(),
        updatedAt: new Date(),
        outcomeForecasts: [],
        riskAssessments: [],
      }

      // Generate initial outcome forecasts
      treatmentPlan.outcomeForecasts =
        await this.generateOutcomeForecasts(treatmentPlan)

      // Generate initial risk assessments
      treatmentPlan.riskAssessments =
        await this.generateRiskAssessments(treatmentPlan)

      this.treatmentPlans.set(treatmentPlan.id, treatmentPlan)
      await this.persistTreatmentPlan(treatmentPlan)

      logger.info('Treatment plan created', {
        planId: treatmentPlan.id,
        clientId: treatmentPlan.clientId,
      })
      return treatmentPlan
    } catch (error) {
      logger.error('Failed to create treatment plan', { error, planData })
      throw new Error(
        `Failed to create treatment plan: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  /**
   * Generate automated treatment plan from client assessment
   */
  async generateAutomatedTreatmentPlan(
    clientId: string,
    therapistId: string,
    assessmentData: {
      primaryDiagnosis: string[]
      secondaryDiagnosis: string[]
      clientStrengths: string[]
      riskFactors: string[]
      treatmentHistory: string[]
      clientPreferences?: string[]
    },
    options: TreatmentPlanningOptions = {},
  ): Promise<TreatmentPlan> {
    try {
      // Find appropriate template
      const template = this.findBestTemplate(assessmentData.primaryDiagnosis)

      // Generate goals based on assessment and template
      const goals = await this.generateGoalsFromAssessment(
        clientId,
        assessmentData,
        template,
      )

      // Generate interventions
      const interventions = this.generateInterventionsFromTemplate(
        template,
        assessmentData,
      )

      // Generate outcome measures
      const outcomeMeasures = this.generateOutcomeMeasuresFromTemplate(
        template,
        goals,
      )

      const treatmentPlan: Omit<
        TreatmentPlan,
        | 'id'
        | 'createdAt'
        | 'updatedAt'
        | 'outcomeForecasts'
        | 'riskAssessments'
      > = {
        clientId,
        therapistId,
        planName: `Treatment Plan for ${assessmentData.primaryDiagnosis.join(', ')}`,
        description: `Automated treatment plan generated based on assessment data and evidence-based practices`,
        status: 'active',
        lastReviewDate: new Date(),
        nextReviewDate: new Date(Date.now() + 4 * 7 * 24 * 60 * 60 * 1000), // 4 weeks
        primaryDiagnosis: assessmentData.primaryDiagnosis,
        secondaryDiagnosis: assessmentData.secondaryDiagnosis,
        treatmentGoals: goals.map((g) => g.id),
        interventions,
        clientStrengths: assessmentData.clientStrengths,
        riskFactors: assessmentData.riskFactors,
        protectiveFactors: this.identifyProtectiveFactors(assessmentData),
        treatmentHistory: assessmentData.treatmentHistory,
        outcomeMeasures,
        progressIndicators: this.generateProgressIndicators(goals),
        planRationale: this.generatePlanRationale(assessmentData, template),
        expectedDuration: this.estimateTreatmentDuration(
          assessmentData,
          template,
        ),
        reviewFrequency: 4, // weeks
        dischargeCriteria: this.generateDischargeCriteria(
          goals,
          assessmentData,
        ),
      }

      // Create the goals first
      for (const goal of goals) {
        await this.createGoal(goal)
      }

      return await this.createTreatmentPlan(treatmentPlan)
    } catch (error) {
      logger.error('Failed to generate automated treatment plan', {
        error,
        clientId,
      })
      throw new Error(
        `Failed to generate automated treatment plan: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  /**
   * Integrate treatment planning with session documentation
   */
  async integrateWithSessionDocumentation(
    sessionDocumentation: SessionDocumentation,
    treatmentPlanId: string,
    sessionId: string,
  ): Promise<DocumentationIntegration> {
    try {
      const treatmentPlan = this.treatmentPlans.get(treatmentPlanId)
      if (!treatmentPlan) {
        throw new Error(`Treatment plan not found: ${treatmentPlanId}`)
      }

      // Analyze session documentation for goal-related content
      const goalsAddressed = await this.identifyGoalsFromSession(
        sessionDocumentation,
        treatmentPlan,
      )

      // Extract interventions used
      const interventionsUsed = this.identifyInterventionsFromSession(
        sessionDocumentation,
        treatmentPlan,
      )

      // Generate progress updates based on session content
      const progressUpdates = await this.generateProgressUpdatesFromSession(
        sessionDocumentation,
        goalsAddressed,
        sessionId,
      )

      // Identify outcome changes
      const outcomeChanges = this.identifyOutcomeChanges(
        sessionDocumentation,
        treatmentPlan,
      )

      // Suggest plan modifications
      const planModifications = this.suggestPlanModifications(
        sessionDocumentation,
        treatmentPlan,
      )

      // Generate next session planning
      const nextSessionPlanning = this.generateNextSessionPlanning(
        treatmentPlan,
        progressUpdates,
      )

      const integration: DocumentationIntegration = {
        sessionId,
        treatmentPlanId,
        goalsAddressed,
        interventionsUsed,
        progressUpdates,
        outcomeChanges,
        planModifications,
        nextSessionPlanning,
      }

      // Update treatment plan based on session
      await this.updateTreatmentPlanFromSession(treatmentPlan, integration)

      logger.info('Session documentation integrated with treatment plan', {
        sessionId,
        treatmentPlanId,
      })
      return integration
    } catch (error) {
      logger.error('Failed to integrate session documentation', {
        error,
        sessionId,
        treatmentPlanId,
      })
      throw new Error(
        `Failed to integrate session documentation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  /**
   * Generate outcome forecasts for treatment plan
   */
  private async generateOutcomeForecasts(
    treatmentPlan: TreatmentPlan,
  ): Promise<OutcomeForecast[]> {
    const forecasts: OutcomeForecast[] = []

    // Goal achievement forecasts
    for (const goalId of treatmentPlan.treatmentGoals) {
      const goal = this.goals.get(goalId)
      if (goal) {
        forecasts.push({
          id: this.generateId(),
          forecastType: 'goal_achievement',
          targetGoalId: goalId,
          timeHorizon: goal.targetDate
            ? Math.ceil(
                (goal.targetDate.getTime() - Date.now()) /
                  (24 * 60 * 60 * 1000),
              )
            : 90,
          probability: this.calculateGoalAchievementProbability(
            goal,
            treatmentPlan,
          ),
          confidence: 0.75,
          keyFactors: this.identifyGoalAchievementFactors(goal, treatmentPlan),
          recommendations: this.generateGoalRecommendations(
            goal,
            treatmentPlan,
          ),
          lastUpdated: new Date(),
          modelVersion: '1.0',
        })
      }
    }

    // Engagement forecast
    forecasts.push({
      id: this.generateId(),
      forecastType: 'engagement',
      timeHorizon: 30,
      probability: this.calculateEngagementProbability(treatmentPlan),
      confidence: 0.7,
      keyFactors: this.identifyEngagementFactors(treatmentPlan),
      recommendations: this.generateEngagementRecommendations(treatmentPlan),
      lastUpdated: new Date(),
      modelVersion: '1.0',
    })

    return forecasts
  }

  /**
   * Generate risk assessments for treatment plan
   */
  private async generateRiskAssessments(
    treatmentPlan: TreatmentPlan,
  ): Promise<RiskAssessment[]> {
    const assessments: RiskAssessment[] = []

    // Dropout risk
    assessments.push({
      id: this.generateId(),
      riskType: 'dropout',
      riskLevel: this.assessDropoutRisk(treatmentPlan),
      probability: this.calculateDropoutProbability(treatmentPlan),
      timeframe: 30,
      riskFactors: this.identifyDropoutRiskFactors(treatmentPlan),
      protectiveFactors: this.identifyDropoutProtectiveFactors(treatmentPlan),
      mitigationStrategies:
        this.generateDropoutMitigationStrategies(treatmentPlan),
      monitoringPlan: this.generateDropoutMonitoringPlan(treatmentPlan),
      lastAssessed: new Date(),
    })

    // Deterioration risk
    assessments.push({
      id: this.generateId(),
      riskType: 'deterioration',
      riskLevel: this.assessDeteriorationRisk(treatmentPlan),
      probability: this.calculateDeteriorationProbability(treatmentPlan),
      timeframe: 14,
      riskFactors: this.identifyDeteriorationRiskFactors(treatmentPlan),
      protectiveFactors:
        this.identifyDeteriorationProtectiveFactors(treatmentPlan),
      mitigationStrategies:
        this.generateDeteriorationMitigationStrategies(treatmentPlan),
      monitoringPlan: this.generateDeteriorationMonitoringPlan(treatmentPlan),
      lastAssessed: new Date(),
    })

    return assessments
  }

  /**
   * Get treatment plan with current status
   */
  async getTreatmentPlan(planId: string): Promise<TreatmentPlan | null> {
    try {
      const plan = this.treatmentPlans.get(planId)
      if (!plan) {
        // Try to load from storage
        const storedPlan = await this.loadTreatmentPlan(planId)
        if (storedPlan) {
          this.treatmentPlans.set(planId, storedPlan)
          return storedPlan
        }
        return null
      }
      return plan
    } catch (error) {
      logger.error('Failed to get treatment plan', { error, planId })
      return null
    }
  }

  /**
   * Get goals for a user
   */
  async getUserGoals(userId: string, status?: Goal['status']): Promise<Goal[]> {
    try {
      const userGoals = Array.from(this.goals.values()).filter((goal) => {
        if (goal.userId !== userId) return false
        if (status && goal.status !== status) return false
        return true
      })

      // Load from storage if not in memory
      if (userGoals.length === 0) {
        const storedGoals = await this.loadUserGoals(userId)
        storedGoals.forEach((goal) => this.goals.set(goal.id, goal))
        return storedGoals.filter((goal) => !status || goal.status === status)
      }

      return userGoals
    } catch (error) {
      logger.error('Failed to get user goals', { error, userId })
      return []
    }
  }

  /**
   * Generate comprehensive treatment plan report
   */
  async generateTreatmentPlanReport(planId: string): Promise<{
    plan: TreatmentPlan
    goals: Goal[]
    progressSummary: {
      totalGoals: number
      activeGoals: number
      achievedGoals: number
      averageProgress: number
      recentUpdates: GoalProgressUpdate[]
    }
    outcomeAnalysis: {
      forecasts: OutcomeForecast[]
      riskAssessments: RiskAssessment[]
      recommendations: string[]
    }
    nextSteps: string[]
  }> {
    try {
      const plan = await this.getTreatmentPlan(planId)
      if (!plan) {
        throw new Error(`Treatment plan not found: ${planId}`)
      }

      // Get all goals for this plan
      const goals = await Promise.all(
        plan.treatmentGoals
          .map((goalId) => this.goals.get(goalId))
          .filter(Boolean) as Goal[],
      )

      // Calculate progress summary
      const progressSummary = {
        totalGoals: goals.length,
        activeGoals: goals.filter((g) => g.status === 'active').length,
        achievedGoals: goals.filter((g) => g.status === 'achieved').length,
        averageProgress:
          goals.length > 0
            ? goals.reduce((sum, g) => sum + g.progress, 0) / goals.length
            : 0,
        recentUpdates: this.getRecentProgressUpdates(plan.treatmentGoals, 7), // Last 7 days
      }

      // Outcome analysis
      const outcomeAnalysis = {
        forecasts: plan.outcomeForecasts,
        riskAssessments: plan.riskAssessments,
        recommendations: this.generatePlanRecommendations(
          plan,
          goals,
          progressSummary,
        ),
      }

      // Generate next steps
      const nextSteps = this.generateNextSteps(plan, goals, progressSummary)

      return {
        plan,
        goals,
        progressSummary,
        outcomeAnalysis,
        nextSteps,
      }
    } catch (error) {
      logger.error('Failed to generate treatment plan report', {
        error,
        planId,
      })
      throw new Error(
        `Failed to generate treatment plan report: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  // Helper methods for implementation
  private generateId(): string {
    return `tp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private async persistGoal(goal: Goal): Promise<void> {
    await this.kvStore.set(`goal:${goal.id}`, JSON.stringify(goal))

    // Also maintain user index
    const userGoalsKey = `user_goals:${goal.userId}`
    const existingGoals = await this.kvStore.get(userGoalsKey)
    const goalIds = existingGoals ? JSON.parse(existingGoals) : []
    if (!goalIds.includes(goal.id)) {
      goalIds.push(goal.id)
      await this.kvStore.set(userGoalsKey, JSON.stringify(goalIds))
    }
  }

  private async persistTreatmentPlan(plan: TreatmentPlan): Promise<void> {
    await this.kvStore.set(`treatment_plan:${plan.id}`, JSON.stringify(plan))

    // Maintain client index
    const clientPlansKey = `client_plans:${plan.clientId}`
    const existingPlans = await this.kvStore.get(clientPlansKey)
    const planIds = existingPlans ? JSON.parse(existingPlans) : []
    if (!planIds.includes(plan.id)) {
      planIds.push(plan.id)
      await this.kvStore.set(clientPlansKey, JSON.stringify(planIds))
    }
  }

  private async persistProgressUpdate(
    update: GoalProgressUpdate,
  ): Promise<void> {
    await this.kvStore.set(
      `progress_update:${update.id}`,
      JSON.stringify(update),
    )

    // Maintain goal index
    const goalUpdatesKey = `goal_updates:${update.goalId}`
    const existingUpdates = await this.kvStore.get(goalUpdatesKey)
    const updateIds = existingUpdates ? JSON.parse(existingUpdates) : []
    updateIds.push(update.id)
    await this.kvStore.set(goalUpdatesKey, JSON.stringify(updateIds))
  }

  private async loadTreatmentPlan(
    planId: string,
  ): Promise<TreatmentPlan | null> {
    try {
      const planData = await this.kvStore.get(`treatment_plan:${planId}`)
      return planData ? JSON.parse(planData) : null
    } catch (error) {
      logger.error('Failed to load treatment plan from storage', {
        error,
        planId,
      })
      return null
    }
  }

  private async loadUserGoals(userId: string): Promise<Goal[]> {
    try {
      const userGoalsKey = `user_goals:${userId}`
      const goalIdsData = await this.kvStore.get(userGoalsKey)
      if (!goalIdsData) return []

      const goalIds = JSON.parse(goalIdsData)
      const goals: Goal[] = []

      for (const goalId of goalIds) {
        const goalData = await this.kvStore.get(`goal:${goalId}`)
        if (goalData) {
          goals.push(JSON.parse(goalData))
        }
      }

      return goals
    } catch (error) {
      logger.error('Failed to load user goals from storage', { error, userId })
      return []
    }
  }

  private initializeTemplates(): void {
    // Initialize with common treatment plan templates
    const templates: TreatmentPlanTemplate[] = [
      {
        id: 'anxiety_template',
        name: 'Anxiety Disorders Treatment Plan',
        description: 'Evidence-based treatment plan for anxiety disorders',
        targetConditions: [
          'anxiety',
          'generalized anxiety disorder',
          'panic disorder',
          'social anxiety',
        ],
        defaultGoals: [
          {
            title: 'Reduce anxiety symptoms',
            description: 'Decrease frequency and intensity of anxiety symptoms',
            category: 'Symptom Management',
            priority: 'high',
            barriers: ['avoidance behaviors', 'catastrophic thinking'],
            supportingFactors: ['motivation for change', 'social support'],
          },
          {
            title: 'Develop coping strategies',
            description:
              'Learn and practice effective anxiety management techniques',
            category: 'Skill Development',
            priority: 'high',
            barriers: ['difficulty with relaxation', 'perfectionism'],
            supportingFactors: [
              'willingness to practice',
              'previous therapy experience',
            ],
          },
        ],
        defaultInterventions: [
          {
            name: 'Cognitive Behavioral Therapy',
            type: 'individual',
            description: 'CBT techniques for anxiety management',
            frequency: 'weekly',
            duration: 12,
            evidenceBase: ['CBT for anxiety meta-analysis', 'APA guidelines'],
            expectedOutcomes: ['reduced anxiety symptoms', 'improved coping'],
            contraindications: [
              'active psychosis',
              'severe cognitive impairment',
            ],
            adaptations: [
              'culturally adapted CBT',
              'trauma-informed modifications',
            ],
          },
        ],
        defaultOutcomeMeasures: [
          {
            name: 'GAD-7',
            type: 'standardized',
            description: 'Generalized Anxiety Disorder 7-item scale',
            frequency: 'weekly',
          },
        ],
        evidenceBase: ['APA Clinical Practice Guidelines', 'Cochrane Reviews'],
        adaptationGuidelines: [
          'Consider cultural factors',
          'Adapt for age and developmental level',
        ],
      },
      {
        id: 'depression_template',
        name: 'Depression Treatment Plan',
        description: 'Evidence-based treatment plan for depressive disorders',
        targetConditions: [
          'depression',
          'major depressive disorder',
          'persistent depressive disorder',
        ],
        defaultGoals: [
          {
            title: 'Improve mood and reduce depressive symptoms',
            description:
              'Decrease severity and frequency of depressive episodes',
            category: 'Symptom Management',
            priority: 'high',
            barriers: ['low motivation', 'negative thinking patterns'],
            supportingFactors: ['family support', 'previous treatment success'],
          },
          {
            title: 'Increase behavioral activation',
            description: 'Engage in meaningful and pleasurable activities',
            category: 'Behavioral Change',
            priority: 'high',
            barriers: ['fatigue', 'anhedonia'],
            supportingFactors: ['identified interests', 'social connections'],
          },
        ],
        defaultInterventions: [
          {
            name: 'Cognitive Behavioral Therapy',
            type: 'individual',
            description: 'CBT for depression including behavioral activation',
            frequency: 'weekly',
            duration: 16,
            evidenceBase: ['CBT for depression RCTs', 'NICE guidelines'],
            expectedOutcomes: ['improved mood', 'increased activity level'],
            contraindications: [
              'active suicidal ideation requiring hospitalization',
            ],
            adaptations: ['culturally adapted CBT', 'adolescent modifications'],
          },
        ],
        defaultOutcomeMeasures: [
          {
            name: 'PHQ-9',
            type: 'standardized',
            description: 'Patient Health Questionnaire-9',
            frequency: 'weekly',
          },
        ],
        evidenceBase: ['APA Clinical Practice Guidelines', 'NICE Guidelines'],
        adaptationGuidelines: [
          'Consider comorbid conditions',
          'Adapt for severity level',
        ],
      },
    ]

    templates.forEach((template) => {
      this.templates.set(template.id, template)
    })
  }

  private findBestTemplate(diagnoses: string[]): TreatmentPlanTemplate | null {
    for (const template of this.templates.values()) {
      for (const diagnosis of diagnoses) {
        if (
          template.targetConditions.some((condition) =>
            diagnosis.toLowerCase().includes(condition.toLowerCase()),
          )
        ) {
          return template
        }
      }
    }
    return null
  }

  private async generateGoalsFromAssessment(
    clientId: string,
    assessmentData: any,
    template: TreatmentPlanTemplate | null,
  ): Promise<
    Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'progress' | 'milestones'>[]
  > {
    const goals: Omit<
      Goal,
      'id' | 'createdAt' | 'updatedAt' | 'progress' | 'milestones'
    >[] = []

    if (template) {
      // Use template goals as base
      for (const templateGoal of template.defaultGoals) {
        goals.push({
          userId: clientId,
          title: templateGoal.title || 'Untitled Goal',
          description: templateGoal.description || '',
          status: 'active',
          priority: templateGoal.priority || 'medium',
          category: templateGoal.category || 'General',
          startDate: new Date(),
          targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
          barriers: templateGoal.barriers || [],
          supportingFactors: templateGoal.supportingFactors || [],
        })
      }
    } else {
      // Generate generic goals based on diagnosis
      for (const diagnosis of assessmentData.primaryDiagnosis) {
        goals.push({
          userId: clientId,
          title: `Manage ${diagnosis} symptoms`,
          description: `Develop effective strategies to manage ${diagnosis} symptoms and improve functioning`,
          status: 'active',
          priority: 'high',
          category: 'Symptom Management',
          startDate: new Date(),
          targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          barriers: assessmentData.riskFactors.slice(0, 3),
          supportingFactors: assessmentData.clientStrengths.slice(0, 3),
        })
      }
    }

    return goals
  }

  private generateInterventionsFromTemplate(
    template: TreatmentPlanTemplate | null,
    assessmentData: any,
  ): PlannedIntervention[] {
    if (template) {
      return template.defaultInterventions.map((intervention) => ({
        id: this.generateId(),
        name: intervention.name || 'Intervention',
        type: intervention.type || 'individual',
        description: intervention.description || '',
        frequency: intervention.frequency || 'weekly',
        duration: intervention.duration || 12,
        targetGoals: [], // Will be populated when goals are created
        evidenceBase: intervention.evidenceBase || [],
        expectedOutcomes: intervention.expectedOutcomes || [],
        contraindications: intervention.contraindications || [],
        adaptations: intervention.adaptations || [],
      }))
    }

    // Default interventions
    return [
      {
        id: this.generateId(),
        name: 'Individual Therapy',
        type: 'individual',
        description: 'Weekly individual therapy sessions',
        frequency: 'weekly',
        duration: 12,
        targetGoals: [],
        evidenceBase: ['Evidence-based practice guidelines'],
        expectedOutcomes: ['Symptom improvement', 'Increased coping skills'],
        contraindications: [],
        adaptations: [],
      },
    ]
  }

  private generateOutcomeMeasuresFromTemplate(
    template: TreatmentPlanTemplate | null,
    goals: any[],
  ): OutcomeMeasure[] {
    const measures: OutcomeMeasure[] = []

    if (template) {
      template.defaultOutcomeMeasures.forEach((measure) => {
        measures.push({
          id: this.generateId(),
          name: measure.name || 'Outcome Measure',
          type: measure.type || 'standardized',
          description: measure.description || '',
          frequency: measure.frequency || 'weekly',
          targetGoals: goals.map((g) => g.id),
          measurements: [],
        })
      })
    } else {
      // Default outcome measure
      measures.push({
        id: this.generateId(),
        name: 'Symptom Severity Scale',
        type: 'standardized',
        description: 'Weekly assessment of symptom severity',
        frequency: 'weekly',
        targetGoals: goals.map((g) => g.id),
        measurements: [],
      })
    }

    return measures
  }

  private generateProgressIndicators(goals: any[]): ProgressIndicator[] {
    return goals.map((goal) => ({
      id: this.generateId(),
      name: `${goal.title} Progress`,
      description: `Progress indicator for ${goal.title}`,
      type: 'behavioral',
      measurementMethod: 'Therapist observation and client self-report',
      frequency: 'weekly',
      targetGoals: [goal.id],
      currentStatus: 'stable',
      trend: [],
    }))
  }

  private identifyProtectiveFactors(assessmentData: any): string[] {
    const factors = [...assessmentData.clientStrengths]

    // Add common protective factors
    if (assessmentData.treatmentHistory.length > 0) {
      factors.push('Previous therapy experience')
    }

    return factors
  }

  private generatePlanRationale(
    assessmentData: any,
    template: TreatmentPlanTemplate | null,
  ): string {
    let rationale = `Treatment plan developed based on assessment findings indicating ${assessmentData.primaryDiagnosis.join(', ')}.`

    if (template) {
      rationale += ` Evidence-based interventions selected according to ${template.evidenceBase.join(', ')}.`
    }

    rationale += ` Client strengths include ${assessmentData.clientStrengths.slice(0, 3).join(', ')}.`

    return rationale
  }

  private estimateTreatmentDuration(
    assessmentData: any,
    template: TreatmentPlanTemplate | null,
  ): number {
    // Base duration on severity and complexity
    let duration = 12 // weeks

    if (assessmentData.secondaryDiagnosis.length > 0) {
      duration += 4 // Add time for comorbidity
    }

    if (assessmentData.riskFactors.length > 3) {
      duration += 4 // Add time for high risk
    }

    return Math.min(duration, 24) // Cap at 24 weeks
  }

  private generateDischargeCriteria(
    goals: any[],
    assessmentData: any,
  ): string[] {
    const criteria = [
      'Achievement of 80% or greater progress on primary treatment goals',
      'Demonstrated ability to independently use coping strategies',
      'Stable mood and functioning for at least 4 weeks',
    ]

    if (assessmentData.riskFactors.includes('suicidal ideation')) {
      criteria.push('No suicidal ideation for at least 8 weeks')
    }

    return criteria
  }

  // Placeholder implementations for complex calculation methods
  private calculateGoalAchievementProbability(
    goal: Goal,
    plan: TreatmentPlan,
  ): number {
    // Simplified calculation - in practice would use ML models
    let probability = 0.7 // Base probability

    if (goal.priority === 'high') probability += 0.1
    if (goal.barriers.length < 2) probability += 0.1
    if (goal.supportingFactors.length > 2) probability += 0.1

    return Math.min(probability, 0.95)
  }

  private identifyGoalAchievementFactors(
    goal: Goal,
    plan: TreatmentPlan,
  ): Array<{
    factor: string
    impact: 'positive' | 'negative' | 'neutral'
    strength: number
  }> {
    const factors = []

    for (const factor of goal.supportingFactors) {
      factors.push({
        factor,
        impact: 'positive' as const,
        strength: 0.7,
      })
    }

    for (const barrier of goal.barriers) {
      factors.push({
        factor: barrier,
        impact: 'negative' as const,
        strength: 0.6,
      })
    }

    return factors
  }

  private generateGoalRecommendations(
    goal: Goal,
    plan: TreatmentPlan,
  ): string[] {
    const recommendations = []

    if (goal.barriers.length > 2) {
      recommendations.push(
        'Focus on addressing identified barriers in upcoming sessions',
      )
    }

    if (goal.progress < 25) {
      recommendations.push(
        'Consider breaking goal into smaller, more achievable sub-goals',
      )
    }

    return recommendations
  }

  private calculateEngagementProbability(plan: TreatmentPlan): number {
    // Simplified engagement calculation
    let probability = 0.8

    if (plan.clientStrengths.includes('motivation')) probability += 0.1
    if (plan.riskFactors.includes('poor treatment history')) probability -= 0.2

    return Math.max(0.3, Math.min(probability, 0.95))
  }

  private identifyEngagementFactors(plan: TreatmentPlan): Array<{
    factor: string
    impact: 'positive' | 'negative' | 'neutral'
    strength: number
  }> {
    const factors = []

    plan.clientStrengths.forEach((strength) => {
      factors.push({
        factor: strength,
        impact: 'positive' as const,
        strength: 0.6,
      })
    })

    return factors
  }

  private generateEngagementRecommendations(plan: TreatmentPlan): string[] {
    return [
      'Monitor attendance and engagement regularly',
      'Address barriers to engagement proactively',
      'Utilize client strengths to enhance motivation',
    ]
  }

  private assessDropoutRisk(
    plan: TreatmentPlan,
  ): 'low' | 'moderate' | 'high' | 'critical' {
    if (plan.riskFactors.includes('poor treatment history')) return 'high'
    if (plan.riskFactors.length > 3) return 'moderate'
    return 'low'
  }

  private calculateDropoutProbability(plan: TreatmentPlan): number {
    // Simplified calculation
    return plan.riskFactors.length * 0.1
  }

  private identifyDropoutRiskFactors(plan: TreatmentPlan): Array<{
    factor: string
    severity: 'low' | 'moderate' | 'high'
    modifiable: boolean
  }> {
    return plan.riskFactors.map((factor) => ({
      factor,
      severity: 'moderate' as const,
      modifiable: true,
    }))
  }

  private identifyDropoutProtectiveFactors(
    plan: TreatmentPlan,
  ): Array<{ factor: string; strength: 'low' | 'moderate' | 'high' }> {
    return plan.clientStrengths.map((strength) => ({
      factor: strength,
      strength: 'moderate' as const,
    }))
  }

  private generateDropoutMitigationStrategies(plan: TreatmentPlan): string[] {
    return [
      'Build strong therapeutic alliance early',
      'Address practical barriers to attendance',
      'Provide psychoeducation about treatment process',
    ]
  }

  private generateDropoutMonitoringPlan(plan: TreatmentPlan): string[] {
    return [
      'Track session attendance',
      'Monitor engagement levels',
      'Check in about barriers regularly',
    ]
  }

  private assessDeteriorationRisk(
    plan: TreatmentPlan,
  ): 'low' | 'moderate' | 'high' | 'critical' {
    if (plan.riskFactors.includes('suicidal ideation')) return 'high'
    if (plan.riskFactors.includes('substance use')) return 'moderate'
    return 'low'
  }

  private calculateDeteriorationProbability(plan: TreatmentPlan): number {
    return Math.min(plan.riskFactors.length * 0.05, 0.3)
  }

  private identifyDeteriorationRiskFactors(plan: TreatmentPlan): Array<{
    factor: string
    severity: 'low' | 'moderate' | 'high'
    modifiable: boolean
  }> {
    return plan.riskFactors.map((factor) => ({
      factor,
      severity: factor.includes('suicidal')
        ? ('high' as const)
        : ('moderate' as const),
      modifiable: !factor.includes('history'),
    }))
  }

  private identifyDeteriorationProtectiveFactors(
    plan: TreatmentPlan,
  ): Array<{ factor: string; strength: 'low' | 'moderate' | 'high' }> {
    return plan.protectiveFactors.map((factor) => ({
      factor,
      strength: 'moderate' as const,
    }))
  }

  private generateDeteriorationMitigationStrategies(
    plan: TreatmentPlan,
  ): string[] {
    return [
      'Regular risk assessment',
      'Crisis planning',
      'Strengthen support systems',
    ]
  }

  private generateDeteriorationMonitoringPlan(plan: TreatmentPlan): string[] {
    return [
      'Weekly symptom monitoring',
      'Safety check-ins',
      'Coordinate with support team',
    ]
  }

  private async identifyGoalsFromSession(
    session: SessionDocumentation,
    plan: TreatmentPlan,
  ): Promise<string[]> {
    // Analyze session content to identify which goals were addressed
    const goalsAddressed = []

    for (const goalId of plan.treatmentGoals) {
      const goal = this.goals.get(goalId)
      if (goal) {
        // Simple keyword matching - in practice would use NLP
        const sessionText = `${session.summary} ${session.keyInsights.join(' ')} ${session.nextSessionPlan}`
        if (
          sessionText.toLowerCase().includes(goal.title.toLowerCase()) ||
          sessionText.toLowerCase().includes(goal.category.toLowerCase())
        ) {
          goalsAddressed.push(goalId)
        }
      }
    }

    return goalsAddressed
  }

  private identifyInterventionsFromSession(
    session: SessionDocumentation,
    plan: TreatmentPlan,
  ): string[] {
    const interventionsUsed = []

    for (const intervention of plan.interventions) {
      // Check if intervention techniques were mentioned
      const sessionText = session.therapeuticTechniques
        .map((t) => t.name)
        .join(' ')
      if (sessionText.toLowerCase().includes(intervention.name.toLowerCase())) {
        interventionsUsed.push(intervention.id)
      }
    }

    return interventionsUsed
  }

  private async generateProgressUpdatesFromSession(
    session: SessionDocumentation,
    goalsAddressed: string[],
    sessionId: string,
  ): Promise<GoalProgressUpdate[]> {
    const updates = []

    for (const goalId of goalsAddressed) {
      const goal = this.goals.get(goalId)
      if (goal) {
        // Estimate progress based on session content
        const progressIncrease = this.estimateProgressFromSession(session, goal)

        updates.push({
          id: this.generateId(),
          goalId,
          sessionId,
          updateDate: new Date(),
          previousProgress: goal.progress,
          newProgress: Math.min(goal.progress + progressIncrease, 100),
          progressNotes: `Progress noted during session: ${session.summary.substring(0, 200)}...`,
          evidenceOfProgress: session.keyInsights.slice(0, 2),
          barriers: [],
          nextSteps: [session.nextSessionPlan],
          therapistObservations: session.keyInsights.join('; '),
        })
      }
    }

    return updates
  }

  private estimateProgressFromSession(
    session: SessionDocumentation,
    goal: Goal,
  ): number {
    // Simple heuristic - in practice would use more sophisticated analysis
    let progressIncrease = 5 // Base progress per session

    // Increase based on positive indicators
    if (
      session.keyInsights.some(
        (insight) =>
          insight.includes('progress') || insight.includes('improvement'),
      )
    ) {
      progressIncrease += 5
    }

    // Increase based on technique effectiveness
    const avgEffectiveness =
      session.therapeuticTechniques.reduce(
        (sum, t) => sum + t.effectiveness,
        0,
      ) / session.therapeuticTechniques.length
    if (avgEffectiveness > 7) {
      progressIncrease += 3
    }

    return progressIncrease
  }

  private identifyOutcomeChanges(
    session: SessionDocumentation,
    plan: TreatmentPlan,
  ): Array<{
    measureId: string
    previousValue: number
    newValue: number
    changeSignificance: 'minimal' | 'moderate' | 'significant' | 'major'
  }> {
    // Placeholder - would integrate with actual outcome measurement system
    return []
  }

  private suggestPlanModifications(
    session: SessionDocumentation,
    plan: TreatmentPlan,
  ): Array<{
    type:
      | 'goal_added'
      | 'goal_modified'
      | 'intervention_added'
      | 'intervention_modified'
      | 'timeline_adjusted'
    description: string
    rationale: string
  }> {
    const modifications = []

    // Check for emergent issues that might require new goals
    if (session.emergentIssues && session.emergentIssues.length > 0) {
      modifications.push({
        type: 'goal_added',
        description: `Consider adding goal to address: ${session.emergentIssues[0]}`,
        rationale: 'Emergent issue identified during session',
      })
    }

    return modifications
  }

  private generateNextSessionPlanning(
    plan: TreatmentPlan,
    progressUpdates: GoalProgressUpdate[],
  ): {
    priorityGoals: string[]
    plannedInterventions: string[]
    assessmentNeeds: string[]
  } {
    // Identify goals that need attention
    const priorityGoals = progressUpdates
      .filter((update) => update.newProgress < 50)
      .map((update) => update.goalId)
      .slice(0, 3)

    // Suggest interventions based on plan
    const plannedInterventions = plan.interventions
      .filter((intervention) =>
        intervention.targetGoals.some((goalId) =>
          priorityGoals.includes(goalId),
        ),
      )
      .map((intervention) => intervention.name)
      .slice(0, 2)

    const assessmentNeeds = []
    if (
      plan.outcomeMeasures.some((measure) => measure.frequency === 'weekly')
    ) {
      assessmentNeeds.push('Weekly outcome measures')
    }

    return {
      priorityGoals,
      plannedInterventions,
      assessmentNeeds,
    }
  }

  private async updateTreatmentPlanFromSession(
    plan: TreatmentPlan,
    integration: DocumentationIntegration,
  ): Promise<void> {
    // Update plan based on session integration
    plan.updatedAt = new Date()

    // Update outcome forecasts if significant progress
    if (
      integration.progressUpdates.some(
        (update) => update.newProgress - update.previousProgress > 10,
      )
    ) {
      plan.outcomeForecasts = await this.generateOutcomeForecasts(plan)
    }

    await this.persistTreatmentPlan(plan)
  }

  private getRecentProgressUpdates(
    goalIds: string[],
    days: number,
  ): GoalProgressUpdate[] {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const recentUpdates = []

    for (const goalId of goalIds) {
      const updates = this.progressUpdates.get(goalId) || []
      recentUpdates.push(
        ...updates.filter((update) => update.updateDate >= cutoffDate),
      )
    }

    return recentUpdates.sort(
      (a, b) => b.updateDate.getTime() - a.updateDate.getTime(),
    )
  }

  private generatePlanRecommendations(
    plan: TreatmentPlan,
    goals: Goal[],
    progressSummary: any,
  ): string[] {
    const recommendations = []

    if (progressSummary.averageProgress < 30) {
      recommendations.push(
        'Consider reviewing and adjusting treatment goals - progress may be slower than expected',
      )
    }

    if (progressSummary.activeGoals > 5) {
      recommendations.push(
        'Consider prioritizing fewer goals to improve focus and outcomes',
      )
    }

    if (plan.riskAssessments.some((risk) => risk.riskLevel === 'high')) {
      recommendations.push(
        'High risk factors identified - increase monitoring and support',
      )
    }

    return recommendations
  }

  private generateNextSteps(
    plan: TreatmentPlan,
    goals: Goal[],
    progressSummary: any,
  ): string[] {
    const nextSteps = []

    if (progressSummary.recentUpdates.length === 0) {
      nextSteps.push('Update goal progress based on recent sessions')
    }

    if (plan.nextReviewDate <= new Date()) {
      nextSteps.push('Conduct treatment plan review')
    }

    const stagnantGoals = goals.filter(
      (goal) => goal.progress < 25 && goal.status === 'active',
    )
    if (stagnantGoals.length > 0) {
      nextSteps.push(
        `Address barriers for stagnant goals: ${stagnantGoals.map((g) => g.title).join(', ')}`,
      )
    }

    return nextSteps
  }
}
