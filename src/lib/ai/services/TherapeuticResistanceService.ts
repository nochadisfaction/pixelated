/**
 * Therapeutic Resistance Service
 *
 * Implements advanced therapy resistance patterns, sophisticated defensive mechanisms,
 * and complex deflection/avoidance behaviors for realistic patient simulation.
 * Based on established psychodynamic and cognitive-behavioral therapy literature.
 */

import { z } from 'zod'
import type { CognitiveModel } from '../types/CognitiveModel'

// Resistance pattern schemas
const ResistancePatternSchema = z.object({
  type: z.enum([
    'intellectual_resistance',
    'emotional_resistance',
    'behavioral_resistance',
    'transference_resistance',
    'character_resistance',
    'situational_resistance',
  ]),
  intensity: z.number().min(1).max(10),
  triggers: z.array(z.string()),
  manifestations: z.array(z.string()),
  therapeuticResponse: z.string(),
  typicalDuration: z.enum([
    'momentary',
    'session',
    'multi-session',
    'persistent',
  ]),
  frequency: z.enum(['rare', 'occasional', 'frequent', 'chronic']),
})

const DefensiveMechanismSchema = z.object({
  mechanism: z.enum([
    'denial',
    'projection',
    'rationalization',
    'intellectualization',
    'displacement',
    'reaction_formation',
    'sublimation',
    'repression',
    'regression',
    'isolation',
    'undoing',
    'splitting',
    'idealization',
    'devaluation',
    'omnipotence',
    'primitive_denial',
    'projective_identification',
  ]),
  maturityLevel: z.enum(['psychotic', 'immature', 'neurotic', 'mature']),
  adaptiveness: z.number().min(0).max(1),
  contextualEffectiveness: z.number().min(0).max(1),
  typicalTriggers: z.array(z.string()),
  recognitionDifficulty: z.enum(['obvious', 'moderate', 'subtle', 'hidden']),
  therapeuticImplications: z.array(z.string()),
})

const DeflectionBehaviorSchema = z.object({
  behavior: z.enum([
    'topic_switching',
    'humor_deflection',
    'intellectualization',
    'storytelling',
    'question_deflection',
    'somatic_complaints',
    'crisis_creation',
    'therapy_process_focus',
    'therapist_focus',
    'external_blame',
    'time_management',
    'compliance_performance',
  ]),
  sophistication: z.enum(['obvious', 'moderate', 'subtle', 'masterful']),
  effectiveness: z.number().min(0).max(1),
  detectability: z.number().min(0).max(1), // 0 = easily detected, 1 = very subtle
  therapeuticChallenge: z.enum(['low', 'moderate', 'high', 'extreme']),
})

const AvoidanceBehaviorSchema = z.object({
  avoidanceType: z.enum([
    'emotional_avoidance',
    'cognitive_avoidance',
    'behavioral_avoidance',
    'interpersonal_avoidance',
    'existential_avoidance',
    'somatic_avoidance',
    'temporal_avoidance',
    'therapeutic_process_avoidance',
  ]),
  content: z.string(),
  triggers: z.array(z.string()),
  manifestation: z.string(),
  intensity: z.number().min(1).max(10),
  persistence: z.enum(['momentary', 'episodic', 'chronic', 'pervasive']),
  therapeuticImpact: z.enum(['minimal', 'moderate', 'significant', 'severe']),
})

const ResistanceResponseSchema = z.object({
  resistancePattern: ResistancePatternSchema,
  defensiveMechanisms: z.array(DefensiveMechanismSchema),
  deflectionBehaviors: z.array(DeflectionBehaviorSchema),
  avoidanceBehaviors: z.array(AvoidanceBehaviorSchema),
  generatedResponse: z.string(),
  nonverbalIndicators: z.object({
    bodyLanguage: z.string(),
    facialExpression: z.string(),
    voiceTone: z.string(),
    eyeContact: z.boolean(),
    posturalChanges: z.string(),
  }),
  therapeuticRecommendations: z.array(z.string()),
  interventionOpportunities: z.array(z.string()),
  riskAssessment: z.object({
    therapeuticRuptureRisk: z.number().min(0).max(1),
    treatmentDropoutRisk: z.number().min(0).max(1),
    escalationPotential: z.number().min(0).max(1),
  }),
})

export type ResistancePattern = z.infer<typeof ResistancePatternSchema>
export type DefensiveMechanism = z.infer<typeof DefensiveMechanismSchema>
export type DeflectionBehavior = z.infer<typeof DeflectionBehaviorSchema>
export type AvoidanceBehavior = z.infer<typeof AvoidanceBehaviorSchema>
export type ResistanceResponse = z.infer<typeof ResistanceResponseSchema>

export interface ResistanceContext {
  therapeuticIntervention: string
  sessionNumber: number
  therapeuticAlliance: number // 1-10 scale
  previousResistanceLevel: number // 1-10 scale
  recentTherapeuticEvents: string[]
  conversationHistory: Array<{
    role: 'therapist' | 'patient'
    content: string
    timestamp?: string
  }>
  currentStressLevel: number // 1-10 scale
  therapeuticApproach: string // e.g., 'CBT', 'psychodynamic', 'humanistic'
}

/**
 * Advanced Therapeutic Resistance Service
 */
export class TherapeuticResistanceService {
  private resistancePatterns: Map<string, ResistancePattern> = new Map()
  private defensiveMechanisms: Map<string, DefensiveMechanism> = new Map()
  private deflectionBehaviors: Map<string, DeflectionBehavior> = new Map()
  private avoidanceBehaviors: Map<string, AvoidanceBehavior> = new Map()
  private resistanceHistory: Map<string, Array<ResistanceResponse>> = new Map()

  constructor() {
    this.initializeResistancePatterns()
    this.initializeDefensiveMechanisms()
    this.initializeDeflectionBehaviors()
    this.initializeAvoidanceBehaviors()
  }

