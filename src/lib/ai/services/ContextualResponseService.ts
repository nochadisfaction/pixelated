/**
 * Contextual Response Enhancement Service
 *
 * Integrates patient history, situation recognition, and temporal context awareness
 * for more realistic and therapeutically appropriate responses in Patient-Psi simulations
 */

import { z } from 'zod'
import type { CognitiveModel } from '../types/CognitiveModel'

// Context schemas
const HistoryContextSchema = z.object({
  previousSessions: z.array(
    z.object({
      sessionId: z.string(),
      date: z.string(),
      mainTopics: z.array(z.string()),
      emotionalTone: z.string(),
      therapeuticProgress: z.number().min(0).max(10),
      keyInsights: z.array(z.string()),
      unresolved: z.array(z.string()),
    }),
  ),
  recurringThemes: z.array(
    z.object({
      theme: z.string(),
      frequency: z.number(),
      lastMentioned: z.string(),
      emotionalAssociation: z.string(),
      progressLevel: z.number(),
    }),
  ),
  relationshipPattern: z.object({
    trustLevel: z.number().min(0).max(10),
    rapportBuilding: z.enum([
      'initial',
      'developing',
      'established',
      'strained',
    ]),
    therapistPerception: z.enum([
      'helpful',
      'neutral',
      'intrusive',
      'incompetent',
    ]),
    cooperationLevel: z.number().min(0).max(10),
  }),
})

const SituationContextSchema = z.object({
  currentSituation: z.object({
    type: z.enum([
      'therapy_session',
      'crisis',
      'assessment',
      'check_in',
      'termination',
    ]),
    intensity: z.number().min(1).max(10),
    timeOfDay: z.enum(['morning', 'afternoon', 'evening', 'night']),
    dayOfWeek: z.enum([
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ]),
    environmentalFactors: z.array(z.string()),
  }),
  recentEvents: z.array(
    z.object({
      event: z.string(),
      timeframe: z.enum([
        'today',
        'yesterday',
        'this_week',
        'last_week',
        'this_month',
      ]),
      impact: z.number().min(-10).max(10),
      category: z.enum([
        'work',
        'relationships',
        'health',
        'finances',
        'family',
        'other',
      ]),
    }),
  ),
  triggeredMemories: z.array(
    z.object({
      memory: z.string(),
      relevance: z.number().min(0).max(1),
      emotionalCharge: z.number().min(-10).max(10),
      coping: z.enum(['adaptive', 'maladaptive', 'neutral']),
    }),
  ),
})

const TemporalContextSchema = z.object({
  sessionProgression: z.object({
    sessionNumber: z.number(),
    sessionDuration: z.number(), // minutes
    timeRemaining: z.number(), // minutes
    phase: z.enum([
      'opening',
      'exploration',
      'working',
      'processing',
      'closure',
    ]),
  }),
  therapyJourney: z.object({
    totalSessions: z.number(),
    treatmentPhase: z.enum([
      'assessment',
      'stabilization',
      'processing',
      'integration',
      'maintenance',
    ]),
    milestonesAchieved: z.array(z.string()),
    currentGoals: z.array(z.string()),
    progressTrajectory: z.enum([
      'improving',
      'stable',
      'declining',
      'fluctuating',
    ]),
  }),
  beliefEvolution: z.array(
    z.object({
      beliefId: z.string(),
      strengthHistory: z.array(
        z.object({
          date: z.string(),
          strength: z.number(),
          context: z.string(),
        }),
      ),
      changeDirection: z.enum([
        'strengthening',
        'weakening',
        'stable',
        'fluctuating',
      ]),
      changeRate: z.number(), // per session
    }),
  ),
})

const ResponseContextSchema = z.object({
  historyContext: HistoryContextSchema,
  situationContext: SituationContextSchema,
  temporalContext: TemporalContextSchema,
  therapeuticAlliance: z.object({
    workingAlliance: z.number().min(0).max(10),
    taskAgreement: z.number().min(0).max(10),
    goalConsensus: z.number().min(0).max(10),
    bondStrength: z.number().min(0).max(10),
  }),
})

