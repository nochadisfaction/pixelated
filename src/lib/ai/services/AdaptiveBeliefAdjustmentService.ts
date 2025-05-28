/**
 * Adaptive Belief Adjustment Service
 *
 * Handles dynamic belief modification, therapeutic progress tracking,
 * and belief reinforcement/challenging detection in Patient-Psi simulations
 */

import { z } from 'zod'
import type { CognitiveModel, CoreBelief } from '../types/CognitiveModel'

// Belief adjustment schemas
const BeliefAdjustmentEventSchema = z.object({
  beliefId: z.string(),
  originalStrength: z.number().min(1).max(10),
  newStrength: z.number().min(1).max(10),
  adjustmentType: z.enum([
    'reinforcement',
    'challenge',
    'evidence_counter',
    'reframe',
    'gradual_erosion',
  ]),
  trigger: z.object({
    type: z.enum([
      'therapist_intervention',
      'patient_insight',
      'external_evidence',
      'behavioral_experiment',
    ]),
    intervention: z.string(),
    context: z.string(),
    effectiveness: z.number().min(0).max(1),
  }),
  timestamp: z.string(),
  sessionId: z.string(),
  therapeuticTechnique: z.string(),
  patientResistance: z.number().min(0).max(10),
  cognitiveReadiness: z.number().min(0).max(10),
})

const _BeliefEvolutionTrackingSchema = z.object({
  beliefId: z.string(),
  beliefText: z.string(),
  strengthHistory: z.array(
    z.object({
      strength: z.number(),
      timestamp: z.string(),
      context: z.string(),
      trigger: z.string(),
    }),
  ),
  changeVelocity: z.number(), // Rate of change per session
  resistance: z.number().min(0).max(10), // How resistant to change
  malleability: z.number().min(0).max(1), // How easily it changes
  coreDepth: z.enum(['surface', 'intermediate', 'core']),
  evidenceWeight: z.number().min(0).max(1), // How much evidence supports it
  reinforcementHistory: z.array(
    z.object({
      event: z.string(),
      impact: z.number().min(-1).max(1),
      timestamp: z.string(),
    }),
  ),
})

const _TherapeuticInterventionSchema = z.object({
  type: z.enum([
    'socratic_questioning',
    'cognitive_restructuring',
    'behavioral_experiment',
    'mindfulness_observation',
    'validation_then_challenge',
    'metaphor_reframe',
    'cost_benefit_analysis',
    'evidence_examination',
  ]),
  targetBeliefs: z.array(z.string()),
  technique: z.string(),
  expectedImpact: z.number().min(-1).max(1),
  patientReadiness: z.number().min(0).max(10),
  interventionText: z.string(),
  followUpQuestions: z.array(z.string()),
  successIndicators: z.array(z.string()),
  resistanceCounters: z.array(z.string()),
})

const BeliefChallengeResponseSchema = z.object({
  challengeType: z.enum([
    'direct',
    'indirect',
    'socratic',
    'experiential',
    'collaborative',
  ]),
  beliefStrength: z.number().min(1).max(10),
  patientResponse: z.enum([
    'acceptance',
    'resistance',
    'curiosity',
    'dismissal',
    'defensive',
  ]),
  emotionalReaction: z.object({
    primaryEmotion: z.string(),
    intensity: z.number().min(1).max(10),
    duration: z.enum(['brief', 'moderate', 'extended', 'persistent']),
    physicalManifestations: z.array(z.string()),
  }),
  cognitiveResponse: z.object({
    insight: z.number().min(0).max(10),
    curiosity: z.number().min(0).max(10),
    defensiveness: z.number().min(0).max(10),
    flexibilityShown: z.boolean(),
  }),
  adjustmentRecommendation: z.object({
    shouldContinue: z.boolean(),
    adjustmentStrategy: z.string(),
    nextSteps: z.array(z.string()),
    timeframe: z.string(),
  }),
})