  /**
   * Generate advanced resistance response based on therapeutic context
   */
  async generateResistanceResponse(
    cognitiveModel: CognitiveModel,
    context: ResistanceContext,
  ): Promise<ResistanceResponse> {
    try {
      // Analyze resistance triggers
      const resistanceTriggers = this.analyzeResistanceTriggers(
        context.therapeuticIntervention,
        cognitiveModel,
        context,
      )

      // Select primary resistance pattern
      const primaryResistancePattern = this.selectResistancePattern(
        resistanceTriggers,
        cognitiveModel,
        context,
      )

      // Identify active defensive mechanisms
      const activeDefensiveMechanisms = this.identifyDefensiveMechanisms(
        primaryResistancePattern,
        cognitiveModel,
        context,
      )

      // Select deflection behaviors
      const deflectionBehaviors = this.selectDeflectionBehaviors(
        primaryResistancePattern,
        cognitiveModel,
        context,
      )

      // Identify avoidance behaviors
      const avoidanceBehaviors = this.identifyAvoidanceBehaviors(
        primaryResistancePattern,
        cognitiveModel,
        context,
      )

      // Generate authentic patient response
      const generatedResponse = this.generateAuthenticResponse(
        primaryResistancePattern,
        activeDefensiveMechanisms,
        deflectionBehaviors,
        avoidanceBehaviors,
        cognitiveModel,
        context,
      )

      // Generate nonverbal indicators
      const nonverbalIndicators = this.generateNonverbalIndicators(
        primaryResistancePattern,
        activeDefensiveMechanisms,
        cognitiveModel,
      )

      // Generate therapeutic recommendations
      const therapeuticRecommendations =
        this.generateTherapeuticRecommendations(
          primaryResistancePattern,
          activeDefensiveMechanisms,
          context,
        )

      // Identify intervention opportunities
      const interventionOpportunities = this.identifyInterventionOpportunities(
        primaryResistancePattern,
        activeDefensiveMechanisms,
        context,
      )

      // Assess risks
      const riskAssessment = this.assessRisks(
        primaryResistancePattern,
        activeDefensiveMechanisms,
        cognitiveModel,
        context,
      )

      const response = ResistanceResponseSchema.parse({
        resistancePattern: primaryResistancePattern,
        defensiveMechanisms: activeDefensiveMechanisms,
        deflectionBehaviors,
        avoidanceBehaviors,
        generatedResponse,
        nonverbalIndicators,
        therapeuticRecommendations,
        interventionOpportunities,
        riskAssessment,
      })

      // Store in history for pattern tracking
      this.storeResistanceHistory(cognitiveModel.id, response)

      return response
    } catch (error) {
      console.error('Error generating resistance response:', error)
      throw new Error(
        `Failed to generate resistance response: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  /**
   * Analyze what triggers resistance in current context
   */
  private analyzeResistanceTriggers(
    intervention: string,
    cognitiveModel: CognitiveModel,
    context: ResistanceContext,
  ): string[] {
    const triggers: string[] = []

    // Cognitive triggers - core belief challenges
    const interventionLower = intervention.toLowerCase()
    for (const belief of cognitiveModel.coreBeliefs) {
      if (
        belief.relatedDomains.some((domain) =>
          interventionLower.includes(domain.toLowerCase()),
        )
      ) {
        triggers.push(`core_belief_challenge:${belief.belief}`)
      }
    }

    // Emotional triggers - high intensity emotions
    for (const emotion of cognitiveModel.emotionalPatterns) {
      if (
        emotion.intensity > 7 &&
        emotion.triggers.some((trigger) =>
          interventionLower.includes(trigger.toLowerCase()),
        )
      ) {
        triggers.push(`emotional_trigger:${emotion.emotion}`)
      }
    }

    // Therapeutic approach triggers
    if (
      context.therapeuticApproach === 'psychodynamic' &&
      cognitiveModel.conversationalStyle.resistance > 6
    ) {
      triggers.push('interpretive_intervention')
    }

    // Alliance-based triggers
    if (context.therapeuticAlliance < 5) {
      triggers.push('poor_alliance')
    }

    // Historical triggers - previous negative therapy experiences
    const negativeHistory = cognitiveModel.therapyHistory.unhelpfulInterventions
    if (
      negativeHistory.some((intervention) =>
        interventionLower.includes(intervention.toLowerCase()),
      )
    ) {
      triggers.push('negative_therapy_history')
    }

    // Timing triggers - early in therapy
    if (context.sessionNumber < 5) {
      triggers.push('early_therapy_stage')
    }

    // Stress-based triggers
    if (context.currentStressLevel > 7) {
      triggers.push('high_stress_state')
    }

    return triggers
  }

  /**
   * Select appropriate resistance pattern based on triggers and patient profile
   */
  private selectResistancePattern(
    triggers: string[],
    cognitiveModel: CognitiveModel,
    context: ResistanceContext,
  ): ResistancePattern {
    const candidatePatterns: Array<{
      pattern: ResistancePattern
      score: number
    }> = []

    for (const pattern of this.resistancePatterns.values()) {
      let score = 0

      // Match triggers
      const triggerMatches = pattern.triggers.filter((trigger) =>
        triggers.some((t) => t.includes(trigger)),
      ).length
      score += triggerMatches * 3

      // Match personality factors
      if (
        pattern.type === 'intellectual_resistance' &&
        cognitiveModel.conversationalStyle.insightLevel > 7
      ) {
        score += 2
      }

      if (
        pattern.type === 'emotional_resistance' &&
        cognitiveModel.emotionalPatterns.some((e) => e.intensity > 8)
      ) {
        score += 2
      }

      if (
        pattern.type === 'character_resistance' &&
        cognitiveModel.conversationalStyle.resistance > 8
      ) {
        score += 3
      }

      // Match therapeutic context
      if (
        pattern.type === 'transference_resistance' &&
        context.therapeuticApproach === 'psychodynamic'
      ) {
        score += 2
      }

      if (
        pattern.type === 'situational_resistance' &&
        context.currentStressLevel > 7
      ) {
        score += 2
      }

      // Consider frequency and duration
      if (
        pattern.frequency === 'chronic' &&
        cognitiveModel.therapeuticProgress.resistanceLevel > 7
      ) {
        score += 1
      }

      candidatePatterns.push({ pattern, score })
    }

    // Sort by score and select highest
    candidatePatterns.sort((a, b) => b.score - a.score)

    return candidatePatterns.length > 0
      ? candidatePatterns[0].pattern
      : this.getDefaultResistancePattern()
  }

  /**
   * Identify active defensive mechanisms
   */
  private identifyDefensiveMechanisms(
    resistancePattern: ResistancePattern,
    cognitiveModel: CognitiveModel,
    context: ResistanceContext,
  ): DefensiveMechanism[] {
    const activeMechanisms: DefensiveMechanism[] = []

    // Select mechanisms based on resistance type and patient characteristics
    switch (resistancePattern.type) {
      case 'intellectual_resistance':
        activeMechanisms.push(
          this.defensiveMechanisms.get('intellectualization')!,
          this.defensiveMechanisms.get('rationalization')!,
        )
        break

      case 'emotional_resistance':
        activeMechanisms.push(
          this.defensiveMechanisms.get('isolation')!,
          this.defensiveMechanisms.get('denial')!,
        )
        break

      case 'character_resistance':
        activeMechanisms.push(
          this.defensiveMechanisms.get('projection')!,
          this.defensiveMechanisms.get('devaluation')!,
        )
        break

      case 'transference_resistance':
        activeMechanisms.push(
          this.defensiveMechanisms.get('projective_identification')!,
          this.defensiveMechanisms.get('splitting')!,
        )
        break

      default:
        activeMechanisms.push(
          this.defensiveMechanisms.get('denial')!,
          this.defensiveMechanisms.get('rationalization')!,
        )
    }

    // Add context-specific mechanisms
    if (context.therapeuticAlliance < 4) {
      activeMechanisms.push(this.defensiveMechanisms.get('devaluation')!)
    }

    if (context.currentStressLevel > 8) {
      activeMechanisms.push(this.defensiveMechanisms.get('regression')!)
    }

    // Filter for patient-specific factors
    const patientSpecificMechanisms = activeMechanisms.filter((mechanism) => {
      if (
        mechanism.maturityLevel === 'psychotic' &&
        cognitiveModel.diagnosisInfo.severity !== 'severe'
      ) {
        return false
      }
      return true
    })

    return patientSpecificMechanisms.slice(0, 3) // Limit to 3 primary mechanisms
  }

  /**
   * Select deflection behaviors based on resistance pattern
   */
  private selectDeflectionBehaviors(
    resistancePattern: ResistancePattern,
    cognitiveModel: CognitiveModel,
    _context: ResistanceContext,
  ): DeflectionBehavior[] {
    const behaviors: DeflectionBehavior[] = []

    // Base selection on resistance type
    switch (resistancePattern.type) {
      case 'intellectual_resistance':
        behaviors.push(
          this.deflectionBehaviors.get('intellectualization')!,
          this.deflectionBehaviors.get('question_deflection')!,
        )
        break

      case 'emotional_resistance':
        behaviors.push(
          this.deflectionBehaviors.get('topic_switching')!,
          this.deflectionBehaviors.get('somatic_complaints')!,
        )
        break

      case 'behavioral_resistance':
        behaviors.push(
          this.deflectionBehaviors.get('compliance_performance')!,
          this.deflectionBehaviors.get('time_management')!,
        )
        break

      default:
        behaviors.push(
          this.deflectionBehaviors.get('humor_deflection')!,
          this.deflectionBehaviors.get('external_blame')!,
        )
    }

    // Add personality-based behaviors
    if (cognitiveModel.conversationalStyle.verbosity > 7) {
      behaviors.push(this.deflectionBehaviors.get('storytelling')!)
    }

    return behaviors.slice(0, 2) // Limit to 2 primary behaviors
  }

  /**
   * Identify avoidance behaviors
   */
  private identifyAvoidanceBehaviors(
    resistancePattern: ResistancePattern,
    cognitiveModel: CognitiveModel,
    context: ResistanceContext,
  ): AvoidanceBehavior[] {
    const avoidanceBehaviors: AvoidanceBehavior[] = []

    // Select based on emotional patterns and core beliefs
    for (const emotion of cognitiveModel.emotionalPatterns) {
      if (emotion.intensity > 7) {
        const emotionalAvoidance = this.avoidanceBehaviors.get(
          'emotional_avoidance',
        )
        if (emotionalAvoidance) {
          avoidanceBehaviors.push({
            ...emotionalAvoidance,
            content: `avoiding ${emotion.emotion}`,
            triggers: emotion.triggers,
            manifestation: `deflects when ${emotion.emotion} is discussed`,
          })
        }
      }
    }

    // Add cognitive avoidance for strong beliefs
    for (const belief of cognitiveModel.coreBeliefs) {
      if (belief.strength > 8) {
        const cognitiveAvoidance = this.avoidanceBehaviors.get(
          'cognitive_avoidance',
        )
        if (cognitiveAvoidance) {
          avoidanceBehaviors.push({
            ...cognitiveAvoidance,
            content: `avoiding examination of: ${belief.belief}`,
            triggers: belief.relatedDomains,
            manifestation: `becomes vague when discussing ${belief.relatedDomains[0]}`,
          })
        }
      }
    }

    // Add therapeutic process avoidance if alliance is poor
    if (context.therapeuticAlliance < 5) {
      const processAvoidance = this.avoidanceBehaviors.get(
        'therapeutic_process_avoidance',
      )
      if (processAvoidance) {
        avoidanceBehaviors.push(processAvoidance)
      }
    }

    return avoidanceBehaviors.slice(0, 3) // Limit to 3 primary avoidance patterns
  }

  /**
   * Generate authentic patient response incorporating resistance patterns
   */
  private generateAuthenticResponse(
    resistancePattern: ResistancePattern,
    defensiveMechanisms: DefensiveMechanism[],
    deflectionBehaviors: DeflectionBehavior[],
    avoidanceBehaviors: AvoidanceBehavior[],
    cognitiveModel: CognitiveModel,
    _context: ResistanceContext,
  ): string {
    let response = ''

    // Start with resistance pattern manifestation
    const manifestation =
      resistancePattern.manifestations[
        Math.floor(Math.random() * resistancePattern.manifestations.length)
      ]

    // Layer in defensive mechanisms
    const primaryDefense = defensiveMechanisms[0]
    if (primaryDefense) {
      switch (primaryDefense.mechanism) {
        case 'denial':
          response = `I don't think that's really what's happening. ${manifestation}`
          break
        case 'projection':
          response = `The problem isn't with me, it's with them. ${manifestation}`
          break
        case 'rationalization':
          response = `There are logical reasons for this. ${manifestation}`
          break
        case 'intellectualization':
          response = `If we look at this objectively... ${manifestation}`
          break
        default:
          response = manifestation
      }
    }

    // Add deflection behaviors
    if (deflectionBehaviors.length > 0) {
      const primaryDeflection = deflectionBehaviors[0]
      switch (primaryDeflection.behavior) {
        case 'topic_switching':
          response +=
            ' Speaking of which, did I tell you about what happened last week?'
          break
        case 'humor_deflection':
          response += " *laughs* Well, that's just how life is, right?"
          break
        case 'question_deflection':
          response += ' But what do you think I should do about it?'
          break
        case 'somatic_complaints':
          response += " Actually, I've been having these headaches lately..."
          break
        case 'external_blame':
          response += ' If other people would just...'
          break
        case 'storytelling':
          response += ' That reminds me of this time when my friend...'
          break
        case 'time_management':
          response += " We're running out of time today, aren't we?"
          break
      }
    }

    // Add avoidance markers
    if (avoidanceBehaviors.length > 0) {
      const avoidanceMarkers = [
        " I'd rather not get into that.",
        " It's complicated.",
        " I'm not sure how to explain it.",
        ' Maybe we should talk about something else.',
      ]
      response +=
        avoidanceMarkers[Math.floor(Math.random() * avoidanceMarkers.length)]
    }

    // Adjust for patient characteristics
    if (cognitiveModel.conversationalStyle.verbosity < 4) {
      // Make response shorter for less verbose patients
      response = response.split('.')[0] + '.'
    }

    if (cognitiveModel.conversationalStyle.emotionalExpressiveness < 4) {
      // Remove emotional markers for less expressive patients
      response = response.replace(/\*.*?\*/g, '')
    }

    return response.trim()
  }