const ContextualResponseSchema = z.object({
  baseResponse: z.string(),
  contextualModifications: z.array(
    z.object({
      type: z.enum([
        'history_reference',
        'situation_acknowledgment',
        'temporal_connection',
        'progress_noting',
      ]),
      modification: z.string(),
      rationale: z.string(),
      therapeuticValue: z.number().min(0).max(1),
    }),
  ),
  enhancedResponse: z.string(),
  contextualCues: z.object({
    historyReferences: z.array(z.string()),
    situationalAdaptations: z.array(z.string()),
    temporalConnections: z.array(z.string()),
    progressIndications: z.array(z.string()),
  }),
  therapeuticImpact: z.object({
    allianceEffect: z.number().min(-1).max(1),
    trustBuilding: z.number().min(-1).max(1),
    insightPotential: z.number().min(0).max(1),
    continuityStrength: z.number().min(0).max(1),
  }),
})

export type HistoryContext = z.infer<typeof HistoryContextSchema>
export type SituationContext = z.infer<typeof SituationContextSchema>
export type TemporalContext = z.infer<typeof TemporalContextSchema>
export type ResponseContext = z.infer<typeof ResponseContextSchema>
export type ContextualResponse = z.infer<typeof ContextualResponseSchema>

export interface ContextualEnhancementOptions {
  includeHistory: boolean
  situationAwareness: boolean
  temporalTracking: boolean
  progressReflection: boolean
  adaptiveMemory: boolean
  minRelevanceThreshold: number
}

/**
 * Contextual Response Enhancement Service
 */
export class ContextualResponseService {
  private memoryCache: Map<string, HistoryContext> = new Map()
  private situationPatterns: Map<string, SituationContext[]> = new Map()
  private beliefTracker: Map<string, TemporalContext['beliefEvolution']> =
    new Map()

  constructor() {
    this.initializePatternDatabase()
  }

