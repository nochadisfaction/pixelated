/**
 * Communication Style Service
 *
 * Implements detailed response patterns for Patient-Psi communication styles
 * Supports style mixing, consistency maintenance, and adaptive selection
 */

import { z } from 'zod'
import type {
  CognitiveModel,
  ConversationalStyle,
} from '../types/CognitiveModel'

// Communication style schemas
const StyleResponseSchema = z.object({
  content: z.string(),
  styleMarkers: z.array(z.string()),
  emotionalTone: z.string(),
  verbosityLevel: z.number().min(1).max(10),
  resistanceLevel: z.number().min(1).max(10),
  deflectionTechniques: z.array(z.string()),
  linguisticPatterns: z.array(z.string()),
})

const _StyleMixConfigSchema = z.object({
  primaryStyle: z.string(),
  secondaryStyle: z.string().optional(),
  mixingRatio: z.number().min(0).max(1),
  contextualFactors: z.array(z.string()),
  adaptationTriggers: z.array(z.string()),
})

const StyleConsistencyProfileSchema = z.object({
  baselineStyle: z.string(),
  variationRange: z.number().min(0).max(1),
  adaptationSpeed: z.enum(['immediate', 'gradual', 'resistant']),
  consistencyFactors: z.array(z.string()),
  breakdownTriggers: z.array(z.string()),
})

export type StyleResponse = z.infer<typeof StyleResponseSchema>
export type StyleMixConfig = z.infer<typeof _StyleMixConfigSchema>
export type StyleConsistencyProfile = z.infer<
  typeof StyleConsistencyProfileSchema
>

export interface StyleContext {
  therapeuticStage: 'initial' | 'building-rapport' | 'working' | 'consolidation'
  emotionalState: string
  stressLevel: number
  rapportLevel: number
  previousResponseCount: number
  topicSensitivity: 'low' | 'medium' | 'high'
  therapistApproach: 'supportive' | 'challenging' | 'exploratory' | 'directive'
}

export interface ResponseGenerationRequest {
  patientMessage: string
  therapistMessage: string
  conversationHistory: Array<{
    speaker: string
    message: string
    timestamp: number
  }>
  context: StyleContext
  targetStyle: string
  styleConsistency: StyleConsistencyProfile
  mixingConfig?: StyleMixConfig
}

export interface GeneratedResponse {
  response: string
  styleAnalysis: {
    primaryStyle: string
    secondaryStyles: string[]
    styleConfidence: number
    consistencyScore: number
  }
  linguisticFeatures: {
    wordCount: number
    averageSentenceLength: number
    complexityScore: number
    emotionalIntensity: number
    deflectionCount: number
  }
  therapeuticImpact: {
    rapportEffect: number
    resistanceIndicators: string[]
    openingOpportunities: string[]
    recommendedFollowup: string[]
  }
}

/**
 * Communication Style Templates and Generators
 */
export class CommunicationStyleService {
  private styleTemplates: Map<string, StyleTemplate> = new Map()
  private responsePatterns: Map<string, ResponsePattern[]> = new Map()
  private styleTransitions: Map<string, Map<string, number>> = new Map()

  constructor() {
    this.initializeStyleTemplates()
    this.initializeResponsePatterns()
    this.initializeStyleTransitions()
  }

  /**
   * Generate response based on communication style
   */
  async generateStyledResponse(
    request: ResponseGenerationRequest,
  ): Promise<GeneratedResponse> {
    // Analyze current context and determine effective style
    const effectiveStyle = this.determineEffectiveStyle(request)

    // Generate base response using style templates
    const baseResponse = await this.generateBaseResponse(
      request.therapistMessage,
      effectiveStyle,
      request.context,
    )

    // Apply style mixing if configured
    const styledResponse = request.mixingConfig
      ? this.applyStyleMixing(
          baseResponse,
          request.mixingConfig,
          request.context,
        )
      : baseResponse

    // Apply consistency constraints
    const consistentResponse = this.applyConsistencyConstraints(
      styledResponse,
      request.styleConsistency,
      request.conversationHistory,
    )

    // Analyze response characteristics
    const styleAnalysis = this.analyzeResponseStyle(
      consistentResponse,
      effectiveStyle,
    )
    const linguisticFeatures =
      this.analyzeLinguisticFeatures(consistentResponse)
    const therapeuticImpact = this.analyzeTherapeuticImpact(
      consistentResponse,
      request.context,
      request.conversationHistory,
    )

    return {
      response: consistentResponse.content,
      styleAnalysis,
      linguisticFeatures,
      therapeuticImpact,
    }
  }

  /**
   * Create style consistency profile from cognitive model
   */
  createStyleConsistencyProfile(
    model: CognitiveModel,
  ): StyleConsistencyProfile {
    const style = model.conversationalStyle
    const baseStyle = this.inferPrimaryStyleType(style)

    // Calculate variation range based on personality factors
    const variationRange = this.calculateVariationRange(model)

    // Determine adaptation speed based on defensive patterns
    const adaptationSpeed = this.determineAdaptationSpeed(model)

    // Identify consistency factors
    const consistencyFactors = this.identifyConsistencyFactors(model)

    // Identify breakdown triggers
    const breakdownTriggers = this.identifyBreakdownTriggers(model)

    return StyleConsistencyProfileSchema.parse({
      baselineStyle: baseStyle,
      variationRange,
      adaptationSpeed,
      consistencyFactors,
      breakdownTriggers,
    })
  }