  /**
   * Generate nonverbal indicators for resistance
   */
  private generateNonverbalIndicators(
    resistancePattern: ResistancePattern,
    defensiveMechanisms: DefensiveMechanism[],
    cognitiveModel: CognitiveModel,
  ): {
    bodyLanguage: string
    facialExpression: string
    voiceTone: string
    eyeContact: boolean
    posturalChanges: string
  } {
    const indicators = {
      bodyLanguage: 'neutral',
      facialExpression: 'neutral',
      voiceTone: 'neutral',
      eyeContact: true,
      posturalChanges: 'none',
    }

    // Base indicators on resistance pattern
    switch (resistancePattern.type) {
      case 'intellectual_resistance':
        indicators.bodyLanguage = 'leaning back, arms crossed'
        indicators.facialExpression = 'slight frown, raised eyebrow'
        indicators.voiceTone = 'measured, controlled'
        indicators.eyeContact = true
        indicators.posturalChanges = 'more rigid posture'
        break

      case 'emotional_resistance':
        indicators.bodyLanguage = 'fidgeting, self-soothing gestures'
        indicators.facialExpression = 'tense, avoiding eye contact'
        indicators.voiceTone = 'strained, variable'
        indicators.eyeContact = false
        indicators.posturalChanges = 'closed body position'
        break

      case 'character_resistance':
        indicators.bodyLanguage = 'defensive posturing, challenging stance'
        indicators.facialExpression = 'skeptical, confrontational'
        indicators.voiceTone = 'sharp, defensive'
        indicators.eyeContact = false
        indicators.posturalChanges = 'more aggressive positioning'
        break

      case 'transference_resistance':
        indicators.bodyLanguage = 'variable, mimicking or contrasting'
        indicators.facialExpression = 'searching, testing'
        indicators.voiceTone = 'testing boundaries'
        indicators.eyeContact = true
        indicators.posturalChanges = 'positioning for reaction'
        break

      default:
        indicators.bodyLanguage = 'withdrawn, protective'
        indicators.facialExpression = 'guarded'
        indicators.voiceTone = 'hesitant'
        indicators.eyeContact = false
        indicators.posturalChanges = 'more closed posture'
    }

    // Modify based on primary defensive mechanism
    const primaryDefense = defensiveMechanisms[0]
    if (primaryDefense) {
      switch (primaryDefense.mechanism) {
        case 'projection':
          indicators.bodyLanguage = 'pointing gestures, accusatory'
          indicators.voiceTone = 'blaming, confrontational'
          break
        case 'intellectualization':
          indicators.bodyLanguage = 'formal, academic gestures'
          indicators.voiceTone = 'detached, clinical'
          break
        case 'regression':
          indicators.bodyLanguage = 'childlike posturing'
          indicators.facialExpression = 'younger, more vulnerable'
          indicators.voiceTone = 'higher pitch, less mature'
          break
      }
    }

    // Adjust for patient personality
    if (cognitiveModel.conversationalStyle.emotionalExpressiveness < 4) {
      indicators.facialExpression = 'minimal expression'
      indicators.bodyLanguage = 'restrained movement'
    }

    return indicators
  }

