/**
 * Coping Strategy Response Generator Service
 *
 * Generates contextual coping mechanism responses, selects appropriate strategies
 * based on patient state and situation, and creates defensive responses
 * for Patient-Psi therapeutic simulations
 */

import { z } from 'zod'
import type { CognitiveModel } from '../types/CognitiveModel'

// Coping strategy schemas
const CopingMechanismSchema = z.object({
  name: z.string(),
  type: z.enum([
    'emotion_focused',
    'problem_focused',
    'avoidance',
    'social_support',
    'cognitive_reframing',
    'behavioral_activation',
    'mindfulness',
    'maladaptive',
  ]),
  effectiveness: z.object({
    shortTerm: z.number().min(0).max(1),
    longTerm: z.number().min(0).max(1),
    contextDependent: z.boolean(),
  }),
  triggers: z.array(z.string()),
  contraindications: z.array(z.string()),
  requiredResources: z.array(z.string()),
  cognitiveLoad: z.enum(['low', 'medium', 'high']),
  emotionalRegulation: z.number().min(-1).max(1), // -1 = increases distress, 1 = decreases
  socialAcceptability: z.enum(['low', 'medium', 'high']),
})

const CopingResponseTemplateSchema = z.object({
  templateId: z.string(),
  copingStrategy: z.string(),
  responsePatterns: z.array(
    z.object({
      situation: z.string(),
      responseTemplate: z.string(),
      emotionalTone: z.enum([
        'defensive',
        'resigned',
        'hopeful',
        'frustrated',
        'determined',
      ]),
      variability: z.number().min(0).max(1),
    }),
  ),
  defensiveMechanisms: z.array(
    z.object({
      type: z.enum([
        'denial',
        'rationalization',
        'projection',
        'deflection',
        'minimization',
      ]),
      trigger: z.string(),
      response: z.string(),
      effectiveness: z.number().min(0).max(1),
    }),
  ),
  adaptiveProgress: z.object({
    stages: z.array(
      z.object({
        stage: z.enum([
          'resistance',
          'contemplation',
          'preparation',
          'action',
          'maintenance',
        ]),
        responseStyle: z.string(),
        therapeuticOpportunities: z.array(z.string()),
      }),
    ),
  }),
})

const CopingSelectionCriteriaSchema = z.object({
  stressLevel: z.number().min(0).max(10),
  emotionalState: z.string(),
  cognitiveCapacity: z.enum(['impaired', 'limited', 'normal', 'enhanced']),
  socialSupport: z.enum(['none', 'limited', 'moderate', 'strong']),
  timeAvailable: z.enum(['immediate', 'minutes', 'hours', 'days']),
  environment: z.enum(['private', 'semi-private', 'public', 'clinical']),
  pastEffectiveness: z.record(z.string(), z.number()),
  therapeuticGoals: z.array(z.string()),
  contraindications: z.array(z.string()),
})

const GeneratedCopingResponseSchema = z.object({
  selectedStrategy: z.string(),
  responseText: z.string(),
  emotionalTone: z.string(),
  defensiveMechanisms: z.array(z.string()),
  contextualAdaptations: z.array(
    z.object({
      adaptation: z.string(),
      rationale: z.string(),
      therapeuticValue: z.number().min(0).max(1),
    }),
  ),
  therapeuticOpportunities: z.array(z.string()),
  effectivenessPredict: z.object({
    shortTerm: z.number().min(0).max(1),
    longTerm: z.number().min(0).max(1),
    adaptivePotential: z.number().min(0).max(1),
  }),
  followUpRecommendations: z.array(z.string()),
})

export type CopingMechanism = z.infer<typeof CopingMechanismSchema>
export type CopingResponseTemplate = z.infer<
  typeof CopingResponseTemplateSchema
>
export type CopingSelectionCriteria = z.infer<
  typeof CopingSelectionCriteriaSchema
>
export type GeneratedCopingResponse = z.infer<
  typeof GeneratedCopingResponseSchema
>

export interface CopingGenerationOptions {
  includeDefensiveMechanisms: boolean
  adaptToTherapeuticStage: boolean
  considerPastEffectiveness: boolean
  enableProgressiveAdaptation: boolean
  respectPatientPace: boolean
  maxStrategiesPerResponse: number
  preferenceForAdaptiveCoping: number // 0-1, higher = more adaptive
}

/**
 * Coping Strategy Response Generator Service
 */