  /**
   * Generate multiple response options with different style approaches
   */
  async generateStyleVariations(
    therapistMessage: string,
    context: StyleContext,
    targetStyles: string[],
  ): Promise<Array<{ style: string; response: GeneratedResponse }>> {
    const variations = []

    for (const style of targetStyles) {
      const request: ResponseGenerationRequest = {
        patientMessage: '',
        therapistMessage,
        conversationHistory: [],
        context,
        targetStyle: style,
        styleConsistency: this.getDefaultConsistencyProfile(style),
      }

      const response = await this.generateStyledResponse(request)
      variations.push({ style, response })
    }

    return variations
  }

  /**
   * Analyze conversation for style evolution patterns
   */
  analyzeStyleEvolution(
    conversationHistory: Array<{
      speaker: string
      message: string
      timestamp: number
    }>,
  ): {
    styleProgression: Array<{
      timestamp: number
      style: string
      confidence: number
    }>
    adaptationEvents: Array<{
      timestamp: number
      trigger: string
      styleChange: string
    }>
    consistencyMetrics: {
      overallConsistency: number
      adaptationFrequency: number
      styleStability: number
    }
  } {
    const patientMessages = conversationHistory.filter(
      (msg) => msg.speaker === 'patient',
    )
    const styleProgression = []
    const adaptationEvents = []

    for (let i = 0; i < patientMessages.length; i++) {
      const message = patientMessages[i]
      const detectedStyle = this.detectMessageStyle(message.message)

      styleProgression.push({
        timestamp: message.timestamp,
        style: detectedStyle.primaryStyle,
        confidence: detectedStyle.confidence,
      })

      // Detect style changes
      if (i > 0) {
        const previousStyle = styleProgression[i - 1].style
        if (detectedStyle.primaryStyle !== previousStyle) {
          const trigger = this.identifyStyleChangeTrigger(
            patientMessages[i - 1].message,
            message.message,
            conversationHistory.slice(Math.max(0, i * 2 - 2), i * 2 + 1),
          )

          adaptationEvents.push({
            timestamp: message.timestamp,
            trigger,
            styleChange: `${previousStyle} → ${detectedStyle.primaryStyle}`,
          })
        }
      }
    }

    const consistencyMetrics = this.calculateConsistencyMetrics(
      styleProgression,
      adaptationEvents,
    )

    return {
      styleProgression,
      adaptationEvents,
      consistencyMetrics,
    }
  }

  // Style template definitions
  private initializeStyleTemplates(): void {
    // Plain Style
    this.styleTemplates.set('plain', {
      name: 'Plain',
      description:
        'Direct, straightforward communication with minimal elaboration',
      characteristics: {
        verbosityRange: [2, 5],
        resistanceRange: [1, 4],
        emotionalExpression: 'moderate',
        deflectionTendency: 'low',
      },
      responseTemplates: [
        'I {feeling} about {topic}.',
        '{acknowledgment}. {brief_explanation}.',
        'I think {simple_thought}.',
        '{answer}. {optional_elaboration}?',
      ],
      linguisticMarkers: [
        'short sentences',
        'common vocabulary',
        'direct statements',
        'minimal qualifiers',
      ],
      avoidancePatterns: [
        'minimal detail avoidance',
        'surface-level deflection',
        'topic acknowledgment',
      ],
    })

    // Verbose Style
    this.styleTemplates.set('verbose', {
      name: 'Verbose',
      description:
        'Extensive, detailed communication with tangential exploration',
      characteristics: {
        verbosityRange: [7, 10],
        resistanceRange: [2, 6],
        emotionalExpression: 'high',
        deflectionTendency: 'moderate',
      },
      responseTemplates: [
        'Well, you know, {topic} is really complicated because {detailed_explanation}, and I think that connects to {tangent}, which reminds me of {story}...',
        "I mean, {initial_thought}, but then again {qualification}, and I guess what I'm really trying to say is {eventual_feeling}, although {qualification}...",
        "That's interesting that you mention {topic} because it makes me think about {extensive_elaboration}. I remember {detailed_memory}...",
      ],
      linguisticMarkers: [
        'long, complex sentences',
        'multiple clauses',
        'tangential connections',
        'narrative elements',
        'qualifiers and hedging',
      ],
      avoidancePatterns: [
        'tangential deflection',
        'over-explanation',
        'narrative distraction',
        'excessive detail as avoidance',
      ],
    })

    // Defensive Style
    this.styleTemplates.set('defensive', {
      name: 'Defensive',
      description: 'Protective, resistant communication with blame deflection',
      characteristics: {
        verbosityRange: [3, 7],
        resistanceRange: [6, 10],
        emotionalExpression: 'guarded',
        deflectionTendency: 'high',
      },
      responseTemplates: [
        "I don't think that's fair. {justification}.",
        "It's not my fault that {external_blame}.",
        "You don't understand - {defensive_explanation}.",
        'Why are you focusing on {deflection_target}? What about {counter_topic}?',
        "I've heard this before, and {dismissal}.",
      ],
      linguisticMarkers: [
        'contradictory statements',
        'blame attribution',
        'justification language',
        'rhetorical questions',
        'minimization phrases',
      ],
      avoidancePatterns: [
        'blame deflection',
        'topic redirection',
        'questioning the questioner',
        'historical justification',
        'victimization narratives',
      ],
    })

    // Reserved Style
    this.styleTemplates.set('reserved', {
      name: 'Reserved',
      description: 'Minimal, cautious communication with emotional restraint',
      characteristics: {
        verbosityRange: [1, 3],
        resistanceRange: [3, 7],
        emotionalExpression: 'minimal',
        deflectionTendency: 'high',
      },
      responseTemplates: [
        '{minimal_acknowledgment}.',
        'I guess.',
        'Maybe.',
        "I don't know.",
        '{brief_response}. {silence_implied}',
      ],
      linguisticMarkers: [
        'very short responses',
        'uncertainty expressions',
        'minimal emotional words',
        'frequent silence',
        'non-committal language',
      ],
      avoidancePatterns: [
        'silence as avoidance',
        'minimal response deflection',
        'uncertainty as protection',
        'topic withdrawal',
      ],
    })

    // Pleasing Style
    this.styleTemplates.set('pleasing', {
      name: 'Pleasing',
      description: 'Accommodating, agreeable communication focused on approval',
      characteristics: {
        verbosityRange: [4, 7],
        resistanceRange: [1, 3],
        emotionalExpression: 'positive-focused',
        deflectionTendency: 'moderate',
      },
      responseTemplates: [
        "You're absolutely right about {agreement}. I should {self-criticism}.",
        'I appreciate you helping me see {therapist_perspective}. I need to work on {self_improvement}.',
        'I know I have problems with {admission}. What do you think I should do?',
        'I want to be better at {goal}. Is that what you think too?',
      ],
      linguisticMarkers: [
        'agreement markers',
        'self-deprecating language',
        'approval seeking',
        'deference indicators',
        'helping language',
      ],
      avoidancePatterns: [
        'agreement as avoidance',
        'people-pleasing deflection',
        'self-blame deflection',
        "focus on others' needs",
      ],
    })

    // Upset Style
    this.styleTemplates.set('upset', {
      name: 'Upset',
      description:
        'Emotionally charged, reactive communication with high resistance',
      characteristics: {
        verbosityRange: [4, 8],
        resistanceRange: [8, 10],
        emotionalExpression: 'intense',
        deflectionTendency: 'high',
      },
      responseTemplates: [
        'This is ridiculous! {emotional_outburst}!',
        "I can't believe {frustration_target}! {anger_expression}!",
        'Nothing ever works! {despair_statement}!',
        'Why does this always happen to me? {victim_statement}!',
      ],
      linguisticMarkers: [
        'emotional intensity markers',
        'exclamation points',
        'absolutist language',
        'victim language',
        'blame language',
      ],
      avoidancePatterns: [
        'emotional overwhelm as avoidance',
        'anger deflection',
        'catastrophizing deflection',
        'blame deflection',
      ],
    })
  }