export type BeliefAdjustmentEvent = z.infer<typeof BeliefAdjustmentEventSchema>
export type BeliefEvolutionTracking = z.infer<
  typeof _BeliefEvolutionTrackingSchema
>
export type TherapeuticIntervention = z.infer<
  typeof _TherapeuticInterventionSchema
>
export type BeliefChallengeResponse = z.infer<
  typeof BeliefChallengeResponseSchema
>

export interface BeliefChangeReport {
  belief: string
  strengthChange: number
  changeVelocity: number
  milestones: string[]
}

export interface SessionContext {
  sessionId: string
  sessionNumber: number
  therapeuticAlliance: number
  patientInsight: number
}

export interface InterventionAnalysis {
  type: string
  intensity: number
  approach: string
  targetedBeliefs: string[]
}

export interface BeliefAdjustmentOptions {
  maxAdjustmentPerSession: number
  reinforcementSensitivity: number
  challengeIntensity: 'gentle' | 'moderate' | 'direct'
  respectPatientPace: boolean
  trackMicroChanges: boolean
  requireMultipleConfirmations: boolean
}

/**
 * Adaptive Belief Adjustment Service
 */
export class AdaptiveBeliefAdjustmentService {
  private beliefTracker: Map<string, BeliefEvolutionTracking> = new Map()
  private adjustmentHistory: Map<string, BeliefAdjustmentEvent[]> = new Map()
  private interventionLibrary: Map<string, TherapeuticIntervention[]> =
    new Map()

  constructor() {
    this.initializeInterventionLibrary()
  }

