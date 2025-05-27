/**
 * Personalization Layer Factory
 *
 * Factory for creating and configuring personalization layers for the recommendation engine.
 * This component enables dynamic personalization strategies with machine learning capabilities.
 */

import { getLogger } from '../../logging'
import type {
  PersonalizationService,
  PersonalizationStrategy,
} from './PersonalizationService'
import { PersonalizationServiceImpl } from './PersonalizationServiceImpl'
import type { AIRepository } from '../../db/ai/repository'
import type { EfficacyTrackingService } from './EfficacyTrackingService'
import type { IRedisService } from '../../services/redis/types'

// Define logger
const logger = getLogger({ prefix: 'personalization-layer-factory' })

// Personalization layer types for different recommendation contexts
export type PersonalizationLayerType =
  | 'standard' // Default personalization
  | 'enhanced' // Deeper personalization with ML-driven insights
  | 'adaptive' // Adapts over time based on client feedback
  | 'contextual' // Adapts based on session context
  | 'cultural' // Focuses on cultural adaptations
  | 'cognitive' // Adapts based on cognitive abilities/preferences
  | 'custom' // Custom configuration

// Configuration options for personalization layers
export interface PersonalizationLayerConfig {
  // Base configuration
  layerType: PersonalizationLayerType
  enabledStrategies: PersonalizationStrategy[]

  // Weighting configuration
  weights: {
    preference: number // 0-1 weight for client preferences
    efficacy: number // 0-1 weight for historical efficacy
    characteristics: number // 0-1 weight for client characteristics
    contextual: number // 0-1 weight for contextual factors
    learning: number // 0-1 weight for learning style adaptations
  }

  // Advanced options
  options: {
    adaptationThreshold: number // Minimum score to apply adaptations (0-1)
    maxAdaptationsPerTechnique: number // Maximum adaptations per technique
    useMLRecommendations: boolean // Use ML for generating adaptations
    cacheDuration: number // Cache duration in seconds
    refreshInterval: number // Background refresh interval in hours
  }

  // Feature flags
  features: {
    dynamicExamples: boolean // Generate dynamic examples
    mediaRecommendations: boolean // Include media recommendations
    adaptiveInstructions: boolean // Generate adaptive instructions
    progressiveComplexity: boolean // Adjust complexity progressively
    clientFeedbackLoop: boolean // Incorporate feedback loop
  }
}

/**
 * Default configuration for personalization layers
 */