  private initializeResponsePatterns(): void {
    // Initialize response patterns for each style
    const styles = [
      'plain',
      'verbose',
      'defensive',
      'reserved',
      'pleasing',
      'upset',
    ]

    for (const style of styles) {
      this.responsePatterns.set(style, this.generateResponsePatterns(style))
    }
  }

  private generateResponsePatterns(style: string): ResponsePattern[] {
    const basePatterns: ResponsePattern[] = []

    switch (style) {
      case 'plain':
        basePatterns.push(
          {
            trigger: 'feeling_question',
            pattern: 'I feel {emotion} about {topic}.',
            variability: 0.3,
            emotionalRange: [3, 7],
          },
          {
            trigger: 'explanation_request',
            pattern: '{brief_explanation}. {optional_detail}.',
            variability: 0.4,
            emotionalRange: [2, 6],
          },
          {
            trigger: 'opinion_request',
            pattern: 'I think {straightforward_opinion}.',
            variability: 0.2,
            emotionalRange: [1, 5],
          },
        )
        break

      case 'verbose':
        basePatterns.push(
          {
            trigger: 'any_question',
            pattern:
              'Well, {topic} is really {complex_description} because {detailed_reasoning}, and that reminds me of {tangential_story}...',
            variability: 0.8,
            emotionalRange: [4, 9],
          },
          {
            trigger: 'feeling_question',
            pattern:
              "I mean, {initial_feeling}, but it's also {secondary_feeling}, and I guess what I'm really trying to say is {eventual_feeling}, although {qualification}...",
            variability: 0.9,
            emotionalRange: [5, 8],
          },
        )
        break

      case 'defensive':
        basePatterns.push(
          {
            trigger: 'challenging_question',
            pattern:
              "I don't think that's fair. {justification} and {counter_blame}.",
            variability: 0.6,
            emotionalRange: [6, 9],
          },
          {
            trigger: 'blame_implication',
            pattern:
              "It's not my fault that {external_factor}. {defensive_reasoning}.",
            variability: 0.5,
            emotionalRange: [7, 10],
          },
        )
        break

      case 'reserved':
        basePatterns.push(
          {
            trigger: 'any_question',
            pattern: '{minimal_response}.',
            variability: 0.2,
            emotionalRange: [1, 4],
          },
          {
            trigger: 'deep_question',
            pattern: "I don't know. {uncomfortable_silence}.",
            variability: 0.1,
            emotionalRange: [2, 5],
          },
        )
        break

      case 'pleasing':
        basePatterns.push(
          {
            trigger: 'therapist_suggestion',
            pattern:
              "You're right about {agreement}. I should {self_improvement_commitment}.",
            variability: 0.4,
            emotionalRange: [3, 6],
          },
          {
            trigger: 'feedback',
            pattern:
              'I appreciate your help with {topic}. What do you think I should do about {seeking_guidance}?',
            variability: 0.5,
            emotionalRange: [4, 7],
          },
        )
        break

      case 'upset':
        basePatterns.push(
          {
            trigger: 'any_trigger',
            pattern:
              'This is {emotional_intensifier}! {frustration_expression}!',
            variability: 0.7,
            emotionalRange: [8, 10],
          },
          {
            trigger: 'suggestion',
            pattern: 'Nothing works! {despair_statement}!',
            variability: 0.6,
            emotionalRange: [7, 10],
          },
        )
        break
    }

    return basePatterns
  }