export class CopingStrategyResponseService {
  private copingMechanisms: Map<string, CopingMechanism> = new Map()
  private responseTemplates: Map<string, CopingResponseTemplate> = new Map()
  private contextualAdaptations: Map<string, string[]> = new Map()
  private effectivenessHistory: Map<string, Map<string, number>> = new Map()

  constructor() {
    this.initializeCopingMechanisms()
    this.initializeResponseTemplates()
    this.initializeContextualAdaptations()
  }

  /**
   * Generate contextual coping response based on patient state and situation
   */
  async generateCopingResponse(
    situation: string,
    cognitiveModel: CognitiveModel,
    selectionCriteria: CopingSelectionCriteria,
    options: CopingGenerationOptions = {
      includeDefensiveMechanisms: true,
      adaptToTherapeuticStage: true,
      considerPastEffectiveness: true,
      enableProgressiveAdaptation: true,
      respectPatientPace: true,
      maxStrategiesPerResponse: 2,
      preferenceForAdaptiveCoping: 0.7,
    },
  ): Promise<GeneratedCopingResponse> {
    try {
      // Select appropriate coping strategies
      const selectedStrategies = await this.selectCopingStrategies(
        situation,
        cognitiveModel,
        selectionCriteria,
        options,
      )

      // Generate response text
      const responseText = await this.generateResponseText(
        selectedStrategies,
        situation,
        cognitiveModel,
        selectionCriteria,
      )

      // Apply defensive mechanisms if appropriate
      const defensiveMechanisms = options.includeDefensiveMechanisms
        ? this.applyDefensiveMechanisms(
            situation,
            cognitiveModel,
            selectionCriteria,
          )
        : []

      // Generate contextual adaptations
      const contextualAdaptations = await this.generateContextualAdaptations(
        selectedStrategies,
        situation,
        cognitiveModel,
        selectionCriteria,
      )

      // Identify therapeutic opportunities
      const therapeuticOpportunities = this.identifyTherapeuticOpportunities(
        selectedStrategies,
        cognitiveModel,
        selectionCriteria,
      )

      // Predict effectiveness
      const effectivenessPredict = this.predictEffectiveness(
        selectedStrategies,
        cognitiveModel,
        selectionCriteria,
      )

      // Generate follow-up recommendations
      const followUpRecommendations = this.generateFollowUpRecommendations(
        selectedStrategies,
        effectivenessPredict,
        cognitiveModel,
      )

      const primaryStrategy = selectedStrategies[0]?.name || 'default_coping'

      return GeneratedCopingResponseSchema.parse({
        selectedStrategy: primaryStrategy,
        responseText,
        emotionalTone: this.determineEmotionalTone(
          cognitiveModel,
          selectionCriteria,
        ),
        defensiveMechanisms: defensiveMechanisms.map((dm) => dm.type),
        contextualAdaptations,
        therapeuticOpportunities,
        effectivenessPredict,
        followUpRecommendations,
      })
    } catch (error) {
      console.error('Error generating coping response:', error)
      throw new Error(
        `Failed to generate coping response: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  /**
   * Select appropriate coping strategies based on context
   */
  async selectCopingStrategies(
    situation: string,
    cognitiveModel: CognitiveModel,
    criteria: CopingSelectionCriteria,
    options: CopingGenerationOptions,
  ): Promise<CopingMechanism[]> {
    const availableStrategies = Array.from(this.copingMechanisms.values())
    const scoredStrategies: Array<{
      strategy: CopingMechanism
      score: number
    }> = []

    for (const strategy of availableStrategies) {
      let score = 0

      // Base effectiveness score
      score += strategy.effectiveness.shortTerm * 0.4
      score += strategy.effectiveness.longTerm * 0.6

      // Adjust for stress level
      if (criteria.stressLevel > 7) {
        // High stress - prefer low cognitive load strategies
        score += strategy.cognitiveLoad === 'low' ? 0.3 : -0.2
      }

      // Adjust for cognitive capacity
      if (criteria.cognitiveCapacity === 'impaired') {
        score += strategy.cognitiveLoad === 'low' ? 0.4 : -0.3
      }

      // Adjust for social support availability
      if (strategy.type === 'social_support') {
        if (criteria.socialSupport === 'none') {
          score -= 0.5
        } else if (criteria.socialSupport === 'strong') {
          score += 0.3
        }
      }

      // Adjust for time available
      if (criteria.timeAvailable === 'immediate') {
        const quickStrategies = ['mindfulness', 'emotion_focused']
        score += quickStrategies.includes(strategy.type) ? 0.2 : -0.1
      }

      // Adjust for past effectiveness
      if (options.considerPastEffectiveness) {
        const pastScore = criteria.pastEffectiveness[strategy.name] || 0.5
        score += (pastScore - 0.5) * 0.3
      }

      // Adjust for adaptive preference
      if (strategy.type === 'maladaptive') {
        score -= options.preferenceForAdaptiveCoping * 0.4
      } else {
        score += options.preferenceForAdaptiveCoping * 0.2
      }

      // Check for contraindications
      const hasContraindications = strategy.contraindications.some((contra) =>
        criteria.contraindications.includes(contra),
      )
      if (hasContraindications) {
        score -= 0.8
      }

      scoredStrategies.push({ strategy, score })
    }

    // Sort by score and select top strategies
    scoredStrategies.sort((a, b) => b.score - a.score)
    return scoredStrategies
      .slice(0, options.maxStrategiesPerResponse)
      .map((s) => s.strategy)
  }

  /**
   * Generate response text based on selected strategies
   */
  async generateResponseText(
    strategies: CopingMechanism[],
    situation: string,
    cognitiveModel: CognitiveModel,
    criteria: CopingSelectionCriteria,
  ): Promise<string> {
    if (strategies.length === 0) {
      return "I don't know what to do about this. Nothing seems to help."
    }

    const primaryStrategy = strategies[0]

    const template = this.responseTemplates.get(primaryStrategy.name)

    if (!template) {
      return this.generateGenericCopingResponse(
        primaryStrategy,
        situation,
        criteria,
      )
    }

    // Find most relevant response pattern
    const relevantPattern =
      template.responsePatterns.find((pattern) =>
        situation.toLowerCase().includes(pattern.situation.toLowerCase()),
      ) || template.responsePatterns[0]

    // Fill template with context
    let response = this.fillResponseTemplate(
      relevantPattern.responseTemplate,
      situation,
      cognitiveModel,
      criteria,
    )

    // Add secondary strategy if available
    if (strategies.length > 1) {
      const secondaryResponse = this.generateSecondaryStrategyResponse(
        strategies[1],
        criteria,
      )
      response += ` ${secondaryResponse}`
    }

    return response
  }

  /**
   * Apply defensive mechanisms to response
   */
  applyDefensiveMechanisms(
    situation: string,
    cognitiveModel: CognitiveModel,
    criteria: CopingSelectionCriteria,
  ): Array<{ type: string; response: string; effectiveness: number }> {
    const defensiveMechanisms: Array<{
      type: string
      response: string
      effectiveness: number
    }> = []

    // High stress triggers defensive responses
    if (criteria.stressLevel > 7) {
      defensiveMechanisms.push({
        type: 'minimization',
        response: "It's not that big of a deal really.",
        effectiveness: 0.3,
      })
    }

    // Low cognitive capacity triggers simpler defenses
    if (criteria.cognitiveCapacity === 'impaired') {
      defensiveMechanisms.push({
        type: 'denial',
        response: "I don't think this is really happening.",
        effectiveness: 0.2,
      })
    }

    // Relationship-focused core beliefs trigger projection
    const hasRelationshipBeliefs = cognitiveModel.coreBeliefs.some((belief) =>
      belief.relatedDomains.includes('relationships'),
    )
    if (
      hasRelationshipBeliefs &&
      situation.toLowerCase().includes('relationship')
    ) {
      defensiveMechanisms.push({
        type: 'projection',
        response: "They're the ones with the problem, not me.",
        effectiveness: 0.4,
      })
    }

    // High resistance triggers deflection
    if (cognitiveModel.conversationalStyle.resistance > 7) {
      defensiveMechanisms.push({
        type: 'deflection',
        response: 'But what about when they did that thing last week?',
        effectiveness: 0.5,
      })
    }

    return defensiveMechanisms
  }

  /**
   * Generate contextual adaptations for the response
   */
  async generateContextualAdaptations(
    strategies: CopingMechanism[],
    situation: string,
    cognitiveModel: CognitiveModel,
    criteria: CopingSelectionCriteria,
  ): Promise<
    Array<{ adaptation: string; rationale: string; therapeuticValue: number }>
  > {
    const adaptations: Array<{
      adaptation: string
      rationale: string
      therapeuticValue: number
    }> = []

    // Adapt for environment
    if (criteria.environment === 'public') {
      adaptations.push({
        adaptation: "I try not to let it show when I'm around other people.",
        rationale: 'Adapting coping to public environment constraints',
        therapeuticValue: 0.4,
      })
    }

    // Adapt for social support level
    if (
      criteria.socialSupport === 'none' &&
      strategies.some((s) => s.type === 'social_support')
    ) {
      adaptations.push({
        adaptation:
          'I wish I had someone to talk to about this, but I usually just deal with it myself.',
        rationale:
          'Acknowledging lack of social support while showing self-reliance',
        therapeuticValue: 0.6,
      })
    }

    // Adapt for past effectiveness
    const ineffectiveStrategies = Object.entries(criteria.pastEffectiveness)
      .filter(([_, effectiveness]) => effectiveness < 0.3)
      .map(([strategy, _]) => strategy)

    if (ineffectiveStrategies.length > 0) {
      adaptations.push({
        adaptation: `I've tried ${ineffectiveStrategies[0]} before but it didn't really work for me.`,
        rationale:
          'Acknowledging past ineffective attempts shows self-awareness',
        therapeuticValue: 0.7,
      })
    }

    // Adapt for cognitive capacity
    if (criteria.cognitiveCapacity === 'impaired') {
      adaptations.push({
        adaptation: "It's hard to think clearly when I feel like this.",
        rationale: 'Acknowledging cognitive limitations during distress',
        therapeuticValue: 0.5,
      })
    }

    return adaptations
  }

  /**
   * Identify therapeutic opportunities in the response
   */
  identifyTherapeuticOpportunities(
    strategies: CopingMechanism[],
    cognitiveModel: CognitiveModel,
    criteria: CopingSelectionCriteria,
  ): string[] {
    const opportunities: string[] = []

    // Maladaptive coping presents intervention opportunities
    if (strategies.some((s) => s.type === 'maladaptive')) {
      opportunities.push('Explore alternative coping strategies')
      opportunities.push(
        'Address underlying beliefs driving maladaptive coping',
      )
    }

    // High stress with low effective coping
    if (
      criteria.stressLevel > 7 &&
      strategies.every((s) => s.effectiveness.shortTerm < 0.4)
    ) {
      opportunities.push('Introduce stress management techniques')
      opportunities.push('Practice grounding exercises')
    }

    // Avoidance patterns
    if (strategies.some((s) => s.type === 'avoidance')) {
      opportunities.push('Gently challenge avoidance patterns')
      opportunities.push('Explore what is being avoided and why')
    }

    // Social support deficits
    if (criteria.socialSupport === 'none') {
      opportunities.push('Explore barriers to seeking support')
      opportunities.push('Identify potential support resources')
    }

    // Cognitive capacity issues
    if (criteria.cognitiveCapacity === 'impaired') {
      opportunities.push('Validate cognitive struggles')
      opportunities.push('Introduce simple, concrete coping skills')
    }

    return opportunities
  }

  /**
   * Predict effectiveness of selected coping strategies
   */
  predictEffectiveness(
    strategies: CopingMechanism[],
    cognitiveModel: CognitiveModel,
    criteria: CopingSelectionCriteria,
  ): { shortTerm: number; longTerm: number; adaptivePotential: number } {
    if (strategies.length === 0) {
      return { shortTerm: 0.1, longTerm: 0.1, adaptivePotential: 0.2 }
    }

    const primaryStrategy = strategies[0]
    const { shortTerm: initialShortTerm, longTerm: initialLongTerm } =
      primaryStrategy.effectiveness
    let shortTerm = initialShortTerm
    let longTerm = initialLongTerm

    // Adjust for patient factors
    const resistanceLevel = cognitiveModel.conversationalStyle.resistance / 10
    shortTerm *= 1 - resistanceLevel * 0.3
    longTerm *= 1 - resistanceLevel * 0.4

    // Adjust for stress level
    if (criteria.stressLevel > 7) {
      shortTerm *= 0.8 // High stress reduces immediate effectiveness
    }

    // Adjust for cognitive capacity
    if (
      criteria.cognitiveCapacity === 'impaired' &&
      primaryStrategy.cognitiveLoad === 'high'
    ) {
      shortTerm *= 0.6
      longTerm *= 0.7
    }

    // Calculate adaptive potential
    const adaptiveTypes = [
      'problem_focused',
      'cognitive_reframing',
      'behavioral_activation',
      'mindfulness',
    ]
    const isAdaptive = adaptiveTypes.includes(primaryStrategy.type)
    const adaptivePotential = isAdaptive ? 0.8 : 0.3

    return {
      shortTerm: Math.max(0, Math.min(1, shortTerm)),
      longTerm: Math.max(0, Math.min(1, longTerm)),
      adaptivePotential: Math.max(0, Math.min(1, adaptivePotential)),
    }
  }

  /**
   * Generate follow-up recommendations
   */
  generateFollowUpRecommendations(
    strategies: CopingMechanism[],
    effectiveness: {
      shortTerm: number
      longTerm: number
      adaptivePotential: number
    },
    cognitiveModel: CognitiveModel,
  ): string[] {
    const recommendations: string[] = []

    if (effectiveness.shortTerm < 0.4) {
      recommendations.push(
        'Explore what makes coping strategies less effective',
      )
      recommendations.push('Consider building basic coping skills foundation')
    }

    if (effectiveness.longTerm < 0.4) {
      recommendations.push('Focus on sustainable, long-term coping development')
      recommendations.push(
        'Address underlying beliefs that may interfere with coping',
      )
    }

    if (effectiveness.adaptivePotential < 0.5) {
      recommendations.push(
        'Gradually introduce more adaptive coping strategies',
      )
      recommendations.push(
        'Explore barriers to using healthier coping mechanisms',
      )
    }

    if (strategies.some((s) => s.type === 'maladaptive')) {
      recommendations.push('Work on harm reduction for current coping patterns')
      recommendations.push('Develop safety plan for high-risk coping behaviors')
    }

    // Patient-specific recommendations
    if (cognitiveModel.conversationalStyle.resistance > 7) {
      recommendations.push(
        'Build therapeutic alliance before challenging coping patterns',
      )
    }

    if (cognitiveModel.conversationalStyle.insightLevel < 4) {
      recommendations.push(
        'Increase awareness of coping patterns and their consequences',
      )
    }

    return recommendations
  }

  // Private helper methods
  private fillResponseTemplate(
    template: string,
    situation: string,
    cognitiveModel: CognitiveModel,
    criteria: CopingSelectionCriteria,
  ): string {
    const replacements: Record<string, string> = {
      '{situation}': situation.toLowerCase(),
      '{emotion}': criteria.emotionalState,
      '{coping_action}': this.getCopingAction(criteria),
      '{outcome}': this.getOutcomeExpectation(criteria),
      '{past_experience}': this.getPastExperience(criteria),
      '{support}': this.getSupportReference(criteria),
      '{difficulty}': this.getDifficultyLevel(criteria),
      '{timeframe}': this.getTimeframe(criteria),
    }

    let response = template
    for (const [placeholder, replacement] of Object.entries(replacements)) {
      response = response.replace(new RegExp(placeholder, 'g'), replacement)
    }

    return response
  }

  private generateGenericCopingResponse(
    strategy: CopingMechanism,
    situation: string,
    criteria: CopingSelectionCriteria,
  ): string {
    const responses = {
      emotion_focused: `When {situation} happens, I try to {coping_action} to manage how I'm feeling.`,
      problem_focused: `I usually try to {coping_action} to deal with {situation} directly.`,
      avoidance: `I just try to {coping_action} and not think about {situation}.`,
      social_support: `I {coping_action} when {situation} gets too overwhelming.`,
      cognitive_reframing: `I try to {coping_action} and think about {situation} differently.`,
      behavioral_activation: `When {situation} happens, I make myself {coping_action}.`,
      mindfulness: `I {coping_action} to stay grounded when {situation} occurs.`,
      maladaptive: `I know it's not great, but I {coping_action} when {situation} gets to me.`,
    }

    const template =
      responses[strategy.type] ||
      `I {coping_action} when dealing with {situation}.`
    return this.fillResponseTemplate(
      template,
      situation,
      {} as CognitiveModel,
      criteria,
    )
  }

  private generateSecondaryStrategyResponse(
    strategy: CopingMechanism,
    _criteria: CopingSelectionCriteria,
  ): string {
    const secondaryResponses = [
      `Sometimes I also try ${strategy.name.toLowerCase()}.`,
      `If that doesn't work, I might ${strategy.name.toLowerCase()}.`,
      `I've been trying to ${strategy.name.toLowerCase()} more lately.`,
    ]

    return secondaryResponses[
      Math.floor(Math.random() * secondaryResponses.length)
    ]
  }

  private determineEmotionalTone(
    cognitiveModel: CognitiveModel,
    criteria: CopingSelectionCriteria,
  ): string {
    if (criteria.stressLevel > 8) {
      return 'frustrated'
    }
    if (criteria.stressLevel > 6) {
      return 'defensive'
    }
    if (cognitiveModel.conversationalStyle.insightLevel > 6) {
      return 'hopeful'
    }
    if (criteria.cognitiveCapacity === 'impaired') {
      return 'resigned'
    }
    return 'determined'
  }

  private getCopingAction(_criteria: CopingSelectionCriteria): string {
    const actions = [
      'take deep breaths',
      'go for a walk',
      'listen to music',
      'talk to someone',
      'write in my journal',
      'exercise',
      'meditate',
      'distract myself',
      'problem-solve',
      'reframe my thoughts',
      'practice self-care',
    ]
    return actions[Math.floor(Math.random() * actions.length)]
  }

  private getOutcomeExpectation(criteria: CopingSelectionCriteria): string {
    if (criteria.stressLevel > 7) {
      return 'it helps a little'
    }
    if (criteria.stressLevel > 4) {
      return 'it usually helps'
    }
    return 'it works pretty well'
  }

  private getPastExperience(_criteria: CopingSelectionCriteria): string {
    const experiences = [
      'I learned this from therapy',
      'this worked before',
      'someone suggested this',
      'I read about this',
      'I figured this out myself',
    ]
    return experiences[Math.floor(Math.random() * experiences.length)]
  }

  private getSupportReference(criteria: CopingSelectionCriteria): string {
    if (criteria.socialSupport === 'none') {
      return 'by myself'
    }
    if (criteria.socialSupport === 'limited') {
      return 'with the few people I trust'
    }
    return 'with help from others'
  }

  private getDifficultyLevel(criteria: CopingSelectionCriteria): string {
    if (criteria.cognitiveCapacity === 'impaired') {
      return 'hard'
    }
    if (criteria.stressLevel > 7) {
      return 'challenging'
    }
    return 'manageable'
  }

  private getTimeframe(criteria: CopingSelectionCriteria): string {
    if (criteria.timeAvailable === 'immediate') {
      return 'right now'
    }
    if (criteria.timeAvailable === 'minutes') {
      return 'for a few minutes'
    }
    return 'when I have time'
  }

  private initializeCopingMechanisms(): void {
    // Adaptive coping mechanisms
    this.copingMechanisms.set('deep_breathing', {
      name: 'deep_breathing',
      type: 'mindfulness',
      effectiveness: { shortTerm: 0.7, longTerm: 0.5, contextDependent: false },
      triggers: ['anxiety', 'panic', 'stress'],
      contraindications: ['severe_respiratory_issues'],
      requiredResources: ['quiet_space'],
      cognitiveLoad: 'low',
      emotionalRegulation: 0.6,
      socialAcceptability: 'high',
    })

    this.copingMechanisms.set('exercise', {
      name: 'exercise',
      type: 'behavioral_activation',
      effectiveness: { shortTerm: 0.6, longTerm: 0.8, contextDependent: true },
      triggers: ['depression', 'anxiety', 'anger', 'stress'],
      contraindications: ['physical_limitations', 'extreme_fatigue'],
      requiredResources: ['physical_space', 'energy'],
      cognitiveLoad: 'low',
      emotionalRegulation: 0.7,
      socialAcceptability: 'high',
    })

    this.copingMechanisms.set('social_support_seeking', {
      name: 'social_support_seeking',
      type: 'social_support',
      effectiveness: { shortTerm: 0.6, longTerm: 0.7, contextDependent: true },
      triggers: ['loneliness', 'stress', 'sadness', 'overwhelm'],
      contraindications: ['social_anxiety', 'trust_issues'],
      requiredResources: ['available_people', 'communication_skills'],
      cognitiveLoad: 'medium',
      emotionalRegulation: 0.5,
      socialAcceptability: 'high',
    })

    this.copingMechanisms.set('cognitive_reframing', {
      name: 'cognitive_reframing',
      type: 'cognitive_reframing',
      effectiveness: { shortTerm: 0.5, longTerm: 0.8, contextDependent: false },
      triggers: ['negative_thoughts', 'catastrophizing', 'self_criticism'],
      contraindications: ['severe_depression', 'cognitive_impairment'],
      requiredResources: ['cognitive_skills', 'time'],
      cognitiveLoad: 'high',
      emotionalRegulation: 0.8,
      socialAcceptability: 'high',
    })

    this.copingMechanisms.set('journaling', {
      name: 'journaling',
      type: 'emotion_focused',
      effectiveness: { shortTerm: 0.5, longTerm: 0.7, contextDependent: false },
      triggers: ['overwhelming_emotions', 'confusion', 'stress'],
      contraindications: ['literacy_issues'],
      requiredResources: ['writing_materials', 'private_space'],
      cognitiveLoad: 'medium',
      emotionalRegulation: 0.6,
      socialAcceptability: 'high',
    })

    // Maladaptive coping mechanisms
    this.copingMechanisms.set('substance_use', {
      name: 'substance_use',
      type: 'maladaptive',
      effectiveness: { shortTerm: 0.6, longTerm: 0.1, contextDependent: false },
      triggers: ['overwhelming_emotions', 'trauma_triggers', 'stress'],
      contraindications: ['addiction_history', 'medical_conditions'],
      requiredResources: ['substances'],
      cognitiveLoad: 'low',
      emotionalRegulation: -0.3,
      socialAcceptability: 'low',
    })

    this.copingMechanisms.set('social_withdrawal', {
      name: 'social_withdrawal',
      type: 'avoidance',
      effectiveness: { shortTerm: 0.4, longTerm: 0.2, contextDependent: true },
      triggers: ['social_anxiety', 'shame', 'overwhelm', 'depression'],
      contraindications: ['severe_depression', 'suicidal_ideation'],
      requiredResources: ['ability_to_isolate'],
      cognitiveLoad: 'low',
      emotionalRegulation: 0.2,
      socialAcceptability: 'medium',
    })

    this.copingMechanisms.set('emotional_eating', {
      name: 'emotional_eating',
      type: 'maladaptive',
      effectiveness: { shortTerm: 0.5, longTerm: 0.1, contextDependent: false },
      triggers: ['stress', 'sadness', 'boredom', 'anxiety'],
      contraindications: ['eating_disorders', 'medical_dietary_restrictions'],
      requiredResources: ['food_access'],
      cognitiveLoad: 'low',
      emotionalRegulation: 0.1,
      socialAcceptability: 'medium',
    })
  }

  private initializeResponseTemplates(): void {
    // Deep breathing template
    this.responseTemplates.set('deep_breathing', {
      templateId: 'deep_breathing_001',
      copingStrategy: 'deep_breathing',
      responsePatterns: [
        {
          situation: 'anxiety',
          responseTemplate:
            'When I start feeling anxious about {situation}, I try to {coping_action}. {past_experience} and {outcome}.',
          emotionalTone: 'determined',
          variability: 0.3,
        },
        {
          situation: 'panic',
          responseTemplate:
            "I {coping_action} to try to calm down when {situation} triggers my panic. It's {difficulty} but {outcome}.",
          emotionalTone: 'frustrated',
          variability: 0.4,
        },
      ],
      defensiveMechanisms: [
        {
          type: 'minimization',
          trigger: 'breathing_not_helping',
          response: "It's not that bad, I can handle this.",
          effectiveness: 0.3,
        },
      ],
      adaptiveProgress: {
        stages: [
          {
            stage: 'resistance',
            responseStyle: "This breathing stuff doesn't really work for me.",
            therapeuticOpportunities: [
              'Explore barriers to mindfulness',
              'Validate difficulty',
            ],
          },
          {
            stage: 'contemplation',
            responseStyle: 'I guess breathing exercises might help a little.',
            therapeuticOpportunities: [
              'Encourage small experiments',
              'Build motivation',
            ],
          },
          {
            stage: 'action',
            responseStyle:
              "I've been practicing breathing exercises when I feel anxious.",
            therapeuticOpportunities: ['Reinforce progress', 'Expand skills'],
          },
        ],
      },
    })

    // Exercise template
    this.responseTemplates.set('exercise', {
      templateId: 'exercise_001',
      copingStrategy: 'exercise',
      responsePatterns: [
        {
          situation: 'stress',
          responseTemplate:
            "When I'm stressed about {situation}, I try to {coping_action}. {outcome} and helps me clear my head.",
          emotionalTone: 'hopeful',
          variability: 0.2,
        },
        {
          situation: 'depression',
          responseTemplate:
            "Even when I don't feel like it, I make myself {coping_action} when I'm down about {situation}. It's {difficulty} to motivate myself.",
          emotionalTone: 'resigned',
          variability: 0.5,
        },
      ],
      defensiveMechanisms: [
        {
          type: 'rationalization',
          trigger: 'exercise_barriers',
          response: "I would exercise more but I just don't have the time.",
          effectiveness: 0.4,
        },
      ],
      adaptiveProgress: {
        stages: [
          {
            stage: 'preparation',
            responseStyle:
              'I know I should exercise more for my mental health.',
            therapeuticOpportunities: [
              'Problem-solve barriers',
              'Set small goals',
            ],
          },
          {
            stage: 'action',
            responseStyle: "I've been going for walks when I feel overwhelmed.",
            therapeuticOpportunities: ['Celebrate successes', 'Expand routine'],
          },
        ],
      },
    })

    // Social withdrawal template
    this.responseTemplates.set('social_withdrawal', {
      templateId: 'social_withdrawal_001',
      copingStrategy: 'social_withdrawal',
      responsePatterns: [
        {
          situation: 'overwhelm',
          responseTemplate:
            'When {situation} gets too much, I just {coping_action} and stay {support}. {outcome} for a while.',
          emotionalTone: 'defensive',
          variability: 0.3,
        },
        {
          situation: 'shame',
          responseTemplate:
            "I don't want people to see me like this, so I {coping_action} until I feel better. It's {difficulty} being around others.",
          emotionalTone: 'resigned',
          variability: 0.4,
        },
      ],
      defensiveMechanisms: [
        {
          type: 'rationalization',
          trigger: 'isolation_concern',
          response: 'I just need some space to figure things out.',
          effectiveness: 0.5,
        },
        {
          type: 'minimization',
          trigger: 'social_consequences',
          response: "People are busy anyway, they probably don't notice.",
          effectiveness: 0.3,
        },
      ],
      adaptiveProgress: {
        stages: [
          {
            stage: 'resistance',
            responseStyle:
              "I don't need other people to deal with my problems.",
            therapeuticOpportunities: [
              'Explore isolation costs',
              'Validate independence',
            ],
          },
          {
            stage: 'contemplation',
            responseStyle: 'Maybe I do isolate too much when things get hard.',
            therapeuticOpportunities: [
              'Explore small social steps',
              'Build support skills',
            ],
          },
        ],
      },
    })
  }

  private initializeContextualAdaptations(): void {
    this.contextualAdaptations.set('high_stress', [
      "It's harder to think clearly when I'm this stressed",
      'Everything feels overwhelming right now',
      'I just need something that works quickly',
    ])

    this.contextualAdaptations.set('low_support', [
      'I wish I had someone to talk to about this',
      'I usually just deal with things on my own',
      'It would be nice to have more support',
    ])

    this.contextualAdaptations.set('past_ineffective', [
      "I've tried other things before but they didn't work",
      'Nothing seems to help for very long',
      'I keep going back to what I know',
    ])

    this.contextualAdaptations.set('public_environment', [
      "I try not to let it show when I'm around people",
      "I have to wait until I'm alone to really deal with it",
      "It's hard to cope when others are watching",
    ])
  }
}

/**
 * Create and export service instance
 */
export const copingStrategyResponse = new CopingStrategyResponseService()

/**
 * Utility function for quick coping response generation
 */
export async function generatePatientCopingResponse(
  situation: string,
  cognitiveModel: CognitiveModel,
  stressLevel: number = 5,
) {
  const criteria: CopingSelectionCriteria = {
    stressLevel,
    emotionalState: 'distressed',
    cognitiveCapacity: stressLevel > 7 ? 'limited' : 'normal',
    socialSupport: 'moderate',
    timeAvailable: 'minutes',
    environment: 'private',
    pastEffectiveness: {},
    therapeuticGoals: ['emotional_regulation', 'stress_management'],
    contraindications: [],
  }

  return copingStrategyResponse.generateCopingResponse(
    situation,
    cognitiveModel,
    criteria,
  )
}