const DEFAULT_CONFIG: PersonalizationLayerConfig = {
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

/**
 * Enhanced configuration with ML capabilities
 */
const ENHANCED_CONFIG: PersonalizationLayerConfig = {
  ...DEFAULT_CONFIG,
  layerType: 'enhanced',
  enabledStrategies: [
    'preference-based',
    'efficacy-based',
    'characteristics-based',
    'learning-style',
    'cognitive-level',
  ],
  weights: {
    preference: 0.25,
    efficacy: 0.35,
    characteristics: 0.2,
    contextual: 0.1,
    learning: 0.1,
  },
  options: {
    ...DEFAULT_CONFIG.options,
    useMLRecommendations: true,
    adaptationThreshold: 0.2,
  },
  features: {
    ...DEFAULT_CONFIG.features,
    dynamicExamples: true,
    progressiveComplexity: true,
  },
}

/**
 * Adaptive configuration that evolves over time
 */
const ADAPTIVE_CONFIG: PersonalizationLayerConfig = {
  ...ENHANCED_CONFIG,
  layerType: 'adaptive',
  weights: {
    preference: 0.2,
    efficacy: 0.4,
    characteristics: 0.2,
    contextual: 0.1,
    learning: 0.1,
  },
  options: {
    ...ENHANCED_CONFIG.options,
    refreshInterval: 12, // More frequent updates
  },
  features: {
    ...ENHANCED_CONFIG.features,
    clientFeedbackLoop: true,
  },
}

/**
 * Factory for creating personalization layers
 */
export class PersonalizationLayerFactory {
  private repository: AIRepository
  private efficacyService: EfficacyTrackingService
  private redisService: IRedisService

  constructor(
    repository: AIRepository,
    efficacyService: EfficacyTrackingService,
    redisService: IRedisService,
  ) {
    this.repository = repository
    this.efficacyService = efficacyService
    this.redisService = redisService
    logger.info('PersonalizationLayerFactory initialized')
  }

  /**
   * Create a personalization layer with the specified configuration
   */
  createPersonalizationLayer(
    config: Partial<PersonalizationLayerConfig> = {},
  ): PersonalizationService {
    // Determine base configuration from layer type
    let baseConfig: PersonalizationLayerConfig
    const layerType = config.layerType || 'standard'

    switch (layerType) {
      case 'enhanced':
        baseConfig = { ...ENHANCED_CONFIG }
        break
      case 'adaptive':
        baseConfig = { ...ADAPTIVE_CONFIG }
        break
      case 'contextual':
      case 'cultural':
      case 'cognitive':
      case 'custom':
        // Start with default and apply specialized adjustments later
        baseConfig = { ...DEFAULT_CONFIG, layerType }
        break
      default:
        baseConfig = { ...DEFAULT_CONFIG }
    }

    // Merge provided config with base config
    const mergedConfig = this.mergeConfigs(baseConfig, config)

    // Create personalization service with configuration
    const personalizationService = new PersonalizationServiceImpl(
      this.repository,
      this.efficacyService,
      this.redisService,
    )

    // Apply configuration to personalization service
    this.configurePersonalizationService(personalizationService, mergedConfig)

    logger.info('Created personalization layer', {
      type: mergedConfig.layerType,
      enabledStrategies: mergedConfig.enabledStrategies.length,
    })

    return personalizationService
  }

  /**
   * Create an optimal personalization layer for a specific client
   * using historical data and ML recommendations
   */
  async createOptimalPersonalizationLayer(
    clientId: string,
  ): Promise<PersonalizationService> {
    logger.info('Creating optimal personalization layer', { clientId })

    try {
      // Get client profile and efficacy data
      const clientProfile = await (this.repository as any).getClientProfile(
        clientId,
      )
      const efficacyData =
        await this.efficacyService.getClientEfficacyMetrics(clientId)

      if (!clientProfile) {
        logger.warn('Client profile not found, using standard configuration', {
          clientId,
        })
        return this.createPersonalizationLayer()
      }

      // Determine optimal layer type based on data
      const layerType = this.determineOptimalLayerType(
        clientProfile,
        efficacyData,
      )

      // Calculate optimal weights
      const weights = this.calculateOptimalWeights(clientProfile, efficacyData)

      // Determine optimal strategies
      const enabledStrategies = this.determineOptimalStrategies(clientProfile)

      // Create custom configuration
      const customConfig: PersonalizationLayerConfig = {
        layerType,
        enabledStrategies,
        weights,
        options: {
          adaptationThreshold: this.calculateOptimalThreshold(
            clientProfile,
            efficacyData,
          ),
          maxAdaptationsPerTechnique: 5,
          useMLRecommendations: true,
          cacheDuration: 1800, // 30 minutes
          refreshInterval: 12, // 12 hours
        },
        features: {
          dynamicExamples: true,
          mediaRecommendations: true,
          adaptiveInstructions: true,
          progressiveComplexity: true,
          clientFeedbackLoop: true,
        },
      }

      return this.createPersonalizationLayer(customConfig)
    } catch (error) {
      logger.error('Error creating optimal personalization layer', {
        clientId,
        error,
      })
      // Fallback to standard configuration
      return this.createPersonalizationLayer()
    }
  }

  /**
   * Merge configuration objects, with provided config overriding base config
   */
  private mergeConfigs(
    baseConfig: PersonalizationLayerConfig,
    providedConfig: Partial<PersonalizationLayerConfig>,
  ): PersonalizationLayerConfig {
    // Deep merge the configurations
    return {
      layerType: providedConfig.layerType || baseConfig.layerType,
      enabledStrategies:
        providedConfig.enabledStrategies || baseConfig.enabledStrategies,
      weights: {
        ...baseConfig.weights,
        ...(providedConfig.weights || {}),
      },
      options: {
        ...baseConfig.options,
        ...(providedConfig.options || {}),
      },
      features: {
        ...baseConfig.features,
        ...(providedConfig.features || {}),
      },
    }
  }

  /**
   * Apply configuration to personalization service
   */
  private configurePersonalizationService(
    service: PersonalizationServiceImpl,
    config: PersonalizationLayerConfig,
  ): void {
    // Set configuration on service instance
    // Note: This assumes that PersonalizationServiceImpl will be extended
    // to accept these configuration options
    ;(service as any).setLayerConfiguration(config)
  }

  /**
   * Determine optimal personalization layer type based on client data
   */
  private determineOptimalLayerType(
    clientProfile: any,
    efficacyData: any,
  ): PersonalizationLayerType {
    // Number of sessions is a good indicator of how much data we have
    const sessionCount = efficacyData?.sessionCount || 0

    // Cultural factors present?
    const hasCulturalFactors = !!clientProfile?.demographic?.culture

    // Learning style preferences?
    const hasLearningStyle =
      !!clientProfile?.preferences?.learningStyle &&
      clientProfile.preferences.learningStyle !== 'unknown'

    // Check if we have enough data for adaptive approaches
    if (sessionCount > 10) {
      return 'adaptive'
    } else if (hasCulturalFactors) {
      return 'cultural'
    } else if (hasLearningStyle) {
      return 'cognitive'
    } else if (sessionCount > 3) {
      return 'enhanced'
    } else {
      return 'standard'
    }
  }

  /**
   * Calculate optimal weights based on client data
   */
  private calculateOptimalWeights(
    clientProfile: any,
    efficacyData: any,
  ): PersonalizationLayerConfig['weights'] {
    // Base weights
    const weights = {
      preference: 0.25,
      efficacy: 0.35,
      characteristics: 0.2,
      contextual: 0.1,
      learning: 0.1,
    }

    // Adjust based on data availability
    const hasPreferences =
      Array.isArray(clientProfile?.preferences?.preferredApproaches) &&
      clientProfile.preferences.preferredApproaches.length > 0

    const hasEfficacyData =
      Array.isArray(efficacyData?.techniqueEfficacy) &&
      efficacyData.techniqueEfficacy.length > 0

    const hasCharacteristics =
      Object.keys(clientProfile?.characteristics || {}).length > 0

    // If we have good efficacy data, increase its weight
    if (hasEfficacyData) {
      weights.efficacy = 0.45
      weights.preference = 0.2
    }

    // If we have strong preferences, increase that weight
    if (hasPreferences) {
      weights.preference = hasEfficacyData ? 0.3 : 0.4
      weights.efficacy = hasEfficacyData ? 0.35 : 0.25
    }

    // Characteristics adjustments
    if (hasCharacteristics) {
      weights.characteristics = 0.25
      weights.contextual = 0.05
    }

    // Learning style adjustments
    if (
      clientProfile?.preferences?.learningStyle &&
      clientProfile.preferences.learningStyle !== 'unknown'
    ) {
      weights.learning = 0.15
      weights.contextual = 0.05
    }

    return weights
  }

  /**
   * Determine optimal strategies based on client profile
   */
  private determineOptimalStrategies(
    clientProfile: any,
  ): PersonalizationStrategy[] {
    const strategies: PersonalizationStrategy[] = [
      'preference-based',
      'efficacy-based',
      'characteristics-based',
    ]

    // Add learning style if defined
    if (
      clientProfile?.preferences?.learningStyle &&
      clientProfile.preferences.learningStyle !== 'unknown'
    ) {
      strategies.push('learning-style')
    }

    // Add cognitive level if we have indicators
    if (
      clientProfile?.characteristics?.cognitiveLevel ||
      clientProfile?.characteristics?.complexityPreference
    ) {
      strategies.push('cognitive-level')
    }

    // Add cultural if culture defined
    if (clientProfile?.demographic?.culture) {
      strategies.push('cultural')
    }

    // Add age-appropriate if age defined
    if (clientProfile?.demographic?.age) {
      strategies.push('age-appropriate')
    }

    return strategies
  }

  /**
   * Calculate optimal adaptation threshold based on data
   */
  private calculateOptimalThreshold(
    clientProfile: any,
    efficacyData: any,
  ): number {
    // Start with default threshold
    let threshold = 0.3

    // If we have limited data, increase threshold to be more conservative
    const sessionCount = efficacyData?.sessionCount || 0

    if (sessionCount < 3) {
      // Be more conservative with limited data
      threshold = 0.4
    } else if (sessionCount > 10) {
      // Be more confident with more data
      threshold = 0.2
    }

    // If client has strong preferences, be more selective
    if (
      Array.isArray(clientProfile?.preferences?.avoidedApproaches) &&
      clientProfile.preferences.avoidedApproaches.length > 0
    ) {
      threshold += 0.05
    }

    return threshold
  }
}