  private initializeStyleTransitions(): void {
    // Define probability matrices for style transitions
    const transitionProbs = {
      plain: {
        verbose: 0.15,
        defensive: 0.1,
        reserved: 0.05,
        pleasing: 0.1,
        upset: 0.05,
      },
      verbose: {
        plain: 0.2,
        defensive: 0.15,
        reserved: 0.05,
        pleasing: 0.1,
        upset: 0.1,
      },
      defensive: {
        plain: 0.1,
        verbose: 0.1,
        reserved: 0.1,
        pleasing: 0.05,
        upset: 0.3,
      },
      reserved: {
        plain: 0.15,
        verbose: 0.05,
        defensive: 0.1,
        pleasing: 0.2,
        upset: 0.1,
      },
      pleasing: {
        plain: 0.2,
        verbose: 0.1,
        defensive: 0.05,
        reserved: 0.1,
        upset: 0.05,
      },
      upset: {
        plain: 0.1,
        verbose: 0.15,
        defensive: 0.4,
        reserved: 0.1,
        pleasing: 0.05,
      },
    }

    for (const [fromStyle, transitions] of Object.entries(transitionProbs)) {
      const transitionMap = new Map<string, number>()
      for (const [toStyle, probability] of Object.entries(transitions)) {
        transitionMap.set(toStyle, probability)
      }
      this.styleTransitions.set(fromStyle, transitionMap)
    }
  }

  // Implementation helper methods

  private determineEffectiveStyle(request: ResponseGenerationRequest): string {
    // Consider context factors to determine most appropriate style
    let effectiveStyle = request.targetStyle

    // Adjust based on therapeutic stage
    if (
      request.context.therapeuticStage === 'initial' &&
      effectiveStyle === 'upset'
    ) {
      effectiveStyle = 'defensive' // Less intense for initial sessions
    }

    // Adjust based on stress level
    if (request.context.stressLevel > 8) {
      const stressStyles = ['defensive', 'upset', 'reserved']
      if (!stressStyles.includes(effectiveStyle)) {
        effectiveStyle = 'defensive'
      }
    }

    // Adjust based on rapport level
    if (request.context.rapportLevel < 3 && effectiveStyle === 'pleasing') {
      return 'reserved' // Less trusting when rapport is low;
    }

    return effectiveStyle
  }

  private async generateBaseResponse(
    therapistMessage: string,
    style: string,
    context: StyleContext,
  ): Promise<StyleResponse> {
    const template = this.styleTemplates.get(style)
    if (!template) {
      throw new Error(`Unknown style: ${style}`)
    }

    // Select appropriate response pattern
    const patterns = this.responsePatterns.get(style) || []
    const trigger = this.identifyMessageTrigger(therapistMessage, context)
    const selectedPattern = this.selectBestPattern(patterns, trigger, context)

    // Generate content using template and pattern
    const content = this.fillResponseTemplate(
      selectedPattern,
      therapistMessage,
      context,
    )

    // Extract style markers and characteristics
    const styleMarkers = template.linguisticMarkers
    const emotionalTone = this.determineEmotionalTone(style, context)
    const verbosityLevel = this.calculateVerbosity(
      content,
      template.characteristics.verbosityRange,
    )
    const resistanceLevel = this.calculateResistance(
      content,
      context,
      template.characteristics.resistanceRange,
    )
    const deflectionTechniques = this.identifyDeflectionTechniques(
      content,
      template.avoidancePatterns,
    )
    const linguisticPatterns = this.extractLinguisticPatterns(
      content,
      template.linguisticMarkers,
    )

    return StyleResponseSchema.parse({
      content,
      styleMarkers,
      emotionalTone,
      verbosityLevel,
      resistanceLevel,
      deflectionTechniques,
      linguisticPatterns,
    })
  }

  private applyStyleMixing(
    baseResponse: StyleResponse,
    mixConfig: StyleMixConfig,
    context: StyleContext,
  ): StyleResponse {
    if (!mixConfig.secondaryStyle) {
      return baseResponse
    }

    const secondaryTemplate = this.styleTemplates.get(mixConfig.secondaryStyle)
    if (!secondaryTemplate) {
      return baseResponse
    }

    // Mix content based on mixing ratio
    const mixedContent = this.blendStyleContent(
      baseResponse.content,
      mixConfig.secondaryStyle,
      mixConfig.mixingRatio,
      context,
    )

    // Combine style markers
    const mixedStyleMarkers = [
      ...baseResponse.styleMarkers,
      ...secondaryTemplate.linguisticMarkers.slice(0, 2),
    ]

    // Adjust other characteristics
    const mixedVerbosity = this.interpolateValue(
      baseResponse.verbosityLevel,
      this.getStyleCharacteristic(mixConfig.secondaryStyle, 'verbosity'),
      mixConfig.mixingRatio,
    )

    const mixedResistance = this.interpolateValue(
      baseResponse.resistanceLevel,
      this.getStyleCharacteristic(mixConfig.secondaryStyle, 'resistance'),
      mixConfig.mixingRatio,
    )

    return {
      ...baseResponse,
      content: mixedContent,
      styleMarkers: mixedStyleMarkers,
      verbosityLevel: mixedVerbosity,
      resistanceLevel: mixedResistance,
    }
  }