  /**
   * Generate therapeutic recommendations for managing resistance
   */
  private generateTherapeuticRecommendations(
    resistancePattern: ResistancePattern,
    defensiveMechanisms: DefensiveMechanism[],
    context: ResistanceContext,
  ): string[] {
    const recommendations: string[] = []

    // Base recommendations on resistance type
    switch (resistancePattern.type) {
      case 'intellectual_resistance':
        recommendations.push(
          "Validate the patient's analytical approach before gently exploring emotions",
        )
        recommendations.push(
          'Use socratic questioning to maintain intellectual engagement',
        )
        recommendations.push(
          'Acknowledge the value of their insights while exploring underlying feelings',
        )
        break

      case 'emotional_resistance':
        recommendations.push(
          'Slow down the pace and provide more emotional safety',
        )
        recommendations.push(
          'Use grounding techniques to manage emotional overwhelm',
        )
        recommendations.push(
          'Validate emotional experience before proceeding with exploration',
        )
        break

      case 'character_resistance':
        recommendations.push(
          'Avoid direct confrontation; use indirect approaches',
        )
        recommendations.push(
          'Focus on building therapeutic alliance before challenging patterns',
        )
        recommendations.push(
          'Use motivational interviewing techniques to reduce defensiveness',
        )
        break

      case 'transference_resistance':
        recommendations.push(
          'Explore the therapeutic relationship and transference patterns',
        )
        recommendations.push('Use the resistance as therapeutic material')
        recommendations.push(
          'Address ruptures in therapeutic alliance promptly',
        )
        break

      case 'behavioral_resistance':
        recommendations.push('Focus on small, achievable behavioral changes')
        recommendations.push('Explore ambivalence about change')
        recommendations.push('Use behavioral activation techniques')
        break

      default:
        recommendations.push(
          'Maintain empathic stance and avoid power struggles',
        )
        recommendations.push(
          "Explore the function of resistance in patient's life",
        )
    }

    // Add mechanism-specific recommendations
    const primaryDefense = defensiveMechanisms[0]
    if (primaryDefense) {
      switch (primaryDefense.mechanism) {
        case 'projection':
          recommendations.push(
            "Gently redirect focus back to patient's experience",
          )
          recommendations.push(
            'Avoid taking defensive stance; maintain therapeutic neutrality',
          )
          break
        case 'denial':
          recommendations.push(
            'Provide psychoeducation gradually and non-confrontationally',
          )
          recommendations.push(
            'Use motivational interviewing to explore ambivalence',
          )
          break
        case 'intellectualization':
          recommendations.push(
            'Bridge thinking and feeling by asking "How did that feel?"',
          )
          recommendations.push(
            'Use experiential techniques to connect with emotions',
          )
          break
      }
    }

    // Context-specific recommendations
    if (context.therapeuticAlliance < 5) {
      recommendations.push(
        'Prioritize relationship building over technique application',
      )
      recommendations.push('Use more validation and less interpretation')
    }

    if (context.sessionNumber < 5) {
      recommendations.push(
        'Normal early-therapy resistance; focus on engagement',
      )
      recommendations.push(
        "Explore patient's expectations and concerns about therapy",
      )
    }

    return recommendations.slice(0, 5) // Limit to 5 key recommendations
  }

  /**
   * Identify intervention opportunities
   */
  private identifyInterventionOpportunities(
    resistancePattern: ResistancePattern,
    defensiveMechanisms: DefensiveMechanism[],
    context: ResistanceContext,
  ): string[] {
    const opportunities: string[] = []

    // Pattern-specific opportunities
    switch (resistancePattern.type) {
      case 'intellectual_resistance':
        opportunities.push(
          "Use patient's analytical strength for cognitive restructuring",
        )
        opportunities.push(
          'Introduce psychoeducation about emotion-cognition connection',
        )
        break

      case 'emotional_resistance':
        opportunities.push('Teach emotional regulation skills')
        opportunities.push('Explore emotional safety and past trauma')
        break

      case 'character_resistance':
        opportunities.push('Explore core beliefs about trust and vulnerability')
        opportunities.push('Address perfectionism or control issues')
        break

      case 'transference_resistance':
        opportunities.push(
          'Use transference as window into relationship patterns',
        )
        opportunities.push("Process parallel processes from patient's life")
        break
    }

    // Mechanism-specific opportunities
    const primaryDefense = defensiveMechanisms[0]
    if (primaryDefense) {
      switch (primaryDefense.mechanism) {
        case 'projection':
          opportunities.push("Explore patient's disowned aspects")
          opportunities.push('Work on ownership and personal responsibility')
          break
        case 'rationalization':
          opportunities.push('Gently challenge logical inconsistencies')
          opportunities.push(
            'Explore emotional motivations behind rationalizations',
          )
          break
        case 'splitting':
          opportunities.push('Work on integration and nuanced thinking')
          opportunities.push('Explore black-and-white thinking patterns')
          break
      }
    }

    // Alliance-dependent opportunities
    if (context.therapeuticAlliance > 6) {
      opportunities.push('Strong alliance allows for deeper exploration')
      opportunities.push(
        'Patient may be ready for more challenging interventions',
      )
    }

    return opportunities.slice(0, 4)
  }

