import { getLogger } from '../../utils/logger'
import type { AIRepository } from '../../db/ai/repository'
import type { EfficacyTrackingService } from './EfficacyTrackingService'
import type { IRedisService } from '../../services/redis/types'
import type {
  ClientSession,
  TherapeuticTechnique,
} from './RecommendationService'
import type {
  PersonalizationService,
  PersonalizationStrategy,
  TechniqueAdaptation,
  PersonalizationLayerOptions,
} from './PersonalizationService'
import type { PersonalizationLayerConfig } from './PersonalizationLayerFactory'
import { EmotionAnalysis } from '../AIService'
import type { ContextManager } from '../context/ContextManager'
import type {
  SessionHistoryContextValue,
  InterventionHistoryLogItem,
  PastTechniqueHistoryItem,
} from '../context/ContextTypes'
import type { InterventionAnalysisResult } from '../../db/ai/types'

// Define the client preference profile
export interface ClientPreferenceProfile {
  clientId: string
  preferences: {
    learningStyle?:
      | 'visual'
      | 'auditory'
      | 'kinesthetic'
      | 'reading/writing'
      | 'unknown'
    communicationStyle?:
      | 'direct'
      | 'indirect'
      | 'analytical'
      | 'intuitive'
      | 'emotional'
      | 'practical'
    preferredApproaches?: string[]
    avoidedApproaches?: string[]
    preferredMedia?: string[]
  }
  characteristics: Record<string, boolean | number | string>
  demographic?: {
    culture?: string
    age?: number
    language?: string
  }
  history: {
    pastTechniques: Array<{
      techniqueId: string
      techniqueName: string
      lastUsed: Date
      efficacy: number
      usageCount: number
    }>
  }
  lastUpdated: Date
}

// Define media recommendation type
interface MediaRecommendation {
  type: 'video' | 'audio' | 'image' | 'text' | 'interactive'
  title: string
  description: string
  url?: string
}

// Extend TherapeuticTechnique interface to define the type of technique objects
interface TechniqueReference {
  id: string
  name: string
  description?: string
  // Add other properties that are actually used
}

// Extended therapeutic technique interface to include all the properties used in this service
interface ExtendedTherapeuticTechnique extends TherapeuticTechnique {
  categories?: string[]
  timeRequired?: string
  suitableFor?: string[]
  complexity?: string
  efficacyRating: number
  title?: string
  indicatedFor: string[] // Used in getMediaRecommendationsForLearningStyle
  techniques?: TechniqueReference[] // Change from string[] to array of objects with id
}

// Extended adaptation type for internal use
interface AdaptedTechnique extends TechniqueAdaptation {
  name: string
  steps: string[]
  explanation: string
  explanationStyle: string
  description: string
  adaptationFactors?: string[]
  adaptationReason?: string
}

// Context information for personalization
interface PersonalizationContext {
  sessionType?: string
  clientMood?: string
  previousTechniques?: string[]
  currentGoals?: string[]
  sessionNumber?: number
  timeOfDay?: string
  therapistNotes?: string
}

// Client profile interface for repository queries
export interface ClientProfile {
  preferences?: {
    learningStyle?:
      | 'visual'
      | 'auditory'
      | 'kinesthetic'
      | 'reading/writing'
      | 'unknown'
    communicationStyle?:
      | 'direct'
      | 'indirect'
      | 'analytical'
      | 'intuitive'
      | 'emotional'
      | 'practical'
    preferredApproaches?: string[]
    avoidedApproaches?: string[]
    preferredMedia?: string[]
  }
  characteristics?: Record<string, boolean | number | string>
  demographic?: {
    culture?: string
    age?: number
    language?: string
  }
  history?: {
    pastTechniques: Array<{
      techniqueId: string
      techniqueName: string
      lastUsed: Date
      efficacy: number
      usageCount: number
    }>
  }
}

// Define ActiveSession based on usage in getSessionContext
interface ActiveSession {
  type: string
  mood: string
  techniques?: string[]
  goals?: string[]
  sessionNumber?: number
  timeOfDay?: string
  notes?: string
  // Add other potential properties if necessary
}

// Extend AIRepository to include the client profile method
export interface ExtendedAIRepository extends AIRepository {
  getClientProfile(clientId: string): Promise<ClientProfile | null>
  getActiveSession?(clientId: string): Promise<ActiveSession | null>
}

// Extended EfficacyTrackingService to include the trackTechniqueAdaptation method
export interface ExtendedEfficacyTrackingService
  extends EfficacyTrackingService {
  trackTechniqueAdaptation?(
    clientId: string,
    techniqueId: string,
    strategies: PersonalizationStrategy[],
    personalizationScore: number,
  ): Promise<void>
}

const logger = getLogger('personalization-service')

/**
 * Implementation of the PersonalizationService interface
 */
export class PersonalizationServiceImpl implements PersonalizationService {
  private adaptationCache = new Map<string, TechniqueAdaptation>()
  private mlModelsInitialized = false
  private lastRefreshTimestamp = Date.now()
  private layerConfiguration: PersonalizationLayerConfig = {
    layerType: 'standard',
    enabledStrategies: [
      'preference-based',
      'efficacy-based',
      'characteristics-based',
    ],
    weights: {
      preference: 0.3,
      efficacy: 0.4,
      characteristics: 0.2,
      contextual: 0.1,
      learning: 0.2,
    },
    options: {
      adaptationThreshold: 0.3,
      maxAdaptationsPerTechnique: 3,
      useMLRecommendations: false,
      cacheDuration: 3600, // 1 hour
      refreshInterval: 24, // 24 hours
    },
    features: {
      dynamicExamples: false,
      mediaRecommendations: true,
      adaptiveInstructions: true,
      progressiveComplexity: false,
      clientFeedbackLoop: true,
    },
  }