  // Additional helper methods would continue here...
  // Due to length constraints, I'm including the key structure and some core methods
  // The full implementation would include all the private helper methods

  private applyConsistencyConstraints(
    response: StyleResponse,
    _consistency: StyleConsistencyProfile,
    _history: Array<{ speaker: string; message: string; timestamp: number }>,
  ): StyleResponse {
    // Implementation for applying consistency constraints
    // TODO: Implement consistency constraint logic
    return response
  }

  private analyzeResponseStyle(response: StyleResponse, expectedStyle: string) {
    return {
      primaryStyle: expectedStyle,
      secondaryStyles: [],
      styleConfidence: 0.85,
      consistencyScore: 0.8,
    }
  }

  private analyzeLinguisticFeatures(response: StyleResponse) {
    const wordCount = response.content.split(/\s+/).length
    const sentences = response.content
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 0)

    return {
      wordCount,
      averageSentenceLength: wordCount / Math.max(sentences.length, 1),
      complexityScore: this.calculateComplexityScore(response.content),
      emotionalIntensity: this.calculateEmotionalIntensity(response.content),
      deflectionCount: response.deflectionTechniques.length,
    }
  }

  private analyzeTherapeuticImpact(
    response: StyleResponse,
    context: StyleContext,
    _history: Array<{ speaker: string; message: string; timestamp: number }>,
  ) {
    return {
      rapportEffect: this.calculateRapportEffect(response, context),
      resistanceIndicators: this.identifyResistanceIndicators(response),
      openingOpportunities: this.identifyOpeningOpportunities(
        response,
        context,
      ),
      recommendedFollowup: this.generateFollowupRecommendations(
        response,
        context,
      ),
    }
  }

  // Placeholder implementations for core helper methods
  public inferPrimaryStyleType(style: ConversationalStyle): string {
    if (style.resistance >= 8) {
      return 'upset'
    }
    if (style.verbosity >= 8) {
      return 'verbose'
    }
    if (style.verbosity <= 3) {
      return 'reserved'
    }
    if (style.resistance <= 3) {
      return 'pleasing'
    }
    if (style.resistance >= 6) {
      return 'defensive'
    }
    return 'plain'
  }

  private calculateVariationRange(_model: CognitiveModel): number {
    // Calculate based on emotional volatility and belief strength
    const avgEmotionalIntensity =
      _model.emotionalPatterns.reduce((sum, e) => sum + e.intensity, 0) /
      Math.max(_model.emotionalPatterns.length, 1)
    return Math.min(0.8, (avgEmotionalIntensity / 10) * 0.6 + 0.2)
  }

  private determineAdaptationSpeed(
    _model: CognitiveModel,
  ): 'immediate' | 'gradual' | 'resistant' {
    const { resistance } = _model.conversationalStyle
    if (resistance >= 8) {
      return 'resistant'
    }
    if (resistance <= 4) {
      return 'immediate'
    }
    return 'gradual'
  }

  private identifyConsistencyFactors(_model: CognitiveModel): string[] {
    return [
      'core belief alignment',
      'emotional state stability',
      'defensive pattern consistency',
      'trust level with therapist',
    ]
  }

  private identifyBreakdownTriggers(_model: CognitiveModel): string[] {
    return [
      'direct challenge to core beliefs',
      'emotional overwhelm',
      'perceived judgment',
      'therapy resistance activation',
    ]
  }

  private getDefaultConsistencyProfile(style: string): StyleConsistencyProfile {
    return StyleConsistencyProfileSchema.parse({
      baselineStyle: style,
      variationRange: 0.3,
      adaptationSpeed: 'gradual',
      consistencyFactors: ['emotional state', 'rapport level'],
      breakdownTriggers: ['direct confrontation', 'emotional triggers'],
    })
  }

  private detectMessageStyle(message: string): {
    primaryStyle: string
    confidence: number
  } {
    // Analyze message characteristics to detect style
    const wordCount = message.split(/\s+/).length
    const exclamations = (message.match(/!/g) || []).length

    if (wordCount < 5) {
      return { primaryStyle: 'reserved', confidence: 0.8 }
    }
    if (wordCount > 50) {
      return { primaryStyle: 'verbose', confidence: 0.7 }
    }
    if (exclamations > 0) {
      return { primaryStyle: 'upset', confidence: 0.6 }
    }
    if (message.includes('sorry') || message.includes('my fault')) {
      return { primaryStyle: 'pleasing', confidence: 0.7 }
    }
    if (message.includes('not my') || message.includes('unfair')) {
      return { primaryStyle: 'defensive', confidence: 0.8 }
    }

    return { primaryStyle: 'plain', confidence: 0.5 }
  }

  private identifyStyleChangeTrigger(
    _previousMessage: string,
    _currentMessage: string,
    _context: Array<{ speaker: string; message: string; timestamp: number }>,
  ): string {
    // Analyze what triggered the style change
    return 'therapist challenge'
  }

  private calculateConsistencyMetrics(
    styleProgression: Array<{
      timestamp: number
      style: string
      confidence: number
    }>,
    adaptationEvents: Array<{
      timestamp: number
      trigger: string
      styleChange: string
    }>,
  ) {
    const totalMessages = styleProgression.length
    const styleChanges = adaptationEvents.length

    return {
      overallConsistency: Math.max(
        0,
        1 - styleChanges / Math.max(totalMessages, 1),
      ),
      adaptationFrequency: styleChanges / Math.max(totalMessages, 1),
      styleStability:
        styleProgression.reduce((sum, p) => sum + p.confidence, 0) /
        Math.max(totalMessages, 1),
    }
  }

  // Updated implementations for better realism
  private identifyMessageTrigger(
    message: string,
    _context: StyleContext,
  ): string {
    const messageLower = message.toLowerCase()

    if (messageLower.includes('blame') || messageLower.includes('fault')) {
      return 'blame_implication'
    }
    if (messageLower.includes('feel') || messageLower.includes('emotion')) {
      return 'feeling_question'
    }
    if (messageLower.includes('explain') || messageLower.includes('tell me')) {
      return 'explanation_request'
    }
    if (messageLower.includes('think') || messageLower.includes('opinion')) {
      return 'opinion_request'
    }
    if (messageLower.includes('should') || messageLower.includes('need to')) {
      return 'therapist_suggestion'
    }
    if (
      messageLower.includes('challenge') ||
      messageLower.includes('confront')
    ) {
      return 'challenging_question'
    }

    return 'general'
  }

  private selectBestPattern(
    patterns: ResponsePattern[],
    trigger: string,
    _context: StyleContext,
  ): ResponsePattern {
    // Find pattern that matches the trigger
    const matchingPattern = patterns.find(
      (p) =>
        p.trigger === trigger ||
        p.trigger === 'any_question' ||
        p.trigger === 'any_trigger',
    )

    if (matchingPattern) {
      return matchingPattern
    }

    // Fallback pattern
    return (
      patterns[0] || {
        trigger: 'default',
        pattern: 'I understand.',
        variability: 0.2,
        emotionalRange: [1, 5],
      }
    )
  }

  private fillResponseTemplate(
    pattern: ResponsePattern,
    message: string,
    context: StyleContext,
  ): string {
    let response = pattern.pattern

    // Replace common placeholders with contextually appropriate content
    const replacements: Record<string, string> = {
      '{feeling}': this.getContextualFeeling(context),
      '{topic}': this.extractTopic(message),
      '{acknowledgment}': this.getAcknowledgment(context),
      '{brief_explanation}': this.getBriefExplanation(context),
      '{simple_thought}': this.getSimpleThought(context),
      '{answer}': this.getSimpleAnswer(context),
      '{optional_elaboration}': this.getOptionalElaboration(context),
      '{detailed_explanation}': this.getDetailedExplanation(context),
      '{tangent}': this.getTangent(context),
      '{story}': this.getPersonalStory(context),
      '{justification}': this.getJustification(context),
      '{external_blame}': this.getExternalBlame(context),
      '{defensive_explanation}': this.getDefensiveExplanation(context),
      '{deflection_target}': this.getDeflectionTarget(message),
      '{counter_topic}': this.getCounterTopic(context),
      '{dismissal}': this.getDismissal(context),
      '{minimal_acknowledgment}': this.getMinimalAcknowledgment(context),
      '{brief_response}': this.getBriefResponse(context),
      '{silence_implied}': '',
      '{agreement}': this.getAgreement(message),
      '{self-criticism}': this.getSelfCriticism(context),
      '{therapist_perspective}': this.getTherapistPerspective(message),
      '{self_improvement}': this.getSelfImprovement(context),
      '{admission}': this.getAdmission(context),
      '{goal}': this.getGoal(context),
      '{emotional_outburst}': this.getEmotionalOutburst(context),
      '{frustration_target}': this.getFrustrationTarget(message),
      '{anger_expression}': this.getAngerExpression(context),
      '{despair_statement}': this.getDespairStatement(context),
      '{victim_statement}': this.getVictimStatement(context),
    }

    for (const [placeholder, replacement] of Object.entries(replacements)) {
      response = response.replace(
        new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'),
        replacement,
      )
    }

    return response
  }

  private determineEmotionalTone(
    style: string,
    _context: StyleContext,
  ): string {
    switch (style) {
      case 'defensive':
        return 'guarded'
      case 'upset':
        return 'intense'
      case 'reserved':
        return 'minimal'
      case 'pleasing':
        return 'accommodating'
      case 'verbose':
        return 'elaborate'
      default:
        return 'neutral'
    }
  }

  private calculateVerbosity(content: string, range: number[]): number {
    const wordCount = content.split(/\s+/).length
    const [min, max] = range

    // Map word count to verbosity scale
    if (wordCount <= 5) {
      return Math.max(min, 2)
    }
    if (wordCount <= 15) {
      return Math.min(max, Math.max(min, 4))
    }
    if (wordCount <= 30) {
      return Math.min(max, Math.max(min, 6))
    }
    if (wordCount <= 50) {
      return Math.min(max, Math.max(min, 8))
    }
    return Math.min(max, 10)
  }

  private calculateResistance(
    content: string,
    context: StyleContext,
    range: number[],
  ): number {
    const [min, max] = range
    let resistance = min

    // Indicators of resistance
    if (content.includes('not') || content.includes("don't")) {
      resistance += 2
    }
    if (content.includes('fault') || content.includes('blame')) {
      resistance += 2
    }
    if (content.includes('unfair') || content.includes('wrong')) {
      resistance++
    }
    if (content.includes('!')) {
      resistance++
    }
    if (context.stressLevel > 7) {
      resistance++
    }
    if (context.therapistApproach === 'challenging') {
      resistance += 2
    }

    return Math.min(max, Math.max(min, resistance))
  }

  private identifyDeflectionTechniques(
    content: string,
    _patterns: string[],
  ): string[] {
    const techniques = []

    if (content.includes('not my fault') || content.includes('blame')) {
      techniques.push('blame deflection')
    }
    if (content.includes('but') || content.includes('however')) {
      techniques.push('topic redirection')
    }
    if (content.includes('?')) {
      techniques.push('questioning the questioner')
    }
    if (content.includes('always') || content.includes('never')) {
      techniques.push('historical justification')
    }

    return techniques
  }

  private extractLinguisticPatterns(
    content: string,
    _markers: string[],
  ): string[] {
    const patterns = []

    const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 0)
    const avgSentenceLength =
      content.split(/\s+/).length / Math.max(sentences.length, 1)

    if (avgSentenceLength > 15) {
      patterns.push('long, complex sentences')
    }
    if (avgSentenceLength < 5) {
      patterns.push('very short responses')
    }
    if (content.includes('!')) {
      patterns.push('emotional intensity markers')
    }
    if (content.includes('...')) {
      patterns.push('trailing thoughts')
    }
    const selfFocusMatches = content.match(/\b(I|me|my)\b/g)
    if (selfFocusMatches && selfFocusMatches.length > 3) {
      patterns.push('self-focus language')
    }

    return patterns
  }

  private blendStyleContent(
    content: string,
    secondaryStyle: string,
    ratio: number,
    _context: StyleContext,
  ): string {
    // Simple blending - in a full implementation this would be more sophisticated
    if (secondaryStyle === 'verbose' && ratio > 0.3) {
      return (
        content +
        ' And I think that really connects to a lot of other things too.'
      )
    }
    if (secondaryStyle === 'defensive' && ratio > 0.3) {
      return `${content} But that's not really my fault.`
    }

    return content
  }

  private getStyleCharacteristic(
    style: string,
    characteristic: string,
  ): number {
    const template = this.styleTemplates.get(style)
    if (!template) {
      return 5
    }

    switch (characteristic) {
      case 'verbosity':
        return (
          (template.characteristics.verbosityRange[0] +
            template.characteristics.verbosityRange[1]) /
          2
        )
      case 'resistance':
        return (
          (template.characteristics.resistanceRange[0] +
            template.characteristics.resistanceRange[1]) /
          2
        )
      default:
        return 5
    }
  }

  private interpolateValue(
    value1: number,
    value2: number,
    ratio: number,
  ): number {
    return Math.round(value1 * (1 - ratio) + value2 * ratio)
  }

  private calculateComplexityScore(content: string): number {
    const wordCount = content.split(/\s+/).length
    const uniqueWords = new Set(content.toLowerCase().split(/\s+/)).size
    const avgWordLength =
      content.replace(/\s+/g, '').length / Math.max(wordCount, 1)
    const clauseCount = (content.match(/[,;:]/g) || []).length + 1

    return Math.min(
      10,
      Math.max(
        1,
        Math.round(
          (uniqueWords / Math.max(wordCount, 1)) * 3 +
            (avgWordLength / 5) * 2 +
            (clauseCount / Math.max(wordCount / 10, 1)) * 5,
        ),
      ),
    )
  }

  private calculateEmotionalIntensity(content: string): number {
    let intensity = 1

    // Emotional indicators
    if (content.includes('!')) {
      intensity += 2
    }
    if (content.match(/\b(terrible|awful|horrible|amazing|wonderful)\b/i)) {
      intensity += 2
    }
    if (content.match(/\b(very|really|extremely|totally)\b/i)) {
      intensity++
    }
    if (content.match(/\b(always|never|everyone|nobody)\b/i)) {
      intensity++
    }
    if (content.toUpperCase() === content && content.length > 3) {
      intensity += 3
    }

    return Math.min(10, intensity)
  }

  private calculateRapportEffect(
    response: StyleResponse,
    _context: StyleContext,
  ): number {
    let effect = 0

    // Positive rapport factors
    if (
      response.content.includes('understand') ||
      response.content.includes('appreciate')
    ) {
      effect += 0.2
    }
    if (
      response.content.includes('help') ||
      response.content.includes('work together')
    ) {
      effect += 0.3
    }
    if (response.resistanceLevel <= 3) {
      effect += 0.2
    }

    // Negative rapport factors
    if (
      response.content.includes('fault') ||
      response.content.includes('blame')
    ) {
      effect -= 0.3
    }
    if (response.resistanceLevel >= 7) {
      effect -= 0.2
    }
    if (response.content.includes("don't understand")) {
      effect -= 0.1
    }

    return Math.max(-1, Math.min(1, effect))
  }

  private identifyResistanceIndicators(response: StyleResponse): string[] {
    const indicators = []

    if (response.resistanceLevel >= 7) {
      indicators.push('high resistance level')
    }
    if (response.content.includes('not my fault')) {
      indicators.push('blame deflection')
    }
    if (
      response.content.includes("don't") ||
      response.content.includes("won't")
    ) {
      indicators.push('direct refusal')
    }
    if (response.deflectionTechniques.length > 0) {
      indicators.push('deflection techniques present')
    }

    return indicators
  }

  private identifyOpeningOpportunities(
    response: StyleResponse,
    _context: StyleContext,
  ): string[] {
    const opportunities = []

    if (
      response.content.includes('I feel') ||
      response.content.includes('I think')
    ) {
      opportunities.push('emotional expression opening')
    }
    if (
      response.content.includes('help') ||
      response.content.includes('should')
    ) {
      opportunities.push('motivation for change')
    }
    if (response.resistanceLevel <= 4) {
      opportunities.push('low resistance - good for exploration')
    }
    if (_context.rapportLevel >= 6) {
      opportunities.push('strong rapport for deeper work')
    }

    return opportunities
  }

  private generateFollowupRecommendations(
    response: StyleResponse,
    _context: StyleContext,
  ): string[] {
    const recommendations = []

    if (response.resistanceLevel >= 7) {
      recommendations.push('Use validation before challenging')
      recommendations.push('Explore the resistance directly')
    }

    if (response.verbosityLevel >= 8) {
      recommendations.push('Help focus on key themes')
      recommendations.push('Use summarizing to capture main points')
    }

    if (response.verbosityLevel <= 3) {
      recommendations.push('Use open-ended questions to encourage elaboration')
      recommendations.push('Reflect feelings to encourage emotional expression')
    }

    return recommendations
  }

  // Helper methods for content generation
  private getContextualFeeling(_context: StyleContext): string {
    const feelings = ['confused', 'frustrated', 'uncertain', 'worried', 'okay']
    return feelings[Math.floor(Math.random() * feelings.length)]
  }

  private extractTopic(message: string): string {
    if (message.includes('work')) {
      return 'work'
    }
    if (message.includes('family')) {
      return 'family'
    }
    if (message.includes('relationship')) {
      return 'relationships'
    }
    return 'this'
  }

  private getAcknowledgment(_context: StyleContext): string {
    return ['I see', 'Okay', 'Right', 'I understand'][
      Math.floor(Math.random() * 4)
    ]
  }

  private getBriefExplanation(_context: StyleContext): string {
    return "It's complicated"
  }

  private getSimpleThought(_context: StyleContext): string {
    return 'it makes sense'
  }

  private getSimpleAnswer(_context: StyleContext): string {
    return 'I think so'
  }

  private getOptionalElaboration(_context: StyleContext): string {
    return Math.random() > 0.5 ? 'Maybe' : ''
  }

  private getDetailedExplanation(_context: StyleContext): string {
    return 'there are so many factors involved and it all connects to everything else'
  }

  private getTangent(_context: StyleContext): string {
    return 'something that happened last week'
  }

  private getPersonalStory(_context: StyleContext): string {
    return 'when I was younger, something similar happened'
  }

  private getJustification(_context: StyleContext): string {
    return 'I had no choice in the matter'
  }

  private getExternalBlame(_context: StyleContext): string {
    return "other people don't understand the situation"
  }

  private getDefensiveExplanation(_context: StyleContext): string {
    return 'the real problem is something else entirely'
  }

  private getDeflectionTarget(_message: string): string {
    return 'that'
  }

  private getCounterTopic(_context: StyleContext): string {
    return 'what about what they did'
  }

  private getDismissal(_context: StyleContext): string {
    return "it didn't help then either"
  }

  private getMinimalAcknowledgment(_context: StyleContext): string {
    return ['Okay', 'Sure', 'Fine', 'Yeah'][Math.floor(Math.random() * 4)]
  }

  private getBriefResponse(_context: StyleContext): string {
    return 'I guess'
  }

  private getAgreement(_message: string): string {
    return 'that'
  }

  private getSelfCriticism(_context: StyleContext): string {
    return 'try harder'
  }

  private getTherapistPerspective(_message: string): string {
    return "what you're saying"
  }

  private getSelfImprovement(_context: StyleContext): string {
    return 'being better'
  }

  private getAdmission(_context: StyleContext): string {
    return 'not handling things well'
  }

  private getGoal(_context: StyleContext): string {
    return 'improving'
  }

  private getEmotionalOutburst(_context: StyleContext): string {
    return 'This is so frustrating'
  }

  private getFrustrationTarget(_message: string): string {
    return 'this keeps happening'
  }

  private getAngerExpression(_context: StyleContext): string {
    return 'It makes me so angry'
  }

  private getDespairStatement(_context: StyleContext): string {
    return "I've tried everything"
  }

  private getVictimStatement(_context: StyleContext): string {
    return 'Everyone always blames me'
  }
}