  /**
   * Assess risks associated with current resistance pattern
   */
  private assessRisks(
    resistancePattern: ResistancePattern,
    defensiveMechanisms: DefensiveMechanism[],
    cognitiveModel: CognitiveModel,
    context: ResistanceContext,
  ): {
    therapeuticRuptureRisk: number
    treatmentDropoutRisk: number
    escalationPotential: number
  } {
    let ruptureRisk = 0.2 // Base risk
    let dropoutRisk = 0.15 // Base risk
    let escalationPotential = 0.3 // Base risk

    // Adjust for resistance intensity
    ruptureRisk += (resistancePattern.intensity / 10) * 0.4
    dropoutRisk += (resistancePattern.intensity / 10) * 0.3
    escalationPotential += (resistancePattern.intensity / 10) * 0.5

    // Adjust for resistance type
    switch (resistancePattern.type) {
      case 'character_resistance':
        ruptureRisk += 0.3
        dropoutRisk += 0.25
        escalationPotential += 0.4
        break
      case 'transference_resistance':
        ruptureRisk += 0.4
        escalationPotential += 0.3
        break
      case 'emotional_resistance':
        escalationPotential += 0.3
        break
    }

    // Adjust for defensive mechanisms
    const primaryDefense = defensiveMechanisms[0]
    if (primaryDefense) {
      if (
        primaryDefense.maturityLevel === 'psychotic' ||
        primaryDefense.maturityLevel === 'immature'
      ) {
        ruptureRisk += 0.2
        escalationPotential += 0.3
      }

      switch (primaryDefense.mechanism) {
        case 'splitting':
        case 'projective_identification':
          ruptureRisk += 0.3
          escalationPotential += 0.4
          break
        case 'devaluation':
          ruptureRisk += 0.25
          dropoutRisk += 0.2
          break
      }
    }

    // Adjust for alliance quality
    if (context.therapeuticAlliance < 4) {
      ruptureRisk += 0.3
      dropoutRisk += 0.4
    } else if (context.therapeuticAlliance > 7) {
      ruptureRisk -= 0.2
      dropoutRisk -= 0.3
    }

    // Adjust for patient factors
    if (cognitiveModel.conversationalStyle.resistance > 8) {
      dropoutRisk += 0.2
      escalationPotential += 0.2
    }

    if (cognitiveModel.therapyHistory.previousApproaches.length > 2) {
      dropoutRisk += 0.15 // Previous therapy failures increase dropout risk
    }

    // Cap at 1.0
    return {
      therapeuticRuptureRisk: Math.min(1.0, ruptureRisk),
      treatmentDropoutRisk: Math.min(1.0, dropoutRisk),
      escalationPotential: Math.min(1.0, escalationPotential),
    }
  }

  /**
   * Store resistance response in history for pattern tracking
   */
  private storeResistanceHistory(
    modelId: string,
    response: ResistanceResponse,
  ): void {
    if (!this.resistanceHistory.has(modelId)) {
      this.resistanceHistory.set(modelId, [])
    }

    const history = this.resistanceHistory.get(modelId)!
    history.push(response)

    // Keep only last 10 responses to prevent memory bloat
    if (history.length > 10) {
      history.splice(0, history.length - 10)
    }
  }

  /**
   * Get default resistance pattern for fallback
   */
  private getDefaultResistancePattern(): ResistancePattern {
    return {
      type: 'situational_resistance',
      intensity: 5,
      triggers: ['therapeutic_intervention'],
      manifestations: ['hesitant response', 'vague answers', 'topic avoidance'],
      therapeuticResponse:
        'Maintain empathic stance and explore resistance gently',
      typicalDuration: 'session',
      frequency: 'occasional',
    }
  }

  /**
   * Initialize resistance patterns database
   */
  private initializeResistancePatterns(): void {
    const patterns: Array<[string, ResistancePattern]> = [
      [
        'intellectual_resistance',
        {
          type: 'intellectual_resistance',
          intensity: 6,
          triggers: [
            'emotional_exploration',
            'feeling_questions',
            'vulnerability_requests',
          ],
          manifestations: [
            'overanalyzing the therapeutic process',
            'focusing on theoretical aspects rather than personal experience',
            'intellectualizing emotional content',
            'asking therapist technical questions',
            'discussing research and studies instead of feelings',
          ],
          therapeuticResponse:
            'Validate analytical approach while gently bridging to emotional experience',
          typicalDuration: 'multi-session',
          frequency: 'frequent',
        },
      ],

      [
        'emotional_resistance',
        {
          type: 'emotional_resistance',
          intensity: 8,
          triggers: [
            'trauma_exploration',
            'deep_emotions',
            'vulnerability',
            'attachment_themes',
          ],
          manifestations: [
            'sudden emotional shutdown when topics get intense',
            'panic responses to emotional exploration',
            'somatic complaints when emotions are discussed',
            'dissociative responses during emotional content',
            'flooding with overwhelming emotions',
          ],
          therapeuticResponse:
            'Provide safety, use grounding techniques, slow the pace',
          typicalDuration: 'session',
          frequency: 'frequent',
        },
      ],

      [
        'character_resistance',
        {
          type: 'character_resistance',
          intensity: 9,
          triggers: [
            'character_confrontation',
            'pattern_identification',
            'responsibility_taking',
          ],
          manifestations: [
            'hostile responses to therapist observations',
            'consistent blaming of external factors',
            'rejection of therapeutic interpretations',
            'challenging therapist competence',
            "minimizing problems while maximizing others' flaws",
          ],
          therapeuticResponse:
            'Avoid confrontation, use motivational interviewing, build alliance',
          typicalDuration: 'persistent',
          frequency: 'chronic',
        },
      ],

      [
        'transference_resistance',
        {
          type: 'transference_resistance',
          intensity: 7,
          triggers: [
            'therapeutic_relationship',
            'authority_themes',
            'boundaries',
          ],
          manifestations: [
            'treating therapist like significant other from past',
            'testing boundaries repeatedly',
            'excessive compliance or rebellion',
            'sexualizing or romanticizing therapy relationship',
            'competing with or trying to take care of therapist',
          ],
          therapeuticResponse:
            'Explore transference patterns, address relationship dynamics',
          typicalDuration: 'multi-session',
          frequency: 'frequent',
        },
      ],

      [
        'behavioral_resistance',
        {
          type: 'behavioral_resistance',
          intensity: 6,
          triggers: [
            'homework_assignments',
            'behavior_change',
            'action_planning',
          ],
          manifestations: [
            'consistently not completing therapeutic homework',
            'agreeing to plans but not following through',
            'sabotaging progress through contradictory actions',
            'making excuses for behavioral non-compliance',
            'procrastination on therapeutic goals',
          ],
          therapeuticResponse:
            'Explore ambivalence about change, use motivational techniques',
          typicalDuration: 'multi-session',
          frequency: 'frequent',
        },
      ],

      [
        'situational_resistance',
        {
          type: 'situational_resistance',
          intensity: 5,
          triggers: [
            'life_stressors',
            'external_pressures',
            'time_constraints',
          ],
          manifestations: [
            'resistance when life becomes overwhelming',
            'canceling sessions during stressful periods',
            'difficulty focusing due to external demands',
            'resentment about therapy time requirements',
            'crisis-driven rather than growth-oriented engagement',
          ],
          therapeuticResponse:
            'Address external stressors, provide support and flexibility',
          typicalDuration: 'session',
          frequency: 'occasional',
        },
      ],
    ]

    for (const [key, pattern] of patterns) {
      this.resistancePatterns.set(key, pattern)
    }
  }