  /**
   * Process a therapeutic intervention and adjust beliefs accordingly
   */
  async processIntervention(
    intervention: string,
    targetBeliefs: string[],
    cognitiveModel: CognitiveModel,
    sessionContext: SessionContext,
    options: BeliefAdjustmentOptions = {
      maxAdjustmentPerSession: 0.5,
      reinforcementSensitivity: 0.7,
      challengeIntensity: 'moderate',
      respectPatientPace: true,
      trackMicroChanges: true,
      requireMultipleConfirmations: false,
    },
  ): Promise<{
    adjustments: BeliefAdjustmentEvent[]
    updatedModel: CognitiveModel
    therapeuticResponse: BeliefChallengeResponse
    recommendations: string[]
  }> {
    try {
      const adjustments: BeliefAdjustmentEvent[] = []
      const updatedBeliefs = [...cognitiveModel.coreBeliefs]

      // Analyze intervention type and approach
      const interventionAnalysis = this.analyzeIntervention(intervention)

      // Process each target belief
      for (const beliefTarget of targetBeliefs) {
        const belief = cognitiveModel.coreBeliefs.find(
          (b) =>
            b.belief.toLowerCase().includes(beliefTarget.toLowerCase()) ||
            b.relatedDomains.some((domain) =>
              domain.toLowerCase().includes(beliefTarget.toLowerCase()),
            ),
        )

        if (!belief) {
          continue
        }

        // Get or create belief tracking
        const beliefTracker = this.getOrCreateBeliefTracker(
          belief,
          cognitiveModel.id,
        )

        // Determine adjustment type and magnitude
        const adjustmentType = this.determineAdjustmentType(
          intervention,
          belief,
          interventionAnalysis,
        )
        const adjustmentMagnitude = this.calculateAdjustmentMagnitude(
          adjustmentType,
          belief,
          beliefTracker,
          sessionContext,
          options,
        )

        // Apply belief adjustment
        if (Math.abs(adjustmentMagnitude) > 0.1) {
          // Only apply significant changes
          const adjustment = await this.applyBeliefAdjustment(
            belief,
            adjustmentType,
            adjustmentMagnitude,
            intervention,
            sessionContext,
            interventionAnalysis,
          )

          adjustments.push(adjustment)

          // Update belief in model
          const beliefIndex = updatedBeliefs.findIndex(
            (b) => b.belief === belief.belief,
          )
          if (beliefIndex >= 0) {
            updatedBeliefs[beliefIndex] = {
              ...belief,
              strength: Math.max(1, Math.min(10, adjustment.newStrength)),
            }
          }

          // Update tracking
          this.updateBeliefTracking(beliefTracker, adjustment)
        }
      }

      // Generate therapeutic response
      const therapeuticResponse = this.generateTherapeuticResponse(
        intervention,
        adjustments,
        cognitiveModel,
        sessionContext,
      )

      // Generate recommendations for next steps
      const recommendations = this.generateRecommendations(
        adjustments,
        therapeuticResponse,
        sessionContext,
      )

      const updatedModel: CognitiveModel = {
        ...cognitiveModel,
        coreBeliefs: updatedBeliefs,
      }

      return {
        adjustments,
        updatedModel,
        therapeuticResponse,
        recommendations,
      }
    } catch (error) {
      console.error('Error processing intervention:', error)
      throw new Error(
        `Failed to process intervention: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  /**
   * Detect belief challenging patterns in conversation
   */
  detectBeliefChallenge(
    patientMessage: string,
    therapistMessage: string,
    cognitiveModel: CognitiveModel,
  ): {
    challengeDetected: boolean
    targetBeliefs: string[]
    challengeType: string
    patientResistance: number
    suggestedResponse: string
  } {
    const challengePatterns = {
      socratic_questioning: [
        'what evidence',
        'how do you know',
        'what makes you think',
        'is it possible',
        'could it be',
        'what if',
        'have you considered',
      ],
      direct_challenge: [
        "that's not true",
        'actually',
        'but',
        'however',
        'i disagree',
        'the evidence shows',
        'research indicates',
      ],
      reframing: [
        'another way to look at',
        'different perspective',
        'alternatively',
        'what if we viewed',
        'could it mean',
        'might it be',
      ],
      evidence_examination: [
        'what evidence',
        'proof',
        'examples',
        'times when',
        'specific instances',
        'concrete evidence',
      ],
    }

    let challengeDetected = false
    let challengeType = 'none'
    const targetBeliefs: string[] = []

    // Check for challenge patterns
    for (const [type, patterns] of Object.entries(challengePatterns)) {
      if (
        patterns.some((pattern) =>
          therapistMessage.toLowerCase().includes(pattern),
        )
      ) {
        challengeDetected = true
        challengeType = type
        break
      }
    }

    // Identify which beliefs might be targeted
    if (challengeDetected) {
      for (const belief of cognitiveModel.coreBeliefs) {
        // Check if belief text or related domains are mentioned in the conversation
        if (
          patientMessage.toLowerCase().includes(belief.belief.toLowerCase()) ||
          therapistMessage
            .toLowerCase()
            .includes(belief.belief.toLowerCase()) ||
          belief.relatedDomains.some(
            (domain) =>
              patientMessage.toLowerCase().includes(domain.toLowerCase()) ||
              therapistMessage.toLowerCase().includes(domain.toLowerCase()),
          )
        ) {
          targetBeliefs.push(belief.belief)
        }
      }
    }

    // Assess patient resistance
    const resistanceIndicators = [
      "i don't think so",
      "that's not right",
      "you don't understand",
      'but',
      'however',
      'i disagree',
      'no',
      "that's wrong",
    ]

    const patientResistance = resistanceIndicators.reduce(
      (resistance, indicator) => {
        return patientMessage.toLowerCase().includes(indicator)
          ? resistance + 2
          : resistance
      },
      0,
    )

    // Generate suggested response
    const suggestedResponse = this.generateChallengeResponse(
      challengeType,
      targetBeliefs,
      patientResistance,
      cognitiveModel,
    )

    return {
      challengeDetected,
      targetBeliefs,
      challengeType,
      patientResistance: Math.min(10, patientResistance),
      suggestedResponse,
    }
  }

  /**
   * Track therapeutic progress over time
   */
  generateProgressReport(
    cognitiveModel: CognitiveModel,
    sessionRange: { start: string; end: string },
  ): {
    overallProgress: number
    beliefChanges: Array<{
      belief: string
      strengthChange: number
      changeVelocity: number
      milestones: string[]
    }>
    therapeuticMilestones: string[]
    resistancePatterns: string[]
    recommendations: string[]
    nextFocus: string[]
  } {
    const beliefChanges: BeliefChangeReport[] = []
    let totalProgressScore = 0

    // Analyze each tracked belief
    for (const [_beliefId, tracker] of Array.from(
      this.beliefTracker.entries(),
    )) {
      if (!tracker.strengthHistory.length) {
        continue
      }

      const relevantHistory = tracker.strengthHistory.filter(
        (h) =>
          h.timestamp >= sessionRange.start && h.timestamp <= sessionRange.end,
      )

      if (relevantHistory.length < 2) {
        continue
      }

      const initialStrength = relevantHistory[0].strength
      const finalStrength = relevantHistory[relevantHistory.length - 1].strength
      const strengthChange = finalStrength - initialStrength

      // Calculate progress (negative change in harmful beliefs is positive progress)
      const isHarmfulBelief = this.isHarmfulBelief(tracker.beliefText)
      const progressContribution = isHarmfulBelief
        ? -strengthChange
        : strengthChange
      totalProgressScore += progressContribution

      // Identify milestones
      const milestones: string[] = []
      if (Math.abs(strengthChange) >= 1) {
        milestones.push('Significant belief shift detected')
      }
      if (tracker.changeVelocity > 0.3) {
        milestones.push('Rapid positive change')
      }
      if (tracker.malleability > 0.7) {
        milestones.push('Increased cognitive flexibility')
      }

      beliefChanges.push({
        belief: tracker.beliefText,
        strengthChange,
        changeVelocity: tracker.changeVelocity,
        milestones,
      })
    }

    // Generate overall insights
    const overallProgress = Math.max(0, Math.min(10, totalProgressScore + 5))
    const therapeuticMilestones =
      this.identifyTherapeuticMilestones(beliefChanges)
    const resistancePatterns = this.identifyResistancePatterns()
    const recommendations = this.generateProgressBasedRecommendations(
      beliefChanges,
      overallProgress,
    )
    const nextFocus = this.identifyNextFocusAreas(beliefChanges, cognitiveModel)

    return {
      overallProgress,
      beliefChanges,
      therapeuticMilestones,
      resistancePatterns,
      recommendations,
      nextFocus,
    }
  }

  // Private helper methods
  private analyzeIntervention(intervention: string): InterventionAnalysis {
    const interventionTypes = {
      socratic: ['what do you think', 'how might', 'what if', 'could it be'],
      challenging: ['but', 'however', 'actually', 'evidence shows'],
      validating: ['understand', 'makes sense', 'i hear', 'that must be'],
      reframing: ['another way', 'different perspective', 'alternatively'],
    }

    let detectedType = 'neutral'
    let intensity = 5

    for (const [type, patterns] of Object.entries(interventionTypes)) {
      if (
        patterns.some((pattern) => intervention.toLowerCase().includes(pattern))
      ) {
        detectedType = type
        intensity = type === 'challenging' ? 8 : type === 'validating' ? 3 : 6
        break
      }
    }

    return {
      type: detectedType,
      intensity,
      approach: detectedType === 'challenging' ? 'direct' : 'collaborative',
      targetedBeliefs: [], // Would extract from context
    }
  }

  private determineAdjustmentType(
    intervention: string,
    belief: CoreBelief,
    analysis: InterventionAnalysis,
  ): BeliefAdjustmentEvent['adjustmentType'] {
    if (analysis.type === 'challenging') {
      return 'challenge'
    } else if (analysis.type === 'validating') {
      return 'reinforcement'
    } else if (intervention.toLowerCase().includes('evidence')) {
      return 'evidence_counter'
    } else if (
      intervention.toLowerCase().includes('reframe') ||
      analysis.type === 'reframing'
    ) {
      return 'reframe'
    }
    return 'gradual_erosion'
  }

  private calculateAdjustmentMagnitude(
    adjustmentType: BeliefAdjustmentEvent['adjustmentType'],
    belief: CoreBelief,
    tracker: BeliefEvolutionTracking,
    sessionContext: SessionContext,
    options: BeliefAdjustmentOptions,
  ): number {
    let baseMagnitude = 0

    switch (adjustmentType) {
      case 'challenge':
        baseMagnitude = -0.3 * (1 - tracker.resistance / 10)
        break
      case 'reinforcement':
        baseMagnitude = 0.2 * options.reinforcementSensitivity
        break
      case 'evidence_counter':
        baseMagnitude = -0.4 * (1 - tracker.evidenceWeight)
        break
      case 'reframe':
        baseMagnitude = -0.2 * tracker.malleability
        break
      case 'gradual_erosion':
        baseMagnitude = -0.1
        break
    }

    // Apply modifiers
    const allianceModifier = sessionContext.therapeuticAlliance / 10
    const insightModifier = sessionContext.patientInsight / 10
    const strengthModifier = belief.strength > 7 ? 0.5 : 1 // Stronger beliefs are harder to change

    let finalMagnitude =
      baseMagnitude * allianceModifier * insightModifier * strengthModifier

    // Respect session limits
    finalMagnitude = Math.max(
      -options.maxAdjustmentPerSession,
      Math.min(options.maxAdjustmentPerSession, finalMagnitude),
    )

    return finalMagnitude
  }

  private async applyBeliefAdjustment(
    belief: CoreBelief,
    adjustmentType: BeliefAdjustmentEvent['adjustmentType'],
    magnitude: number,
    intervention: string,
    sessionContext: SessionContext,
    analysis: InterventionAnalysis,
  ): Promise<BeliefAdjustmentEvent> {
    const newStrength = Math.max(1, Math.min(10, belief.strength + magnitude))

    const adjustment: BeliefAdjustmentEvent = {
      beliefId: `${belief.belief.slice(0, 20)}-${Date.now()}`,
      originalStrength: belief.strength,
      newStrength,
      adjustmentType,
      trigger: {
        type: 'therapist_intervention',
        intervention,
        context: `Session ${sessionContext.sessionNumber}`,
        effectiveness: Math.abs(magnitude) / 0.5, // Normalized effectiveness
      },
      timestamp: new Date().toISOString(),
      sessionId: sessionContext.sessionId,
      therapeuticTechnique: analysis.type,
      patientResistance: Math.max(0, 10 - sessionContext.therapeuticAlliance),
      cognitiveReadiness: sessionContext.patientInsight,
    }

    // Store adjustment history
    const modelAdjustments = this.adjustmentHistory.get(belief.belief) || []
    modelAdjustments.push(adjustment)
    this.adjustmentHistory.set(belief.belief, modelAdjustments)

    return BeliefAdjustmentEventSchema.parse(adjustment)
  }

  private getOrCreateBeliefTracker(
    belief: CoreBelief,
    modelId: string,
  ): BeliefEvolutionTracking {
    const trackerId = `${modelId}-${belief.belief}`

    if (!this.beliefTracker.has(trackerId)) {
      const tracker: BeliefEvolutionTracking = {
        beliefId: trackerId,
        beliefText: belief.belief,
        strengthHistory: [
          {
            strength: belief.strength,
            timestamp: new Date().toISOString(),
            context: 'Initial assessment',
            trigger: 'baseline',
          },
        ],
        changeVelocity: 0,
        resistance: belief.strength > 7 ? 8 : 5, // Stronger beliefs are more resistant
        malleability: belief.strength < 4 ? 0.8 : 0.4, // Weaker beliefs are more malleable
        coreDepth:
          belief.strength > 8
            ? 'core'
            : belief.strength > 5
              ? 'intermediate'
              : 'surface',
        evidenceWeight: belief.evidence.length / 10, // More evidence = stronger
        reinforcementHistory: [],
      }

      this.beliefTracker.set(trackerId, tracker)
    }

    return this.beliefTracker.get(trackerId)!
  }

  private updateBeliefTracking(
    tracker: BeliefEvolutionTracking,
    adjustment: BeliefAdjustmentEvent,
  ): void {
    // Add to strength history
    tracker.strengthHistory.push({
      strength: adjustment.newStrength,
      timestamp: adjustment.timestamp,
      context: adjustment.trigger.context,
      trigger: adjustment.therapeuticTechnique,
    })

    // Calculate change velocity
    if (tracker.strengthHistory.length >= 2) {
      const recent = tracker.strengthHistory.slice(-2)
      tracker.changeVelocity = recent[1].strength - recent[0].strength
    }

    // Update malleability based on how much it changed
    const changeAmount = Math.abs(
      adjustment.newStrength - adjustment.originalStrength,
    )
    tracker.malleability = Math.min(
      1,
      tracker.malleability + changeAmount * 0.1,
    )

    // Update resistance based on how much it resisted change
    if (changeAmount < 0.2) {
      tracker.resistance = Math.min(10, tracker.resistance + 0.5)
    } else {
      tracker.resistance = Math.max(0, tracker.resistance - 0.3)
    }
  }

  private generateTherapeuticResponse(
    intervention: string,
    adjustments: BeliefAdjustmentEvent[],
    _model: CognitiveModel,
    _sessionContext: SessionContext,
  ): BeliefChallengeResponse {
    // Simplified implementation - would be more sophisticated in practice
    const primaryAdjustment = adjustments[0]

    if (!primaryAdjustment) {
      return BeliefChallengeResponseSchema.parse({
        challengeType: 'indirect',
        beliefStrength: 5,
        patientResponse: 'acceptance',
        emotionalReaction: {
          primaryEmotion: 'neutral',
          intensity: 3,
          duration: 'brief',
          physicalManifestations: [],
        },
        cognitiveResponse: {
          insight: 5,
          curiosity: 5,
          defensiveness: 3,
          flexibilityShown: false,
        },
        adjustmentRecommendation: {
          shouldContinue: true,
          adjustmentStrategy: 'Continue current approach',
          nextSteps: ['Monitor progress'],
          timeframe: 'next session',
        },
      })
    }

    const patientResponse =
      primaryAdjustment.patientResistance > 7
        ? 'resistance'
        : primaryAdjustment.patientResistance > 4
          ? 'defensive'
          : 'acceptance'

    return BeliefChallengeResponseSchema.parse({
      challengeType:
        primaryAdjustment.adjustmentType === 'challenge'
          ? 'direct'
          : 'indirect',
      beliefStrength: primaryAdjustment.newStrength,
      patientResponse,
      emotionalReaction: {
        primaryEmotion:
          patientResponse === 'resistance' ? 'anger' : 'curiosity',
        intensity: primaryAdjustment.patientResistance > 7 ? 8 : 4,
        duration: 'moderate',
        physicalManifestations:
          patientResponse === 'resistance' ? ['tension', 'frowning'] : [],
      },
      cognitiveResponse: {
        insight: primaryAdjustment.cognitiveReadiness,
        curiosity: Math.max(0, 10 - primaryAdjustment.patientResistance),
        defensiveness: primaryAdjustment.patientResistance,
        flexibilityShown:
          Math.abs(
            primaryAdjustment.newStrength - primaryAdjustment.originalStrength,
          ) > 0.3,
      },
      adjustmentRecommendation: {
        shouldContinue: primaryAdjustment.patientResistance < 8,
        adjustmentStrategy:
          primaryAdjustment.patientResistance > 7
            ? 'Back off and validate'
            : 'Continue exploring',
        nextSteps: this.generateNextSteps(primaryAdjustment, patientResponse),
        timeframe: 'this session',
      },
    })
  }

  private generateRecommendations(
    adjustments: BeliefAdjustmentEvent[],
    response: BeliefChallengeResponse,
    _sessionContext: SessionContext,
  ): string[] {
    const recommendations: string[] = []

    if (adjustments.length === 0) {
      recommendations.push('Consider more direct intervention approaches')
    }

    if (response.cognitiveResponse.defensiveness > 7) {
      recommendations.push(
        'Focus on validation and building therapeutic alliance',
      )
      recommendations.push('Reduce challenge intensity for next interventions')
    }

    if (response.cognitiveResponse.insight > 7) {
      recommendations.push(
        'Patient showing good insight - consider deeper exploration',
      )
      recommendations.push('Build on this momentum with follow-up questions')
    }

    if (response.emotionalReaction.intensity > 7) {
      recommendations.push(
        'High emotional activation - consider processing emotions first',
      )
    }

    return recommendations
  }

  // Additional helper methods (simplified implementations)
  private generateChallengeResponse(
    type: string,
    beliefs: string[],
    resistance: number,
    _model: CognitiveModel,
  ): string {
    if (resistance > 7) {
      return 'I can see this is really important to you. Help me understand your perspective better.'
    }
    return "That's an interesting way to look at it. What experiences have shaped this view?"
  }

  private generateNextSteps(
    adjustment: BeliefAdjustmentEvent,
    response: string,
  ): string[] {
    if (response === 'resistance') {
      return [
        'Validate patient perspective',
        'Explore underlying fears',
        'Build safety',
      ]
    }
    return [
      'Continue exploring',
      'Ask for specific examples',
      'Monitor emotional reaction',
    ]
  }

  private isHarmfulBelief(beliefText: string): boolean {
    const harmfulPatterns = [
      'worthless',
      'failure',
      'hopeless',
      'dangerous',
      'reject',
      'abandon',
    ]
    return harmfulPatterns.some((pattern) =>
      beliefText.toLowerCase().includes(pattern),
    )
  }

  private identifyTherapeuticMilestones(
    beliefChanges: BeliefChangeReport[],
  ): string[] {
    const milestones: string[] = []

    if (beliefChanges.some((bc) => bc.strengthChange < -1)) {
      milestones.push('Significant reduction in harmful beliefs')
    }

    if (beliefChanges.filter((bc) => bc.changeVelocity > 0.2).length >= 2) {
      milestones.push('Multiple beliefs showing positive change')
    }

    return milestones
  }

  private identifyResistancePatterns(): string[] {
    // Analyze adjustment history for resistance patterns
    return [
      'Defensive when discussing core beliefs',
      'Open to surface-level changes',
    ]
  }

  private generateProgressBasedRecommendations(
    beliefChanges: BeliefChangeReport[],
    progress: number,
  ): string[] {
    const recommendations: string[] = []

    if (progress < 4) {
      recommendations.push('Consider adjusting therapeutic approach')
      recommendations.push('Focus on building therapeutic alliance')
    } else if (progress > 7) {
      recommendations.push('Continue current effective approach')
      recommendations.push('Consider deeper exploration')
    }

    return recommendations
  }

  private identifyNextFocusAreas(
    beliefChanges: BeliefChangeReport[],
    model: CognitiveModel,
  ): string[] {
    // Identify beliefs that haven't changed much or need attention
    return model.coreBeliefs
      .filter((belief) => belief.strength > 7)
      .map((belief) => belief.relatedDomains[0])
      .slice(0, 3)
  }

  private initializeInterventionLibrary(): void {
    // Initialize library of therapeutic interventions
    console.log('Adaptive Belief Adjustment Service initialized')
  }
}

/**
 * Create and export service instance
 */
export const adaptiveBeliefAdjustment = new AdaptiveBeliefAdjustmentService()

/**
 * Utility function for quick belief adjustment
 */
export async function adjustBeliefFromIntervention(
  intervention: string,
  targetBeliefs: string[],
  cognitiveModel: CognitiveModel,
  sessionId: string,
) {
  return adaptiveBeliefAdjustment.processIntervention(
    intervention,
    targetBeliefs,
    cognitiveModel,
    {
      sessionId,
      sessionNumber: 1,
      therapeuticAlliance: 6,
      patientInsight: 5,
    },
  )
}