  // Cast repository to ExtendedAIRepository
  private extendedRepository: ExtendedAIRepository
  private extendedEfficacyService: ExtendedEfficacyTrackingService

  constructor(
    repository: AIRepository,
    efficacyTrackingService: EfficacyTrackingService,
    private redisService: IRedisService,
  ) {
    this.extendedRepository = repository as ExtendedAIRepository
    this.extendedEfficacyService =
      efficacyTrackingService as ExtendedEfficacyTrackingService
    logger.info('PersonalizationService initialized')
  }

  /**
   * Set personalization layer configuration
   */
  setLayerConfiguration(config: PersonalizationLayerConfig): void {
    this.layerConfiguration = config
    const { layerType, enabledStrategies } = config
    logger.info('Personalization layer configuration updated', {
      layerType,
      strategies: enabledStrategies,
    })

    // Initialize ML models if needed
    if (config.options.useMLRecommendations && !this.mlModelsInitialized) {
      this.initializeMLModels()
    }
  }

  /**
   * Initialize machine learning models for recommendations
   */
  private async initializeMLModels(): Promise<void> {
    logger.info('Initializing ML models for personalization')
    try {
      // Connection to ML model server
      const RECOMMENDATION_MODEL_ENDPOINT =
        process.env.RECOMMENDATION_MODEL_ENDPOINT ||
        'http://ml-models-service/recommendation-model'
      const EFFICACY_PREDICTION_MODEL_ENDPOINT =
        process.env.EFFICACY_PREDICTION_MODEL_ENDPOINT ||
        'http://ml-models-service/efficacy-prediction-model'
      const PERSONALIZATION_MODEL_ENDPOINT =
        process.env.PERSONALIZATION_MODEL_ENDPOINT ||
        'http://ml-models-service/personalization-model'

      // Initialize connection to ML model service
      const modelLoadingPromises = [
        this.loadModel(RECOMMENDATION_MODEL_ENDPOINT, 'recommendation'),
        this.loadModel(
          EFFICACY_PREDICTION_MODEL_ENDPOINT,
          'efficacyPrediction',
        ),
        this.loadModel(PERSONALIZATION_MODEL_ENDPOINT, 'personalization'),
      ]

      // Wait for all models to load
      await Promise.all(modelLoadingPromises)

      // Set the flag after successful initialization
      this.mlModelsInitialized = true
      logger.info('ML models initialized successfully')
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      logger.error('Failed to initialize ML models', { error })
      throw new Error(`ML model initialization failed: ${errorMessage}`)
    }
  }