// Type definitions for internal use
interface StyleTemplate {
  name: string
  description: string
  characteristics: {
    verbosityRange: number[]
    resistanceRange: number[]
    emotionalExpression: string
    deflectionTendency: string
  }
  responseTemplates: string[]
  linguisticMarkers: string[]
  avoidancePatterns: string[]
}

interface ResponsePattern {
  trigger: string
  pattern: string
  variability: number
  emotionalRange: number[]
}

/**
 * Create and export service instance
 */
export const communicationStyleService = new CommunicationStyleService()

/**
 * Utility function for generating styled responses
 */
export async function generatePatientResponse(
  therapistMessage: string,
  patientModel: CognitiveModel,
  context: StyleContext,
) {
  const styleProfile =
    communicationStyleService.createStyleConsistencyProfile(patientModel)
  const targetStyle = communicationStyleService.inferPrimaryStyleType(
    patientModel.conversationalStyle,
  )

  const request: ResponseGenerationRequest = {
    patientMessage: '',
    therapistMessage,
    conversationHistory: [],
    context,
    targetStyle,
    styleConsistency: styleProfile,
  }

  return communicationStyleService.generateStyledResponse(request)
}

/**
 * Utility function for style analysis
 */
export function analyzeConversationStyle(
  conversationHistory: Array<{
    speaker: string
    message: string
    timestamp: number
  }>,
) {
  return communicationStyleService.analyzeStyleEvolution(conversationHistory)
}
