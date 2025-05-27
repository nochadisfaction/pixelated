/**
 * Personalization Service
 *
 * This service provides personalization capabilities for therapeutic recommendations,
 * adapting techniques based on client preferences, history, and characteristics.
 */

/**
 * Options for adapting therapeutic techniques
 */
export interface AdaptationOptions {
  /**
   * Priority for client preferences (0-1)
   */
  preferenceWeight?: number

  /**
   * Priority for past efficacy (0-1)
   */
  efficacyWeight?: number

  /**
   * Priority for client characteristics (0-1)
   */
  characteristicsWeight?: number

  /**
   * Minimum adaptation threshold (0-1)
   * Only adaptations with score above this threshold will be applied
   */
  adaptationThreshold?: number
}

/**
 * Options for personalization layers
 */
export interface PersonalizationLayerOptions {
  /**
   * List of strategies to apply
   */
  strategies?: PersonalizationStrategy[]

  /**
   * Minimum personalization score to apply adaptations
   */
  minPersonalizationScore?: number

  /**
   * Maximum adaptations per technique
   */
  maxAdaptationsPerTechnique?: number
}

/**
 * Personalization strategy type
 */
export type PersonalizationStrategy =
  | 'preference-based'
  | 'efficacy-based'
  | 'characteristics-based'
  | 'learning-style'
  | 'cognitive-level'
  | 'cultural'
  | 'age-appropriate'

/**
 * Adapted technique with personalization
 */
export interface TechniqueAdaptation {
  /**
   * Original technique ID
   */
  techniqueId: string

  /**
   * Personalized instructions
   */
  personalizedInstructions?: string

  /**
   * Personalized description
   */
  personalizedDescription?: string

  /**
   * Recommended modifications
   */
  modifications?: string[]

  /**
   * Client-specific examples
   */
  examples?: string[]

  /**
   * Media recommendations
   */
  mediaRecommendations?: string[]

  /**
   * Personalization score (0-1)
   */
  personalizationScore: number

  /**
   * Strategies used for personalization
   */
  strategies: PersonalizationStrategy[]

  /**
   * Adaptation timestamp
   */
  createdAt: Date
}

/**
 * Interface for personalization service
 */
export interface PersonalizationService {
  /**
   * Create personalization factors from client profile
   */
  createPersonalizationFactors(clientId: string): Promise<{
    clientPreferences?: string[]
    pastTechniqueEfficacy?: Record<string, number>
    clientCharacteristics?: Record<string, unknown>
    treatmentHistory?: string[]
  }>

  /**
   * Apply personalization layer to recommendations
   */
  applyPersonalizationLayer(
    clientId: string,
    recommendations: any[],
    options?: PersonalizationLayerOptions,
  ): Promise<{
    personalizedRecommendations: any[]
    techniqueAdaptations: Map<string, TechniqueAdaptation>
    personalizationMetrics: {
      personalizationScore: number
      strategies: PersonalizationStrategy[]
    }
  }>

  /**
   * Get available personalization strategies
   */
  getPersonalizationStrategies(): Promise<PersonalizationStrategy[]>

  /**
   * Get technique adaptations
   */
  getTechniqueAdaptations(): Promise<Map<string, TechniqueAdaptation>>
}