  /**
   * Load a specific ML model
   */
  private async loadModel(endpoint: string, modelType: string): Promise<void> {
    try {
      // Use fetch API to check model health and load status
      const response = await fetch(`${endpoint}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.ML_SERVICE_API_KEY || '',
        },
      })

      if (!response.ok) {
        throw new Error(
          `Failed to load ${modelType} model. Status: ${response.status}`,
        )
      }

      const modelHealth = await response.json()

      // Validate model version
      if (
        modelHealth.version < this.getMinimumRequiredModelVersion(modelType)
      ) {
        logger.warn(
          `${modelType} model version (${modelHealth.version}) is below minimum required version. Performance may be degraded.`,
        )
      }

      logger.info(`${modelType} model loaded successfully`, {
        modelVersion: modelHealth.version,
        modelMetrics: modelHealth.metrics,
      })
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      logger.error(`Error loading ${modelType} model`, { error, endpoint })
      throw new Error(`Failed to load ${modelType} model: ${errorMessage}`)
    }
  }

  /**
   * Get minimum required version for each model type
   */
  private getMinimumRequiredModelVersion(modelType: string): number {
    const minimumVersions: Record<string, number> = {
      recommendation: 2.1,
      efficacyPrediction: 1.5,
      personalization: 3.0,
    }

    return minimumVersions[modelType] || 1.0
  }

  /**
   * Create personalization factors from client profile
   */
  async createPersonalizationFactors(clientId: string) {
    logger.info('Creating personalization factors', { clientId })

    try {
      // Get client profile from repository
      const profile = await this.extendedRepository.getClientProfile(clientId)

      if (!profile) {
        logger.warn('Client profile not found', { clientId })
        return {
          clientPreferences: [],
          pastTechniqueEfficacy: {},
          clientCharacteristics: {},
          treatmentHistory: [],
        }
      }

      // Extract properties from profile using destructuring
      const { preferences, history, characteristics } = profile

      // Extract preferences from profile
      const preferredApproaches = preferences?.preferredApproaches || []

      // Create efficacy map from history
      const efficacyMap: Record<string, number> = {}
      if (history?.pastTechniques) {
        for (const technique of history.pastTechniques) {
          efficacyMap[technique.techniqueId] = technique.efficacy
        }
      }

      // Extract treatment history
      const treatmentHistory =
        history?.pastTechniques.map((t) => t.techniqueId) || []

      return {
        clientPreferences: preferredApproaches,
        pastTechniqueEfficacy: efficacyMap,
        clientCharacteristics: characteristics || {},
        treatmentHistory,
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      logger.error('Error creating personalization factors', {
        clientId,
        error: errorMessage,
      })
      return {
        clientPreferences: [],
        pastTechniqueEfficacy: {},
        clientCharacteristics: {},
        treatmentHistory: [],
      }
    }
  }

  /**
   * Apply personalization layer to recommendations
   */
  async applyPersonalizationLayer(
    clientId: string,
    recommendations: ExtendedTherapeuticTechnique[],
    options?: PersonalizationLayerOptions,
  ) {
    // Extract layerType to avoid self-assignment later
    const { layerType } = this.layerConfiguration

    logger.info('Applying personalization layer', {
      clientId,
      recommendationsCount: recommendations.length,
      layerType,
    })

    try {
      const profile = await this.extendedRepository.getClientProfile(clientId)

      if (!profile) {
        logger.warn('Client profile not found, using default personalization', {
          clientId,
        })
        return {
          personalizedRecommendations: recommendations,
          techniqueAdaptations: new Map<string, TechniqueAdaptation>(),
          personalizationMetrics: {
            personalizationScore: 0.1,
            strategies: ['preference-based'] as PersonalizationStrategy[],
          },
        }
      }

      // Check if we need to refresh the cache
      await this.checkAndRefreshCache()

      // Extract configuration values for cleaner code
      const { enabledStrategies, options: configOptions } =
        this.layerConfiguration

      // Merge options with layer configuration
      const mergedOptions = {
        strategies: options?.strategies || enabledStrategies,
        minPersonalizationScore:
          options?.minPersonalizationScore ?? configOptions.adaptationThreshold,
        maxAdaptationsPerTechnique:
          options?.maxAdaptationsPerTechnique ??
          configOptions.maxAdaptationsPerTechnique,
      }

      // Get current session context if available
      const sessionContext = await this.getSessionContext(clientId)

      const adaptations = new Map<string, TechniqueAdaptation>()
      const appliedStrategies = new Set<PersonalizationStrategy>()
      let totalScore = 0

      // Apply personalization to each recommendation
      const personalizedRecommendations = await Promise.all(
        recommendations.map(async (rec) => {
          // Skip non-technique recommendations
          if (!rec.techniques || rec.techniques.length === 0) {
            return rec
          }

          // Personalize the primary technique
          const technique = rec.techniques[0]
          const adaptationLevel = mergedOptions.minPersonalizationScore

          try {
            // Check cache first if enabled
            const cacheKey = `${clientId}:${technique.id}:${layerType}`
            let adapted: AdaptedTechnique | null = null

            if (configOptions.cacheDuration > 0) {
              const cachedAdaptation = await this.getCachedAdaptation(cacheKey)
              if (cachedAdaptation) {
                adapted = cachedAdaptation
                logger.debug('Using cached adaptation', {
                  techniqueId: technique.id,
                })
              }
            }

            // If not in cache, generate new adaptation
            if (!adapted) {
              // Convert TechniqueReference to ExtendedTherapeuticTechnique
              // by adding required properties with default values
              const extendedTechnique: ExtendedTherapeuticTechnique = {
                ...technique,
                efficacyRating: 0.8, // Default value
                indicatedFor: ['general'], // Default value
                contraindications: [], // Required by TherapeuticTechnique
                evidenceSources: [], // Required by TherapeuticTechnique
                description: technique.description || '',
                name: technique.name,
              }

              adapted = await this.adaptTechniqueForClient(
                extendedTechnique,
                profile as ClientPreferenceProfile,
                adaptationLevel,
                {
                  sessionContext,
                  strategies: mergedOptions.strategies,
                },
              )

              // Cache the adaptation if caching is enabled
              if (configOptions.cacheDuration > 0) {
                await this.cacheAdaptation(cacheKey, adapted)
              }
            }

            // Store adaptation
            adaptations.set(technique.id, {
              techniqueId: technique.id,
              personalizedInstructions: adapted.personalizedInstructions,
              personalizedDescription: adapted.personalizedDescription,
              modifications: adapted.modifications || [],
              examples: adapted.examples || [],
              mediaRecommendations: adapted.mediaRecommendations,
              personalizationScore: adapted.personalizationScore,
              strategies: adapted.strategies,
              createdAt: new Date(),
            })

            // Track adaptation for analytics
            if (this.extendedEfficacyService.trackTechniqueAdaptation) {
              await this.extendedEfficacyService.trackTechniqueAdaptation(
                clientId,
                technique.id,
                adapted.strategies,
                adapted.personalizationScore,
              )
            }

            // Update applied strategies
            for (const strategy of adapted.strategies) {
              appliedStrategies.add(strategy)
            }

            totalScore += adapted.personalizationScore

            // Create a personalized copy of the recommendation
            return {
              ...rec,
              personalizedTitle: `${rec.title} (Personalized)`,
              personalizedDescription:
                adapted.personalizedDescription || rec.description,
              personalizationScore: adapted.personalizationScore,
              adaptedTechniques: [
                {
                  id: technique.id,
                  name: technique.name,
                  personalizedInstructions: adapted.personalizedInstructions,
                  personalizedDescription: adapted.personalizedDescription,
                  adaptationFactors: adapted.adaptationFactors,
                  adaptationReason: adapted.adaptationReason,
                },
              ],
            }
          } catch (error) {
            logger.error('Error personalizing technique', {
              techniqueId: technique.id,
              error,
            })
            return rec
          }
        }),
      )

      const averageScore =
        recommendations.length > 0 ? totalScore / recommendations.length : 0

      return {
        personalizedRecommendations,
        techniqueAdaptations: adaptations,
        personalizationMetrics: {
          personalizationScore: averageScore,
          strategies: Array.from(appliedStrategies),
        },
      }
    } catch (error) {
      logger.error('Error applying personalization layer', {
        clientId,
        error,
      })
      return {
        personalizedRecommendations: recommendations,
        techniqueAdaptations: new Map<string, TechniqueAdaptation>(),
        personalizationMetrics: {
          personalizationScore: 0,
          strategies: [],
        },
      }
    }
  }

  /**
   * Get available personalization strategies
   */
  async getPersonalizationStrategies(): Promise<PersonalizationStrategy[]> {
    const allAvailableStrategies: PersonalizationStrategy[] = [
      'preference-based',
      'efficacy-based',
      'characteristics-based',
      'learning-style',
      'cognitive-level',
      'cultural',
      'age-appropriate',
    ]

    // Filter to only enabled strategies in current configuration
    const { enabledStrategies } = this.layerConfiguration
    return allAvailableStrategies.filter((strategy) =>
      enabledStrategies.includes(strategy),
    )
  }

  /**
   * Get technique adaptations
   */
  async getTechniqueAdaptations(): Promise<Map<string, TechniqueAdaptation>> {
    return this.adaptationCache
  }

  /**
   * Check if cache needs refresh based on configured interval
   */
  private async checkAndRefreshCache(): Promise<void> {
    const now = Date.now()
    const hoursSinceLastRefresh =
      (now - this.lastRefreshTimestamp) / (1000 * 60 * 60)

    const {
      options: { refreshInterval },
    } = this.layerConfiguration

    if (hoursSinceLastRefresh >= refreshInterval) {
      logger.info('Refreshing personalization cache')
      this.adaptationCache.clear()
      this.lastRefreshTimestamp = now
    }
  }

  /**
   * Get cached adaptation if available
   */
  private async getCachedAdaptation(
    key: string,
  ): Promise<AdaptedTechnique | null> {
    // Try memory cache first
    if (this.adaptationCache.has(key)) {
      return this.adaptationCache.get(key) as AdaptedTechnique
    }

    // Try Redis cache if available
    if (this.redisService) {
      try {
        const cached = await this.redisService.get(`personalization:${key}`)
        if (cached) {
          const parsedCache = JSON.parse(cached)
          return parsedCache as AdaptedTechnique
        }
      } catch (error) {
        logger.error('Error retrieving from Redis cache', { key, error })
      }
    }

    return null
  }

  /**
   * Cache adaptation for future use
   */
  private async cacheAdaptation(
    key: string,
    adaptation: AdaptedTechnique,
  ): Promise<void> {
    // Store in memory cache
    this.adaptationCache.set(key, adaptation)

    // Extract cacheDuration to avoid self-assignment
    const {
      options: { cacheDuration },
    } = this.layerConfiguration

    // Store in Redis if available
    if (this.redisService) {
      try {
        await this.redisService.set(
          `personalization:${key}`,
          JSON.stringify(adaptation),
          cacheDuration,
        )
      } catch (error) {
        logger.error('Error storing in Redis cache', { key, error })
      }
    }
  }

  /**
   * Get current session context for contextual personalization
   */
  private async getSessionContext(
    clientId: string,
  ): Promise<PersonalizationContext | null> {
    try {
      // This would be an implementation of getting current session context
      // from a session service or similar
      if (
        this.extendedRepository &&
        typeof this.extendedRepository.getActiveSession === 'function'
      ) {
        const activeSession =
          await this.extendedRepository.getActiveSession(clientId)

        if (!activeSession) {
          return null
        }

        const {
          type: sessionType,
          mood: clientMood,
          techniques = [],
          goals = [],
          sessionNumber,
          timeOfDay,
          notes: therapistNotes,
        } = activeSession

        return {
          sessionType,
          clientMood,
          previousTechniques: techniques,
          currentGoals: goals,
          sessionNumber,
          timeOfDay,
          therapistNotes,
        }
      } else {
        return null
      }
    } catch (error) {
      logger.error('Error getting session context', { clientId, error })
      return null
    }
  }

  /**
   * Adapt technique for client based on profile and context
   */
  async adaptTechniqueForClient(
    technique: ExtendedTherapeuticTechnique,
    profile: ClientPreferenceProfile,
    adaptationLevel: number,
    options: {
      sessionContext?: PersonalizationContext | null
      strategies?: PersonalizationStrategy[]
    } = {},
  ): Promise<AdaptedTechnique> {
    logger.info('Adapting technique for client', {
      clientId: profile.clientId,
      techniqueId: technique.id,
      adaptationLevel,
    })

    // Extract configuration details to avoid self-assignments
    const {
      weights,
      features,
      enabledStrategies,
      options: configOptions,
    } = this.layerConfiguration
    const { useMLRecommendations } = configOptions

    // Determine which strategies to apply
    const strategies = options.strategies || enabledStrategies
    const appliedStrategies: PersonalizationStrategy[] = []
    const adaptationFactors: string[] = []
    const modifications: string[] = []
    let examples: string[] = []
    let mediaRecommendations: string[] = []
    let personalizationScore = 0.1 // Base score

    // Start with original description and instructions
    let personalizedDescription = technique.description
    let personalizedInstructions = ''

    // Communication style adaptation (preference-based)
    if (strategies.includes('preference-based')) {
      try {
        const communicationStyle = profile.preferences?.communicationStyle
        if (communicationStyle && communicationStyle !== 'direct') {
          personalizedInstructions = this.generateCustomInstructions(
            technique,
            communicationStyle,
          )
          adaptationFactors.push(`Communication style: ${communicationStyle}`)
          appliedStrategies.push('preference-based')
          personalizationScore += 0.15 * weights.preference
        }

        // Check for preferred approaches
        const preferredApproaches =
          profile.preferences?.preferredApproaches || []
        if (preferredApproaches.length > 0) {
          adaptationFactors.push(
            `Preferred approaches: ${preferredApproaches.join(', ')}`,
          )
          personalizationScore += 0.1 * weights.preference
        }
      } catch (error) {
        logger.error('Error applying preference-based personalization', {
          error,
        })
      }
    }

    // Learning style adaptation
    if (
      strategies.includes('learning-style') &&
      profile.preferences?.learningStyle &&
      profile.preferences.learningStyle !== 'unknown'
    ) {
      try {
        const { learningStyle } = profile.preferences
        const mediaRecs = this.getMediaRecommendationsForLearningStyle(
          learningStyle,
          technique.indicatedFor[0] || 'general',
        )

        if (mediaRecs.length > 0 && features.mediaRecommendations) {
          mediaRecommendations = mediaRecs.map(
            (rec) => `${rec.type}: ${rec.title} - ${rec.description}`,
          )
          adaptationFactors.push(`Learning style: ${learningStyle}`)
          appliedStrategies.push('learning-style')
          personalizationScore += 0.2 * weights.learning
        }
      } catch (error) {
        logger.error('Error applying learning style personalization', {
          error,
        })
      }
    }

    // Efficacy-based adaptation
    if (strategies.includes('efficacy-based')) {
      try {
        const efficacyMap: Record<string, number> = {}

        // Get past efficacy from profile
        if (profile.history?.pastTechniques) {
          for (const tech of profile.history.pastTechniques) {
            efficacyMap[tech.techniqueId] = tech.efficacy
          }
        }

        // If we have efficacy data for similar techniques
        // Using underscore prefix for unused variable to satisfy linter
        const _similarTechniques = technique.categories || []
        let hasEfficacyData = false
        let avgEfficacy = 0
        let efficacyCount = 0

        for (const tech of profile.history?.pastTechniques || []) {
          if (
            technique.categories?.some((cat) =>
              tech.techniqueName.toLowerCase().includes(cat.toLowerCase()),
            )
          ) {
            hasEfficacyData = true
            avgEfficacy += tech.efficacy
            efficacyCount++
          }
        }

        if (hasEfficacyData && efficacyCount > 0) {
          avgEfficacy /= efficacyCount

          if (avgEfficacy < 0.4) {
            // Low efficacy - suggest modifications
            modifications.push(
              `Consider simplifying this technique based on past experience.`,
            )
            modifications.push(
              `Break down into smaller steps with more frequent check-ins.`,
            )
          } else if (avgEfficacy > 0.7) {
            // High efficacy - suggest advanced variations
            const advancedVariation = this.getAdvancedVariation(technique.name)
            if (advancedVariation) {
              modifications.push(advancedVariation)
            }
          }

          adaptationFactors.push(
            `Historical efficacy: ${(avgEfficacy * 100).toFixed(0)}%`,
          )
          appliedStrategies.push('efficacy-based')
          personalizationScore += 0.25 * weights.efficacy
        }
      } catch (error) {
        logger.error('Error applying efficacy-based personalization', {
          error,
        })
      }
    }

    // Cultural adaptation
    if (strategies.includes('cultural') && profile.demographic?.culture) {
      try {
        const { culture } = profile.demographic
        personalizedDescription = this.culturallyAdaptDescription(
          personalizedDescription,
          culture,
        )
        adaptationFactors.push(`Cultural adaptation: ${culture}`)
        appliedStrategies.push('cultural')
        personalizationScore += 0.2
      } catch (error) {
        logger.error('Error applying cultural personalization', { error })
      }
    }

    // Contextual adaptation based on session context
    if (
      strategies.includes('characteristics-based') &&
      options.sessionContext
    ) {
      try {
        const { clientMood, currentGoals } = options.sessionContext

        // Adapt based on current mood if available
        if (clientMood) {
          modifications.push(
            `Consider client's current mood (${clientMood}) when introducing this technique.`,
          )
          adaptationFactors.push(`Current mood: ${clientMood}`)
        }

        // Adapt based on session goals
        if (currentGoals && currentGoals.length > 0) {
          modifications.push(
            `Connect this technique to client's current goals: ${currentGoals.join(', ')}`,
          )
          adaptationFactors.push(`Session goals: ${currentGoals.length} active`)
        }

        appliedStrategies.push('characteristics-based')
        personalizationScore += 0.15 * weights.characteristics
      } catch (error) {
        logger.error('Error applying contextual personalization', { error })
      }
    }

    // Generate dynamic examples if enabled
    if (features.dynamicExamples && useMLRecommendations) {
      try {
        examples = await this.generateDynamicExamples(technique, profile)
        if (examples.length > 0) {
          personalizationScore += 0.1
        }
      } catch (error) {
        logger.error('Error generating dynamic examples', { error })
      }
    }

    // Cap the personalization score at 1.0
    personalizationScore = Math.min(personalizationScore, 1.0)

    // Only return adaptations if they meet minimum threshold
    if (personalizationScore < adaptationLevel) {
      logger.info('Personalization score below threshold', {
        score: personalizationScore,
        threshold: adaptationLevel,
      })

      // Extract values to avoid self-assignment
      const { id: techniqueId, name, description } = technique

      return {
        techniqueId,
        personalizationScore: 0.1,
        strategies: ['preference-based'],
        createdAt: new Date(),
        name,
        steps: [],
        explanation: description,
        explanationStyle: 'direct',
        description,
      }
    }

    // Get communication style for explanation
    const explanationStyle = profile.preferences?.communicationStyle || 'direct'

    // Extract technique properties to avoid self-assignment
    const { id: techniqueId, name, description } = technique

    // Prepare the adapted technique
    return {
      techniqueId,
      personalizedInstructions,
      personalizedDescription,
      modifications,
      examples,
      mediaRecommendations,
      personalizationScore,
      strategies: appliedStrategies,
      createdAt: new Date(),
      name,
      steps: [],
      explanation: description,
      explanationStyle,
      description,
      adaptationFactors,
      adaptationReason: `Personalized based on ${appliedStrategies.join(
        ', ',
      )} adaptation`,
    }
  }

  /**
   * Generate dynamic examples tailored to the client's profile and context
   */
  private async generateDynamicExamples(
    technique: ExtendedTherapeuticTechnique,
    profile: ClientPreferenceProfile,
  ): Promise<string[]> {
    const examples: string[] = []

    try {
      // Extract properties using destructuring for cleaner code
      const {
        categories = [],
        name = 'this technique',
        complexity = 'moderate',
      } = technique
      const { demographic, preferences, characteristics } = profile

      // Determine technique type for more specific examples
      const techniqueType = categories[0] || 'general'

      // Get patient age and learning style if available
      const patientAge = demographic?.age
      const learningStyle = preferences?.learningStyle || 'unknown'

      // Check if we should use ML model for generating examples
      if (
        this.mlModelsInitialized &&
        this.layerConfiguration.options.useMLRecommendations
      ) {
        // Create a prompt for the AI model
        const examplePrompt = {
          technique: {
            name,
            type: techniqueType,
            complexity,
            categories,
          },
          client: {
            age: patientAge,
            learningStyle,
            culture: demographic?.culture || 'unknown',
            characteristics: Object.entries(characteristics || {})
              .filter(([_, value]) => value === true)
              .map(([key]) => key),
          },
          requestType: 'personalized_examples',
          format: 'array',
          exampleCount: 3,
        }

        try {
          // Make API call to ML model for personalized examples
          const response = await fetch(
            `${process.env.PERSONALIZATION_MODEL_ENDPOINT || 'http://ml-models-service/personalization-model'}/generate`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-API-Key': process.env.ML_SERVICE_API_KEY || '',
              },
              body: JSON.stringify(examplePrompt),
            },
          )

          if (response.ok) {
            const result = await response.json()
            if (Array.isArray(result.examples) && result.examples.length > 0) {
              return result.examples
            }

            // Log successful AI-generated examples
            logger.info('Generated personalized examples using AI model', {
              techniqueType,
              exampleCount: result.examples.length,
            })
          } else {
            // Log error but continue with fallback examples
            logger.error('Failed to generate AI examples, using fallbacks', {
              status: response.status,
              techniqueType,
            })
          }
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : String(error)
          logger.error('Error calling personalization model for examples', {
            error: errorMessage,
            techniqueType,
          })
          // Continue with fallback examples
        }
      }

      // Fallback examples based on technique type
      if (techniqueType.includes('mindfulness')) {
        examples.push(
          'Practice mindful breathing while waiting in line at the store',
        )
        examples.push('Use the technique during your morning routine')
      } else if (techniqueType.includes('cognitive')) {
        examples.push('Notice negative thoughts during work meetings')
        examples.push('Apply the technique when feeling overwhelmed by tasks')
      } else if (techniqueType.includes('behavioral')) {
        examples.push('Create a daily practice schedule')
        examples.push('Track your progress in a journal')
      } else {
        examples.push('Practice for 5 minutes each morning')
        examples.push('Use this technique when you notice stress building')
      }

      // Add age-appropriate examples if age is available
      if (patientAge) {
        if (patientAge < 18) {
          examples.push(
            'Try this technique before school tests or presentations',
          )
        } else if (patientAge > 60) {
          examples.push(
            'This technique can be practiced while seated comfortably',
          )
        } else {
          examples.push('Incorporate this into your work-life balance routine')
        }
      }

      // Add learning style-specific examples
      if (learningStyle === 'visual') {
        examples.push('Visualize using this technique in a peaceful setting')
      } else if (learningStyle === 'auditory') {
        examples.push(
          'Try recording yourself describing the technique and listening back',
        )
      } else if (learningStyle === 'kinesthetic') {
        examples.push('Combine this practice with gentle movement or walking')
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      logger.error('Error generating dynamic examples', { error: errorMessage })
    }

    return examples
  }

  /**
   * Get media recommendations based on learning style
   */
  getMediaRecommendationsForLearningStyle(
    learningStyle:
      | 'visual'
      | 'auditory'
      | 'kinesthetic'
      | 'reading/writing'
      | 'unknown',
    techniqueType: string,
  ): MediaRecommendation[] {
    const recommendations: MediaRecommendation[] = []

    switch (learningStyle) {
      case 'visual':
        recommendations.push({
          type: 'video',
          title: `Visual Guide to ${techniqueType}`,
          description: 'Step-by-step visual demonstration with annotations',
          url: 'https://example.com/visual-guide',
        })
        recommendations.push({
          type: 'image',
          title: `${techniqueType} Infographic`,
          description: 'Visual summary of key concepts and benefits',
          url: 'https://example.com/infographic',
        })
        break

      case 'auditory':
        recommendations.push({
          type: 'audio',
          title: `Guided ${techniqueType} Session`,
          description: 'Audio guidance with clear verbal instructions',
          url: 'https://example.com/audio-guide',
        })
        recommendations.push({
          type: 'audio',
          title: `${techniqueType} Podcast Episode`,
          description:
            'Expert discussion on technique benefits and applications',
          url: 'https://example.com/podcast',
        })
        break

      case 'kinesthetic':
        recommendations.push({
          type: 'interactive',
          title: `Interactive ${techniqueType} Practice`,
          description: 'Follow-along exercise with real-time feedback',
          url: 'https://example.com/interactive',
        })
        recommendations.push({
          type: 'video',
          title: `${techniqueType} Movement Guide`,
          description:
            'Physical practice demonstration with emphasis on movement',
          url: 'https://example.com/movement-guide',
        })
        break

      case 'reading/writing':
        recommendations.push({
          type: 'text',
          title: `${techniqueType} Comprehensive Guide`,
          description: 'Detailed written instructions with references',
          url: 'https://example.com/guide',
        })
        recommendations.push({
          type: 'text',
          title: `${techniqueType} Research Summary`,
          description: 'Academic review of evidence and applications',
          url: 'https://example.com/research',
        })
        break

      default:
        // Default recommendations for unknown learning style
        recommendations.push({
          type: 'video',
          title: `${techniqueType} Overview`,
          description: 'General introduction to the technique',
          url: 'https://example.com/overview',
        })
        recommendations.push({
          type: 'text',
          title: `${techniqueType} Quick Start`,
          description: 'Essential steps to begin practicing',
          url: 'https://example.com/quickstart',
        })
    }

    return recommendations
  }

  /**
   * Generate custom instructions based on communication style
   */
  generateCustomInstructions(
    technique: ExtendedTherapeuticTechnique,
    communicationStyle?:
      | 'direct'
      | 'indirect'
      | 'analytical'
      | 'intuitive'
      | 'emotional'
      | 'practical',
  ): string {
    const baseName = technique.name || 'this technique'

    switch (communicationStyle) {
      case 'direct':
        return `To practice ${baseName}:\n1. Find a quiet space\n2. Set aside ${technique.timeRequired || '10-15 minutes'}\n3. Follow each step precisely\n4. Practice regularly for best results`

      case 'analytical':
        return `${baseName} (Efficacy rating: ${technique.efficacyRating || '0.8'}/1.0)\nThis evidence-based approach involves systematic practice of ${technique.description?.substring(0, 50) || 'mindfulness techniques'}...\nResearch indicates optimal results when practiced for ${technique.timeRequired || '10-15 minutes'} daily.`

      case 'intuitive':
        return `${baseName} invites you to explore your inner landscape through ${technique.categories?.join(' and ') || 'mindfulness'}. As you engage with this practice, notice what emerges naturally. There's no right or wrong way to experience this journey.`

      case 'emotional':
        return `${baseName} can help you connect with your feelings in a supportive way. Many people find this practice brings a sense of calm and emotional balance. Be gentle with yourself as you explore this technique.`

      case 'practical':
        return `${baseName}: A practical approach to ${technique.suitableFor?.join(', ') || 'stress reduction'}. Time needed: ${technique.timeRequired || '10-15 minutes'}. No special equipment required. Can be practiced anywhere. Benefits typically noticed within 2 weeks of regular practice.`

      default:
        // Balanced approach for undefined communication style
        return `${baseName}\n\nThis ${technique.complexity || 'simple'} technique helps with ${technique.suitableFor?.join(', ') || 'stress reduction'}. Practice for ${technique.timeRequired || '10-15 minutes'} regularly to experience the benefits. Adapt the approach to work best for your specific needs.`
    }
  }

  /**
   * Adapt description based on cultural background
   */
  culturallyAdaptDescription(description: string, culture: string): string {
    const baseDescription =
      description ||
      'This mindfulness technique helps reduce stress and increase awareness.'

    const lowerCaseCulture = culture.toLowerCase()

    switch (lowerCaseCulture) {
      case 'east asian':
      case 'eastern':
      case 'asian':
        return `${baseDescription} This practice aligns with Eastern traditions that emphasize harmony, balance, and the connection between mind and body. It can be integrated with daily routines to promote overall wellbeing.`

      case 'south asian':
      case 'indian':
        return `${baseDescription} This approach resonates with traditional South Asian practices focused on cultivating awareness and inner peace. The technique supports balanced energy and holistic wellness.`

      case 'middle eastern':
      case 'arabic':
        return `${baseDescription} This practice complements traditional Middle Eastern perspectives on wellness that emphasize reflection and mindful presence. It can be incorporated into daily routines in harmony with cultural values.`

      case 'african':
        return `${baseDescription} This approach connects with African wellness traditions that emphasize community, holistic health, and the relationship between personal wellbeing and communal harmony.`

      case 'latinx':
      case 'latino':
      case 'latina':
      case 'hispanic':
        return `${baseDescription} This practice aligns with cultural traditions that value family connection and communal support. It can be adapted to incorporate shared experience and intergenerational wisdom.`

      case 'indigenous':
      case 'native':
        return `${baseDescription} This approach resonates with Indigenous wellness practices that recognize the interconnection between individual health, community wellbeing, and environmental harmony.`

      case 'western':
      case 'european':
        return `${baseDescription} This evidence-based approach draws from both traditional wisdom and contemporary research. It can be integrated into daily life with measurable benefits for stress reduction and emotional regulation.`

      default:
        return `${baseDescription} This practice can be adapted to align with your cultural background and personal values, making it more meaningful and relevant to your individual context.`
    }
  }

  /**
   * Get advanced variation of technique
   */
  getAdvancedVariation(techniqueName: string): string {
    const lowercaseName = techniqueName.toLowerCase()

    if (
      lowercaseName.includes('meditation') ||
      lowercaseName.includes('mindful')
    ) {
      return `Advanced practitioners can extend sessions to 30-45 minutes, introducing subtle awareness of thought patterns without attachment. Consider incorporating body scanning and open monitoring techniques.`
    }

    if (
      lowercaseName.includes('breath') ||
      lowercaseName.includes('breathing')
    ) {
      return `As you become comfortable with the basic technique, explore advanced breath ratios (4-7-8), pranayama variations, or coherent breathing at 5-6 breaths per minute for enhanced autonomic nervous system regulation.`
    }

    if (lowercaseName.includes('cognitive') || lowercaseName.includes('cbt')) {
      return `For advanced practice, implement thought records with additional columns for evidence analysis and cognitive distortion identification. Consider integrating behavioral experiments to test and challenge core beliefs.`
    }

    if (
      lowercaseName.includes('behavioral') ||
      lowercaseName.includes('exposure')
    ) {
      return `Progress to more challenging exposures with decreased safety behaviors. Consider implementing variability in practice contexts to enhance generalization of skills.`
    }

    if (
      lowercaseName.includes('journal') ||
      lowercaseName.includes('writing')
    ) {
      return `Advanced journaling can incorporate dialectical thought patterns, examining both/and perspectives rather than either/or thinking. Consider targeted emotional processing protocols like Pennebaker's expressive writing.`
    }

    return `As your skill with this technique develops, consider extending practice duration, increasing complexity, and applying it to more challenging situations.`
  }

  // Before the risk correlations call, transform sessions into emotion analysis data
  private async getEmotionAnalysisForSessions(
    clientId: string,
    sessions: ClientSession[],
  ): Promise<EmotionAnalysis[]> {
    // Extract emotion analysis data from sessions
    return sessions
      .map((session) => session.emotionAnalysis)
      .filter(
        (analysis): analysis is EmotionAnalysis =>
          analysis !== null && analysis !== undefined,
      )
    // 2. Or fetch emotion data from a repository:
    // return this.emotionRepository.getEmotionAnalysisForSessions(sessions.map(s => s.sessionId));
  }

  public async populateSessionHistoryFactor(
    clientId: string,
    contextManager: ContextManager,
    historyLimit = 5, // Limit the number of past sessions/items to fetch for now
  ): Promise<void> {
    if (!clientId) {
      logger.warn('populateSessionHistoryFactor called with no clientId.')
      return
    }
    if (!contextManager) {
      logger.warn(
        'populateSessionHistoryFactor called with no ContextManager instance.',
      )
      return
    }

    logger.info(`Populating session history factor for client: ${clientId}`)

    try {
      // Fetch intervention history (logs)
      const interventionAnalyses: InterventionAnalysisResult[] =
        (await this.extendedRepository.getInterventionAnalysisByUser?.(
          clientId,
          historyLimit,
        )) || []
      const interventionLogs: InterventionHistoryLogItem[] =
        interventionAnalyses.map(
          (analysis): InterventionHistoryLogItem => ({
            type: analysis.intervention || 'unknown_intervention_type',
            timestamp: analysis.createdAt
              ? new Date(analysis.createdAt)
              : new Date(),
            outcome: analysis.effectiveness?.toString() || 'unknown_outcome', // Or map effectiveness score to a string category
            // sessionId: analysis.metadata?.sessionId, // If sessionId is available in metadata
          }),
        )

      // Fetch past emotions
      // This requires fetching sessions first, then emotions for each session.
      // This could be performance-intensive if not paginated or limited.
      const pastSessions =
        (await this.extendedRepository.getSessions?.({ clientId })) || []
      const recentSessions = pastSessions
        .sort(
          (a, b) =>
            new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
        )
        .slice(0, historyLimit)

      let allRecentEmotions: EmotionAnalysis[] = []
      for (const session of recentSessions) {
        if (session.sessionId) {
          const emotionsForSession =
            (await this.extendedRepository.getEmotionsForSession?.(
              session.sessionId,
            )) || []
          allRecentEmotions.push(...emotionsForSession)
        }
      }
      // Sort all emotions by timestamp just in case they are not ordered
      allRecentEmotions.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )

      // pastTechniques: Dependent on getClientProfile, which is currently missing from AIRepository.
      // For now, this will be an empty array.
      const pastTechniques: PastTechniqueHistoryItem[] = []
      logger.info(
        'Past techniques history is currently unavailable due to missing getClientProfile in AIRepository.',
      )

      const sessionHistoryValue: SessionHistoryContextValue = {
        clientId,
        pastTechniques, // Empty for now
        interventionLogs,
        // recentEmotionAnalyses: allRecentEmotions, // Uncomment if EmotionAnalysis type is directly usable/imported in ContextTypes
        historyMetadata: {
          numberOfSessionsConsidered: recentSessions.length,
          oldestSessionDate:
            recentSessions.length > 0
              ? new Date(recentSessions[recentSessions.length - 1].startTime)
              : undefined,
          latestSessionDate:
            recentSessions.length > 0
              ? new Date(recentSessions[0].startTime)
              : undefined,
        },
      }

      // Add recentEmotionAnalyses separately if needed to avoid type issues with SessionHistoryContextValue initially
      // This is a workaround if EmotionAnalysis cannot be directly part of SessionHistoryContextValue due to type dependencies.
      // Instead, it's better to ensure SessionHistoryContextValue can hold it.
      // For now, I will add a log for now and skip adding it directly to the factor value.
      if (allRecentEmotions.length > 0) {
        logger.info(
          `Fetched ${allRecentEmotions.length} recent emotion analyses for client ${clientId}. These are not yet part of the SessionHistoryContextValue.`,
        )
        // If you later add recentEmotionAnalyses to SessionHistoryContextValue in ContextTypes, uncomment the line in sessionHistoryValue.
      }

      contextManager.addOrUpdateFactor<SessionHistoryContextValue>({
        id: 'clientSessionHistory',
        value: sessionHistoryValue,
        source: 'PersonalizationServiceImpl.populateSessionHistoryFactor',
        confidence: 0.85, // Confidence can be adjusted based on data completeness
        metadata: {
          detail:
            'Aggregated history of client interactions, interventions, and (partially) emotions.',
          dependencies: [
            'AIRepository.getInterventionAnalysisByUser',
            'AIRepository.getSessions',
            'AIRepository.getEmotionsForSession',
          ],
          missingData: ['pastTechniques (due to no getClientProfile)'],
        },
      })

      logger.info(
        `Successfully populated session history factor for client: ${clientId}`,
      )
    } catch (error) {
      logger.error(
        `Error populating session history for client ${clientId}:`,
        error,
      )
      // Optionally re-throw or handle as per service error strategy
    }
  }
}