  /**
   * Initialize defensive mechanisms database
   */
  private initializeDefensiveMechanisms(): void {
    const mechanisms: Array<[string, DefensiveMechanism]> = [
      [
        'denial',
        {
          mechanism: 'denial',
          maturityLevel: 'immature',
          adaptiveness: 0.2,
          contextualEffectiveness: 0.3,
          typicalTriggers: ['painful_reality', 'loss', 'trauma', 'addiction'],
          recognitionDifficulty: 'obvious',
          therapeuticImplications: [
            'blocks awareness of problems',
            'prevents engagement with therapeutic material',
            'may require motivational interviewing approach',
          ],
        },
      ],

      [
        'projection',
        {
          mechanism: 'projection',
          maturityLevel: 'immature',
          adaptiveness: 0.3,
          contextualEffectiveness: 0.4,
          typicalTriggers: [
            'personal_responsibility',
            'negative_emotions',
            'criticism',
          ],
          recognitionDifficulty: 'moderate',
          therapeuticImplications: [
            'redirects focus away from self',
            'creates therapeutic stalemates',
            'requires gentle redirection to patient experience',
          ],
        },
      ],

      [
        'rationalization',
        {
          mechanism: 'rationalization',
          maturityLevel: 'neurotic',
          adaptiveness: 0.5,
          contextualEffectiveness: 0.6,
          typicalTriggers: [
            'cognitive_dissonance',
            'moral_conflicts',
            'failure',
          ],
          recognitionDifficulty: 'moderate',
          therapeuticImplications: [
            'provides alternative explanations for behavior',
            'maintains self-esteem while avoiding change',
            'can be worked with through socratic questioning',
          ],
        },
      ],

      [
        'intellectualization',
        {
          mechanism: 'intellectualization',
          maturityLevel: 'neurotic',
          adaptiveness: 0.6,
          contextualEffectiveness: 0.7,
          typicalTriggers: [
            'emotional_intensity',
            'trauma_processing',
            'vulnerability',
          ],
          recognitionDifficulty: 'subtle',
          therapeuticImplications: [
            'separates thinking from feeling',
            'can be adaptive in crisis but blocks emotional processing',
            'requires bridging to emotional experience',
          ],
        },
      ],

      [
        'displacement',
        {
          mechanism: 'displacement',
          maturityLevel: 'neurotic',
          adaptiveness: 0.4,
          contextualEffectiveness: 0.5,
          typicalTriggers: [
            'anger_at_authority',
            'powerlessness',
            'frustration',
          ],
          recognitionDifficulty: 'moderate',
          therapeuticImplications: [
            'redirects emotions to safer targets',
            'may affect therapeutic relationship',
            'requires exploration of original target',
          ],
        },
      ],

      [
        'reaction_formation',
        {
          mechanism: 'reaction_formation',
          maturityLevel: 'neurotic',
          adaptiveness: 0.4,
          contextualEffectiveness: 0.5,
          typicalTriggers: [
            'unacceptable_impulses',
            'moral_conflicts',
            'shame',
          ],
          recognitionDifficulty: 'subtle',
          therapeuticImplications: [
            'presents opposite of true feelings',
            'creates rigid behavioral patterns',
            'requires gentle exploration of underlying feelings',
          ],
        },
      ],

      [
        'sublimation',
        {
          mechanism: 'sublimation',
          maturityLevel: 'mature',
          adaptiveness: 0.9,
          contextualEffectiveness: 0.8,
          typicalTriggers: [
            'creative_expression',
            'social_contribution',
            'channeling_impulses',
          ],
          recognitionDifficulty: 'hidden',
          therapeuticImplications: [
            'channels impulses into socially acceptable activities',
            'highly adaptive mechanism',
            'can be encouraged and built upon',
          ],
        },
      ],

      [
        'repression',
        {
          mechanism: 'repression',
          maturityLevel: 'neurotic',
          adaptiveness: 0.3,
          contextualEffectiveness: 0.4,
          typicalTriggers: [
            'traumatic_memories',
            'painful_emotions',
            'conflicts',
          ],
          recognitionDifficulty: 'hidden',
          therapeuticImplications: [
            'pushes painful material out of awareness',
            'may emerge in symptoms or behaviors',
            'requires careful, gentle exploration',
          ],
        },
      ],

      [
        'regression',
        {
          mechanism: 'regression',
          maturityLevel: 'immature',
          adaptiveness: 0.3,
          contextualEffectiveness: 0.4,
          typicalTriggers: [
            'overwhelming_stress',
            'illness',
            'major_life_changes',
          ],
          recognitionDifficulty: 'obvious',
          therapeuticImplications: [
            'return to earlier developmental patterns',
            'may indicate overwhelm or trauma',
            'requires stabilization and support',
          ],
        },
      ],

      [
        'isolation',
        {
          mechanism: 'isolation',
          maturityLevel: 'neurotic',
          adaptiveness: 0.4,
          contextualEffectiveness: 0.5,
          typicalTriggers: [
            'emotional_overwhelm',
            'trauma_processing',
            'difficult_decisions',
          ],
          recognitionDifficulty: 'moderate',
          therapeuticImplications: [
            'separates emotion from cognition',
            'allows cognitive processing while avoiding feeling',
            'may require affective interventions',
          ],
        },
      ],

      [
        'undoing',
        {
          mechanism: 'undoing',
          maturityLevel: 'neurotic',
          adaptiveness: 0.3,
          contextualEffectiveness: 0.4,
          typicalTriggers: [
            'guilt',
            'shame',
            'obsessive_thoughts',
            'magical_thinking',
          ],
          recognitionDifficulty: 'moderate',
          therapeuticImplications: [
            'attempts to negate previous actions or thoughts',
            'may manifest as compulsive behaviors',
            'requires exploration of underlying guilt/shame',
          ],
        },
      ],

      [
        'splitting',
        {
          mechanism: 'splitting',
          maturityLevel: 'immature',
          adaptiveness: 0.2,
          contextualEffectiveness: 0.3,
          typicalTriggers: [
            'relationship_conflicts',
            'abandonment_fears',
            'intense_emotions',
          ],
          recognitionDifficulty: 'obvious',
          therapeuticImplications: [
            'creates all-good or all-bad categories',
            'destabilizes therapeutic relationship',
            'requires consistent, boundaried response',
          ],
        },
      ],

      [
        'idealization',
        {
          mechanism: 'idealization',
          maturityLevel: 'immature',
          adaptiveness: 0.3,
          contextualEffectiveness: 0.4,
          typicalTriggers: [
            'dependency_needs',
            'low_self_esteem',
            'attachment_patterns',
          ],
          recognitionDifficulty: 'moderate',
          therapeuticImplications: [
            'places others on unrealistic pedestals',
            'may idealize therapist',
            'requires exploration of realistic relationships',
          ],
        },
      ],

      [
        'devaluation',
        {
          mechanism: 'devaluation',
          maturityLevel: 'immature',
          adaptiveness: 0.2,
          contextualEffectiveness: 0.3,
          typicalTriggers: ['disappointment', 'criticism', 'abandonment_fears'],
          recognitionDifficulty: 'obvious',
          therapeuticImplications: [
            'extreme negative view of others',
            'may devalue therapist or therapy',
            'requires non-defensive therapeutic stance',
          ],
        },
      ],

      [
        'omnipotence',
        {
          mechanism: 'omnipotence',
          maturityLevel: 'immature',
          adaptiveness: 0.2,
          contextualEffectiveness: 0.3,
          typicalTriggers: [
            'powerlessness',
            'narcissistic_injury',
            'control_needs',
          ],
          recognitionDifficulty: 'moderate',
          therapeuticImplications: [
            'grandiose sense of power and control',
            'may resist therapeutic authority',
            'requires careful balance of validation and reality testing',
          ],
        },
      ],

      [
        'primitive_denial',
        {
          mechanism: 'primitive_denial',
          maturityLevel: 'psychotic',
          adaptiveness: 0.1,
          contextualEffectiveness: 0.2,
          typicalTriggers: [
            'psychotic_symptoms',
            'severe_trauma',
            'overwhelming_reality',
          ],
          recognitionDifficulty: 'obvious',
          therapeuticImplications: [
            'complete rejection of reality',
            'may indicate severe pathology',
            'requires stabilization before processing',
          ],
        },
      ],

      [
        'projective_identification',
        {
          mechanism: 'projective_identification',
          maturityLevel: 'immature',
          adaptiveness: 0.2,
          contextualEffectiveness: 0.4,
          typicalTriggers: [
            'interpersonal_conflicts',
            'emotional_regulation_difficulties',
          ],
          recognitionDifficulty: 'subtle',
          therapeuticImplications: [
            'projects feelings and elicits them in others',
            'creates complex therapeutic dynamics',
            'requires therapist self-awareness and containment',
          ],
        },
      ],
    ]

    for (const [key, mechanism] of mechanisms) {
      this.defensiveMechanisms.set(key, mechanism)
    }
  }