  /**
   * Enhance a response with contextual information
   */
  async enhanceResponse(
    baseResponse: string,
    cognitiveModel: CognitiveModel,
    context: ResponseContext,
    options: ContextualEnhancementOptions = {
      includeHistory: true,
      situationAwareness: true,
      temporalTracking: true,
      progressReflection: true,
      adaptiveMemory: true,
      minRelevanceThreshold: 0.3,
    },
  ): Promise<ContextualResponse> {
    try {
      const modifications: ContextualResponse['contextualModifications'] = []

      // Apply history-based modifications
      if (options.includeHistory) {
        const historyMods = await this.applyHistoryContext(
          baseResponse,
          context.historyContext,
          cognitiveModel,
          options.minRelevanceThreshold,
        )
        modifications.push(...historyMods)
      }

      // Apply situation-based modifications
      if (options.situationAwareness) {
        const situationMods = await this.applySituationContext(
          baseResponse,
          context.situationContext,
          cognitiveModel,
        )
        modifications.push(...situationMods)
      }

      // Apply temporal modifications
      if (options.temporalTracking) {
        const temporalMods = await this.applyTemporalContext(
          baseResponse,
          context.temporalContext,
          cognitiveModel,
        )
        modifications.push(...temporalMods)
      }

      // Apply therapeutic progress modifications
      if (options.progressReflection) {
        const progressMods = await this.applyProgressContext(
          baseResponse,
          context,
          cognitiveModel,
        )
        modifications.push(...progressMods)
      }

      // Generate enhanced response
      const enhancedResponse = await this.integrateModifications(
        baseResponse,
        modifications,
      )

      // Calculate therapeutic impact
      const therapeuticImpact = this.calculateTherapeuticImpact(
        modifications,
        context,
      )

      // Extract contextual cues
      const contextualCues = this.extractContextualCues(modifications)

      return ContextualResponseSchema.parse({
        baseResponse,
        contextualModifications: modifications,
        enhancedResponse,
        contextualCues,
        therapeuticImpact,
      })
    } catch (error) {
      console.error('Error enhancing response:', error)
      throw new Error(
        `Failed to enhance response: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  /**
   * Build context from conversation history and patient data
   */
  async buildResponseContext(
    conversationHistory: Array<{
      speaker: string
      message: string
      timestamp: number
    }>,
    cognitiveModel: CognitiveModel,
    sessionInfo: {
      sessionNumber: number
      sessionDuration: number
      timeRemaining: number
      currentPhase: string
    },
  ): Promise<ResponseContext> {
    const historyContext = await this.buildHistoryContext(
      conversationHistory,
      cognitiveModel,
    )
    const situationContext = await this.buildSituationContext(
      conversationHistory,
      sessionInfo,
    )
    const temporalContext = await this.buildTemporalContext(
      cognitiveModel,
      sessionInfo,
    )
    const therapeuticAlliance = this.assessTherapeuticAlliance(
      conversationHistory,
      historyContext,
    )

    return ResponseContextSchema.parse({
      historyContext,
      situationContext,
      temporalContext,
      therapeuticAlliance,
    })
  }

  /**
   * Analyze conversation patterns for contextual insights
   */
  analyzeConversationPatterns(
    history: Array<{ speaker: string; message: string; timestamp: number }>,
  ): {
    recurringThemes: string[]
    emotionalProgression: Array<{
      timestamp: number
      emotion: string
      intensity: number
    }>
    engagementLevel: number
    resistancePatterns: string[]
  } {
    const patientMessages = history.filter((msg) => msg.speaker === 'patient')

    // Analyze recurring themes
    const recurringThemes = this.extractRecurringThemes(patientMessages)

    // Track emotional progression
    const emotionalProgression = this.trackEmotionalProgression(patientMessages)

    // Calculate engagement level
    const engagementLevel = this.calculateEngagementLevel(patientMessages)

    // Identify resistance patterns
    const resistancePatterns = this.identifyResistancePatterns(patientMessages)

    return {
      recurringThemes,
      emotionalProgression,
      engagementLevel,
      resistancePatterns,
    }
  }

  // Private helper methods
  private async applyHistoryContext(
    response: string,
    historyContext: HistoryContext,
    model: CognitiveModel,
    threshold: number,
  ) {
    const modifications: ContextualResponse['contextualModifications'] = []

    // Check for relevant recurring themes
    for (const theme of historyContext.recurringThemes) {
      if (
        this.isThemeRelevantToResponse(response, theme.theme) &&
        theme.frequency >= threshold * 10
      ) {
        const daysSinceLastMention = this.calculateDaysSince(
          theme.lastMentioned,
        )

        if (daysSinceLastMention > 7) {
          // Theme hasn't been discussed recently
          modifications.push({
            type: 'history_reference',
            modification: `I remember we talked about ${theme.theme.toLowerCase()} before...`,
            rationale: `Recurring theme not addressed recently - therapeutic continuity`,
            therapeuticValue: 0.7,
          })
        }
      }
    }

    // Reference previous unresolved issues if relevant
    const recentSession = historyContext.previousSessions[0]
    if (recentSession?.unresolved.length > 0) {
      for (const unresolved of recentSession.unresolved) {
        if (this.isThemeRelevantToResponse(response, unresolved)) {
          modifications.push({
            type: 'history_reference',
            modification: `This relates to what we were discussing last time about ${unresolved.toLowerCase()}...`,
            rationale: 'Addressing unresolved issues from previous session',
            therapeuticValue: 0.8,
          })
        }
      }
    }

    return modifications
  }

  private async applySituationContext(
    response: string,
    situationContext: SituationContext,
    model: CognitiveModel,
  ) {
    const modifications: ContextualResponse['contextualModifications'] = []

    // Acknowledge recent significant events
    for (const event of situationContext.recentEvents) {
      if (Math.abs(event.impact) >= 7) {
        // High impact event
        modifications.push({
          type: 'situation_acknowledgment',
          modification: `Given what happened ${event.timeframe.replace('_', ' ')} with ${event.event.toLowerCase()}...`,
          rationale: `Acknowledging high-impact recent event (${event.impact})`,
          therapeuticValue: 0.6,
        })
      }
    }

    // Adapt to current situation intensity
    if (situationContext.currentSituation.intensity >= 8) {
      modifications.push({
        type: 'situation_acknowledgment',
        modification: `I can see this is really intense for you right now...`,
        rationale: 'Validating high emotional intensity',
        therapeuticValue: 0.5,
      })
    }

    return modifications
  }

  private async applyTemporalContext(
    response: string,
    temporalContext: TemporalContext,
    model: CognitiveModel,
  ) {
    const modifications: ContextualResponse['contextualModifications'] = []

    // Note progress on beliefs if significant change detected
    for (const beliefEvol of temporalContext.beliefEvolution) {
      if (Math.abs(beliefEvol.changeRate) >= 0.5) {
        // Significant change
        const direction = beliefEvol.changeDirection
        modifications.push({
          type: 'temporal_connection',
          modification: `I've noticed your feelings about this have been ${direction === 'weakening' ? 'shifting' : 'evolving'} over our sessions...`,
          rationale: `Tracking belief evolution: ${direction}`,
          therapeuticValue: 0.9,
        })
      }
    }

    // Acknowledge therapy phase appropriately
    const phase = temporalContext.therapyJourney.treatmentPhase
    if (
      phase === 'processing' &&
      temporalContext.sessionProgression.phase === 'working'
    ) {
      modifications.push({
        type: 'temporal_connection',
        modification: `As we continue to work through these deeper issues...`,
        rationale: 'Acknowledging processing phase work',
        therapeuticValue: 0.4,
      })
    }

    return modifications
  }

  private async applyProgressContext(
    response: string,
    context: ResponseContext,
    model: CognitiveModel,
  ) {
    const modifications: ContextualResponse['contextualModifications'] = []

    // Note therapeutic alliance strength
    if (context.therapeuticAlliance.workingAlliance >= 8) {
      modifications.push({
        type: 'progress_noting',
        modification: `I feel like we're really working well together on this...`,
        rationale: 'Strong therapeutic alliance acknowledgment',
        therapeuticValue: 0.3,
      })
    }

    // Reference achieved milestones if relevant
    const milestones = context.temporalContext.therapyJourney.milestonesAchieved
    if (milestones.length > 0) {
      const recentMilestone = milestones[milestones.length - 1]
      if (this.isThemeRelevantToResponse(response, recentMilestone)) {
        modifications.push({
          type: 'progress_noting',
          modification: `Building on the progress you've made with ${recentMilestone.toLowerCase()}...`,
          rationale: 'Reinforcing recent therapeutic gains',
          therapeuticValue: 0.8,
        })
      }
    }

    return modifications
  }

  private async integrateModifications(
    baseResponse: string,
    modifications: ContextualResponse['contextualModifications'],
  ): Promise<string> {
    if (modifications.length === 0) {
      // Even without explicit modifications, add some basic contextual awareness
      return `${baseResponse} I want to make sure we're connecting this to your overall experience.`
    }

    // Sort modifications by therapeutic value (highest first)
    const sortedMods = modifications.sort(
      (a, b) => b.therapeuticValue - a.therapeuticValue,
    )

    // Select top 2-3 modifications to avoid overwhelming the response
    const selectedMods = sortedMods.slice(0, Math.min(3, sortedMods.length))

    // Integrate modifications naturally
    let enhancedResponse = baseResponse

    for (const mod of selectedMods) {
      if (
        mod.type === 'history_reference' ||
        mod.type === 'temporal_connection'
      ) {
        enhancedResponse = `${mod.modification} ${enhancedResponse}`
      } else {
        enhancedResponse = `${enhancedResponse} ${mod.modification}`
      }
    }

    return enhancedResponse
  }

  private calculateTherapeuticImpact(
    modifications: ContextualResponse['contextualModifications'],
    context: ResponseContext,
  ) {
    const historyRefs = modifications.filter(
      (m) => m.type === 'history_reference',
    ).length
    const progressNotes = modifications.filter(
      (m) => m.type === 'progress_noting',
    ).length
    const temporalConnections = modifications.filter(
      (m) => m.type === 'temporal_connection',
    ).length

    return {
      allianceEffect: Math.min(
        1,
        (historyRefs * 0.2 + progressNotes * 0.3) / 2,
      ),
      trustBuilding: Math.min(
        1,
        (historyRefs * 0.3 + temporalConnections * 0.2) / 2,
      ),
      insightPotential: Math.min(1, temporalConnections * 0.4),
      continuityStrength: Math.min(
        1,
        (historyRefs + temporalConnections) * 0.2,
      ),
    }
  }

  private extractContextualCues(
    modifications: ContextualResponse['contextualModifications'],
  ) {
    return {
      historyReferences: modifications
        .filter((m) => m.type === 'history_reference')
        .map((m) => m.modification),
      situationalAdaptations: modifications
        .filter((m) => m.type === 'situation_acknowledgment')
        .map((m) => m.modification),
      temporalConnections: modifications
        .filter((m) => m.type === 'temporal_connection')
        .map((m) => m.modification),
      progressIndications: modifications
        .filter((m) => m.type === 'progress_noting')
        .map((m) => m.modification),
    }
  }

  // Additional helper methods (simplified implementations)
  private async buildHistoryContext(
    history: Array<{ speaker: string; message: string; timestamp: number }>,
    model: CognitiveModel,
  ): Promise<HistoryContext> {
    // Implementation for building history context
    return HistoryContextSchema.parse({
      previousSessions: [],
      recurringThemes: [],
      relationshipPattern: {
        trustLevel: 5,
        rapportBuilding: 'developing',
        therapistPerception: 'helpful',
        cooperationLevel: 6,
      },
    })
  }

  private async buildSituationContext(
    history: Array<{ speaker: string; message: string; timestamp: number }>,
    sessionInfo: any,
  ): Promise<SituationContext> {
    return SituationContextSchema.parse({
      currentSituation: {
        type: 'therapy_session',
        intensity: 5,
        timeOfDay: 'afternoon',
        dayOfWeek: 'wednesday',
        environmentalFactors: [],
      },
      recentEvents: [],
      triggeredMemories: [],
    })
  }

  private async buildTemporalContext(
    model: CognitiveModel,
    sessionInfo: any,
  ): Promise<TemporalContext> {
    return TemporalContextSchema.parse({
      sessionProgression: {
        sessionNumber: sessionInfo.sessionNumber || 1,
        sessionDuration: sessionInfo.sessionDuration || 50,
        timeRemaining: sessionInfo.timeRemaining || 30,
        phase: 'working',
      },
      therapyJourney: {
        totalSessions: 1,
        treatmentPhase: 'assessment',
        milestonesAchieved: [],
        currentGoals: [],
        progressTrajectory: 'stable',
      },
      beliefEvolution: [],
    })
  }

  private assessTherapeuticAlliance(
    history: Array<{ speaker: string; message: string; timestamp: number }>,
    historyContext: HistoryContext,
  ) {
    return {
      workingAlliance: 6,
      taskAgreement: 7,
      goalConsensus: 6,
      bondStrength: 5,
    }
  }

  private extractRecurringThemes(
    messages: Array<{ message: string }>,
  ): string[] {
    // Enhanced keyword-based theme extraction
    const themePatterns: Record<string, string[]> = {
      anxiety: ['anxiety', 'anxious', 'worry', 'worried', 'nervous', 'stress'],
      depression: [
        'depression',
        'depressed',
        'sad',
        'sadness',
        'down',
        'hopeless',
      ],
      relationships: [
        'relationship',
        'relationships',
        'friend',
        'friends',
        'dating',
        'partner',
      ],
      work: [
        'work',
        'job',
        'career',
        'workplace',
        'office',
        'boss',
        'presentation',
      ],
      family: ['family', 'parent', 'parents', 'mother', 'father', 'sibling'],
      anger: ['anger', 'angry', 'mad', 'furious', 'rage', 'irritated'],
      sadness: ['sad', 'sadness', 'grief', 'mourning', 'sorrow', 'tearful'],
    }

    const detectedThemes: string[] = []

    for (const [theme, patterns] of Object.entries(themePatterns)) {
      const found = messages.some((msg) => {
        const messageText = msg.message.toLowerCase()
        return patterns.some((pattern) => messageText.includes(pattern))
      })

      if (found) {
        detectedThemes.push(theme)
      }
    }

    return detectedThemes
  }

  private trackEmotionalProgression(
    messages: Array<{ message: string; timestamp: number }>,
  ) {
    return messages.map((msg) => ({
      timestamp: msg.timestamp,
      emotion: 'neutral', // Simplified - would use emotion detection
      intensity: 5,
    }))
  }

  private calculateEngagementLevel(
    messages: Array<{ message: string }>,
  ): number {
    const avgLength =
      messages.reduce((sum, msg) => sum + msg.message.length, 0) /
      messages.length
    return Math.min(10, avgLength / 10) // Simplified metric
  }

  private identifyResistancePatterns(
    messages: Array<{ message: string }>,
  ): string[] {
    const resistanceIndicators = [
      "i don't know",
      'maybe',
      'i guess',
      'whatever',
    ]
    const patterns: string[] = []

    for (const indicator of resistanceIndicators) {
      const count = messages.filter((msg) =>
        msg.message.toLowerCase().includes(indicator),
      ).length

      if (count >= 2) {
        patterns.push(`frequent_${indicator.replace(/\s+/g, '_')}`)
      }
    }

    return patterns
  }

  private isThemeRelevantToResponse(response: string, theme: string): boolean {
    const responseWords = response.toLowerCase().split(/\s+/)
    const themeWords = theme.toLowerCase().split(/\s+/)

    // Check for direct keyword matches
    for (const themeWord of themeWords) {
      for (const responseWord of responseWords) {
        // Direct match or partial match (for related words)
        if (
          responseWord.includes(themeWord) ||
          themeWord.includes(responseWord)
        ) {
          return true
        }
      }
    }

    // Check for semantic relevance (simplified approach)
    const semanticMappings: Record<string, string[]> = {
      fear: ['anxiety', 'worry', 'concern', 'afraid'],
      failure: ['performance', 'work', 'success', 'achievement'],
      rejection: ['relationships', 'social', 'acceptance', 'love'],
      explore: ['discuss', 'talk', 'understand', 'examine'],
      feelings: ['emotions', 'mood', 'emotional', 'feel'],
    }

    for (const [responseKey, themeCategories] of Object.entries(
      semanticMappings,
    )) {
      if (response.toLowerCase().includes(responseKey)) {
        if (
          themeCategories.some((category) =>
            theme.toLowerCase().includes(category),
          )
        ) {
          return true
        }
      }
    }

    return false
  }

  private calculateDaysSince(dateString: string): number {
    const date = new Date(dateString)
    const now = new Date()
    return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  }

  private initializePatternDatabase(): void {
    // Initialize pattern recognition database
    console.log('Contextual Response Service initialized')
  }
}

/**
 * Create and export service instance
 */
export const contextualResponseService = new ContextualResponseService()

/**
 * Utility function for quick contextual enhancement
 */
export async function enhanceResponseWithContext(
  response: string,
  cognitiveModel: CognitiveModel,
  conversationHistory: Array<{
    speaker: string
    message: string
    timestamp: number
  }>,
  sessionInfo: {
    sessionNumber: number
    sessionDuration: number
    timeRemaining: number
    currentPhase: string
  },
) {
  const context = await contextualResponseService.buildResponseContext(
    conversationHistory,
    cognitiveModel,
    sessionInfo,
  )

  return contextualResponseService.enhanceResponse(
    response,
    cognitiveModel,
    context,
  )
}