  /**
   * Initialize deflection behaviors database
   */
  private initializeDeflectionBehaviors(): void {
    const behaviors: Array<[string, DeflectionBehavior]> = [
      [
        'topic_switching',
        {
          behavior: 'topic_switching',
          sophistication: 'moderate',
          effectiveness: 0.7,
          detectability: 0.3,
          therapeuticChallenge: 'moderate',
        },
      ],

      [
        'humor_deflection',
        {
          behavior: 'humor_deflection',
          sophistication: 'subtle',
          effectiveness: 0.6,
          detectability: 0.5,
          therapeuticChallenge: 'moderate',
        },
      ],

      [
        'intellectualization',
        {
          behavior: 'intellectualization',
          sophistication: 'subtle',
          effectiveness: 0.8,
          detectability: 0.6,
          therapeuticChallenge: 'high',
        },
      ],

      [
        'storytelling',
        {
          behavior: 'storytelling',
          sophistication: 'moderate',
          effectiveness: 0.6,
          detectability: 0.4,
          therapeuticChallenge: 'moderate',
        },
      ],

      [
        'question_deflection',
        {
          behavior: 'question_deflection',
          sophistication: 'obvious',
          effectiveness: 0.5,
          detectability: 0.2,
          therapeuticChallenge: 'low',
        },
      ],

      [
        'somatic_complaints',
        {
          behavior: 'somatic_complaints',
          sophistication: 'moderate',
          effectiveness: 0.7,
          detectability: 0.4,
          therapeuticChallenge: 'high',
        },
      ],

      [
        'crisis_creation',
        {
          behavior: 'crisis_creation',
          sophistication: 'masterful',
          effectiveness: 0.9,
          detectability: 0.7,
          therapeuticChallenge: 'extreme',
        },
      ],

      [
        'therapy_process_focus',
        {
          behavior: 'therapy_process_focus',
          sophistication: 'subtle',
          effectiveness: 0.6,
          detectability: 0.6,
          therapeuticChallenge: 'high',
        },
      ],

      [
        'therapist_focus',
        {
          behavior: 'therapist_focus',
          sophistication: 'subtle',
          effectiveness: 0.7,
          detectability: 0.5,
          therapeuticChallenge: 'high',
        },
      ],

      [
        'external_blame',
        {
          behavior: 'external_blame',
          sophistication: 'obvious',
          effectiveness: 0.5,
          detectability: 0.2,
          therapeuticChallenge: 'moderate',
        },
      ],

      [
        'time_management',
        {
          behavior: 'time_management',
          sophistication: 'moderate',
          effectiveness: 0.6,
          detectability: 0.3,
          therapeuticChallenge: 'moderate',
        },
      ],

      [
        'compliance_performance',
        {
          behavior: 'compliance_performance',
          sophistication: 'masterful',
          effectiveness: 0.8,
          detectability: 0.8,
          therapeuticChallenge: 'extreme',
        },
      ],
    ]

    for (const [key, behavior] of behaviors) {
      this.deflectionBehaviors.set(key, behavior)
    }
  }

  /**
   * Initialize avoidance behaviors database
   */
  private initializeAvoidanceBehaviors(): void {
    const behaviors: Array<[string, AvoidanceBehavior]> = [
      [
        'emotional_avoidance',
        {
          avoidanceType: 'emotional_avoidance',
          content: 'avoiding discussion of feelings',
          triggers: [
            'emotional_intensity',
            'vulnerability',
            'painful_emotions',
          ],
          manifestation: 'changes subject when emotions are explored',
          intensity: 7,
          persistence: 'chronic',
          therapeuticImpact: 'significant',
        },
      ],

      [
        'cognitive_avoidance',
        {
          avoidanceType: 'cognitive_avoidance',
          content: 'avoiding examination of thoughts and beliefs',
          triggers: [
            'belief_challenges',
            'cognitive_restructuring',
            'insight_development',
          ],
          manifestation:
            'becomes vague or confused when beliefs are questioned',
          intensity: 6,
          persistence: 'episodic',
          therapeuticImpact: 'moderate',
        },
      ],

      [
        'behavioral_avoidance',
        {
          avoidanceType: 'behavioral_avoidance',
          content: 'avoiding discussion of behaviors and actions',
          triggers: ['behavior_change', 'accountability', 'action_planning'],
          manifestation: 'minimizes behavioral impacts or changes subject',
          intensity: 5,
          persistence: 'episodic',
          therapeuticImpact: 'moderate',
        },
      ],

      [
        'interpersonal_avoidance',
        {
          avoidanceType: 'interpersonal_avoidance',
          content: 'avoiding discussion of relationships',
          triggers: ['relationship_issues', 'intimacy', 'conflict'],
          manifestation: 'deflects when relationships are discussed',
          intensity: 6,
          persistence: 'chronic',
          therapeuticImpact: 'significant',
        },
      ],

      [
        'existential_avoidance',
        {
          avoidanceType: 'existential_avoidance',
          content: 'avoiding discussion of meaning and purpose',
          triggers: ['life_meaning', 'death', 'spirituality', 'purpose'],
          manifestation: 'dismisses existential topics as unimportant',
          intensity: 5,
          persistence: 'chronic',
          therapeuticImpact: 'moderate',
        },
      ],

      [
        'somatic_avoidance',
        {
          avoidanceType: 'somatic_avoidance',
          content: 'avoiding body awareness and physical sensations',
          triggers: ['body_focus', 'physical_sensations', 'embodiment'],
          manifestation: 'shifts to cognitive topics when body is mentioned',
          intensity: 6,
          persistence: 'chronic',
          therapeuticImpact: 'moderate',
        },
      ],

      [
        'temporal_avoidance',
        {
          avoidanceType: 'temporal_avoidance',
          content: 'avoiding discussion of past or future',
          triggers: ['trauma_history', 'future_planning', 'life_transitions'],
          manifestation: 'stays focused only on present moment superficially',
          intensity: 7,
          persistence: 'episodic',
          therapeuticImpact: 'significant',
        },
      ],

      [
        'therapeutic_process_avoidance',
        {
          avoidanceType: 'therapeutic_process_avoidance',
          content: 'avoiding engagement with therapy itself',
          triggers: [
            'therapy_discussion',
            'therapeutic_relationship',
            'progress_review',
          ],
          manifestation: 'resists meta-therapeutic conversations',
          intensity: 8,
          persistence: 'chronic',
          therapeuticImpact: 'severe',
        },
      ],
    ]

    for (const [key, behavior] of behaviors) {
      this.avoidanceBehaviors.set(key, behavior)
    }
  }

  /**
   * Get resistance pattern history for a specific patient
   */
  public getResistanceHistory(modelId: string): ResistanceResponse[] {
    return this.resistanceHistory.get(modelId) || []
  }

  /**
   * Analyze resistance patterns over time for a specific patient
   */
  public analyzeResistancePatterns(modelId: string): {
    dominantPatterns: string[]
    averageIntensity: number
    progressionTrend: 'increasing' | 'decreasing' | 'stable'
    recommendedInterventions: string[]
  } {
    const history = this.getResistanceHistory(modelId)

    if (history.length === 0) {
      return {
        dominantPatterns: [],
        averageIntensity: 0,
        progressionTrend: 'stable',
        recommendedInterventions: [],
      }
    }

    // Analyze dominant patterns
    const patternCounts = new Map<string, number>()
    let totalIntensity = 0

    for (const response of history) {
      const patternType = response.resistancePattern.type
      patternCounts.set(patternType, (patternCounts.get(patternType) || 0) + 1)
      totalIntensity += response.resistancePattern.intensity
    }

    const dominantPatterns = Array.from(patternCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([pattern]) => pattern)

    const averageIntensity = totalIntensity / history.length

    // Analyze trend
    let progressionTrend: 'increasing' | 'decreasing' | 'stable' = 'stable'
    if (history.length >= 3) {
      const recentIntensity =
        history
          .slice(-3)
          .reduce((sum, r) => sum + r.resistancePattern.intensity, 0) / 3
      const earlierIntensity =
        history
          .slice(0, 3)
          .reduce((sum, r) => sum + r.resistancePattern.intensity, 0) / 3

      if (recentIntensity > earlierIntensity + 1) {
        progressionTrend = 'increasing'
      } else if (recentIntensity < earlierIntensity - 1) {
        progressionTrend = 'decreasing'
      }
    }

    // Generate recommendations
    const recommendedInterventions = this.generateProgressRecommendations(
      dominantPatterns,
      progressionTrend,
      averageIntensity,
    )

    return {
      dominantPatterns,
      averageIntensity,
      progressionTrend,
      recommendedInterventions,
    }
  }

  /**
   * Generate progress-based recommendations
   */
  private generateProgressRecommendations(
    dominantPatterns: string[],
    trend: 'increasing' | 'decreasing' | 'stable',
    intensity: number,
  ): string[] {
    const recommendations: string[] = []

    // Trend-based recommendations
    switch (trend) {
      case 'increasing':
        recommendations.push(
          'Resistance is increasing - reassess therapeutic approach',
        )
        recommendations.push('Consider alliance repair interventions')
        recommendations.push('Slow down pace and increase validation')
        break
      case 'decreasing':
        recommendations.push(
          'Resistance is decreasing - good therapeutic progress',
        )
        recommendations.push(
          'Consider gradually increasing therapeutic challenge',
        )
        break
      case 'stable':
        recommendations.push(
          'Resistance patterns are stable - maintain current approach',
        )
        break
    }

    // Pattern-specific recommendations
    for (const pattern of dominantPatterns) {
      switch (pattern) {
        case 'character_resistance':
          recommendations.push('Focus on motivational interviewing techniques')
          recommendations.push('Avoid confrontational interventions')
          break
        case 'emotional_resistance':
          recommendations.push('Prioritize emotional safety and regulation')
          recommendations.push('Use grounding and stabilization techniques')
          break
        case 'intellectual_resistance':
          recommendations.push('Bridge thinking and feeling experiences')
          recommendations.push('Use psychoeducation as entry point')
          break
      }
    }

    // Intensity-based recommendations
    if (intensity > 7) {
      recommendations.push(
        'High resistance levels - focus on alliance building',
      )
      recommendations.push('Consider consultation or supervision')
    } else if (intensity < 4) {
      recommendations.push('Low resistance - opportunity for deeper work')
    }

    return recommendations.slice(0, 6)
  }
}
