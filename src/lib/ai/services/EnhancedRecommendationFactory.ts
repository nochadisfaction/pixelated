/**
 * EnhancedRecommendationFactory
 *
 * Factory for creating instances of the EnhancedRecommendationService with
 * appropriate dependencies for production or testing.
 */

import { getLogger } from '../../logging'
import { EnhancedRecommendationService } from './EnhancedRecommendationService'
import { RecommendationService } from './RecommendationService'
import { EfficacyTrackingService } from './EfficacyTrackingService'
import { PatternRecognitionService } from './PatternRecognitionService'
import { PatternRecognitionFactory } from './PatternRecognitionFactory'
import type {
  PersonalizationService,
  PersonalizationStrategy,
  PersonalizationLayerOptions,
  TechniqueAdaptation,
} from './PersonalizationService'
import type { IRedisService } from '../../services/redis/types'
import type { TreatmentRecommendation } from './RecommendationService'
import type { AIRepository } from '../../db/ai/repository'
import type {
  PatternRecognitionOps,
  EncryptedPattern,
  EncryptedAnalysis,
  EncryptedCorrelation,
} from '../../fhe/pattern-recognition'

// Extended Interfaces
/**
 * Extended RedisService interface to include additional methods
 */
interface ExtendedRedisService extends IRedisService {
  deletePattern(pattern: string): Promise<void>
}

// Initialize logger
const logger = getLogger({ prefix: 'enhanced-recommendation-factory' })

// Define interface for ExtendedPersonalizationService (simplified version of what's in EnhancedRecommendationService)
interface ExtendedPersonalizationService extends PersonalizationService {
  updateClientProfile(
    clientId: string,
    profileData: {
      characteristics?: Record<string, unknown>
      history?: {
        pastTechniques?: Array<{
          techniqueId: string
          techniqueName: string
          lastUsed: Date
          efficacy: number
          usageCount: number
        }>
      }
    },
  ): Promise<void>

  applyPersonalizationLayer(
    clientId: string,
    recommendations: TreatmentRecommendation[],
    options?: PersonalizationLayerOptions,
  ): Promise<{
    personalizedRecommendations: TreatmentRecommendation[]
    techniqueAdaptations: Map<string, TechniqueAdaptation>
    personalizationExplanations?: Record<string, string[]>
    metadata?: {
      personalizationScore: number
      personalizationLevel: 'low' | 'medium' | 'high'
      strategiesApplied: PersonalizationStrategy[]
      clientInteractionCount: number
    }
    personalizationMetrics: {
      personalizationScore: number
      strategies: PersonalizationStrategy[]
    }
  }>
}

// Mock PersonalizationService for now (expand this to import the real service when available)
class DefaultPersonalizationService implements ExtendedPersonalizationService {
  async createPersonalizationFactors(clientId: string) {
    logger.debug('Creating personalization factors', { clientId })
    return {
      clientPreferences: [],
      pastTechniqueEfficacy: {},
      clientCharacteristics: {},
      treatmentHistory: [],
    }
  }

  async applyPersonalizationLayer(
    clientId: string,
    recommendations: TreatmentRecommendation[],
    options?: PersonalizationLayerOptions,
  ) {
    logger.debug('Applying personalization layer', {
      clientId,
      hasOptions: !!options,
    })
    return {
      personalizedRecommendations: recommendations,
      techniqueAdaptations: new Map<string, TechniqueAdaptation>(),
      personalizationExplanations: {},
      metadata: {
        personalizationScore: 0.5,
        personalizationLevel: 'low' as const,
        strategiesApplied: ['preference-based'] as PersonalizationStrategy[],
        clientInteractionCount: 0,
      },
      personalizationMetrics: {
        personalizationScore: 0.5,
        strategies: ['preference-based'] as PersonalizationStrategy[],
      },
    }
  }

  async getPersonalizationStrategies(): Promise<PersonalizationStrategy[]> {
    return []
  }

  async getTechniqueAdaptations(): Promise<Map<string, TechniqueAdaptation>> {
    return new Map()
  }

  async updateClientProfile(
    clientId: string,
    profileData: {
      characteristics?: Record<string, unknown>
      history?: {
        pastTechniques?: Array<{
          techniqueId: string
          techniqueName: string
          lastUsed: Date
          efficacy: number
          usageCount: number
        }>
      }
    },
  ): Promise<void> {
    // Implementation would store profile data
    const hasHistory = !!profileData.history
    logger.info('Updating client profile', { clientId, hasHistory })
  }
}

// Add ExtendedRedisService wrapper
const createExtendedRedisService = (
  redis?: IRedisService,
): ExtendedRedisService | undefined => {
  if (!redis) {
    return undefined
  }

  return {
    ...redis,
    deletePattern: async (pattern: string): Promise<void> => {
      logger.debug('Mock deletePattern implementation', { pattern })
    },
  }
}

/**
 * Creates a production-ready instance of EnhancedRecommendationService with all required dependencies
 */
export async function createProductionEnhancedRecommendationService(): Promise<EnhancedRecommendationService> {
  logger.info('Creating production EnhancedRecommendationService')

  try {
    // Create pattern recognition service
    const patternRecognitionService =
      await PatternRecognitionFactory.createProductionService()

    // Create recommendation service
    const recommendationService = new RecommendationService(
      patternRecognitionService,
    )

    // Create mock repositories for efficacy tracking
    const mockEfficacyRepository = {
      storeEfficacyFeedback: async () => {},
      getEfficacyFeedbackForTechnique: async () => [],
      getTechniqueById: async () => ({ name: 'Mock Technique' }),
      storeSentimentAnalysis: async () => {},
      storeCrisisDetection: async () => {},
      storeResponseGeneration: async () => {},
      storeInterventionAnalysis: async () => {},
      // Add other required methods for AIRepository
      storeSession: async () => {},
      getSessionById: async () => null,
      getSessionsByClientId: async () => [],
      updateSession: async () => {},
      deleteSession: async () => {},
      getAllSessions: async () => [],
      searchSessions: async () => [],
      getSessionCount: async () => 0,
      storeEvent: async () => {},
      getEvents: async () => [],
      // Additional required methods
      updateUsageStats: async () => {},
      getSentimentAnalysisByUser: async () => [],
      getCrisisDetectionByUser: async () => [],
      getResponseGenerationByUser: async () => [],
      getInterventionAnalysisByUser: async () => [],
      getTechniquesForIndication: async () => [],
      storeTherapeuticTechnique: async () => {},
      getEfficacyStatsByTechnique: async () => ({}),
    } as unknown as AIRepository
    const mockTechniqueRepository = {
      getTechniqueById: async () => ({ name: 'Mock Technique' }),
      getTechniquesForIndication: async () => [],
      storeSentimentAnalysis: async () => {},
      storeCrisisDetection: async () => {},
      storeResponseGeneration: async () => {},
      storeInterventionAnalysis: async () => {},
      storeSession: async () => {},
      getSessionById: async () => null,
      getSessionsByClientId: async () => [],
      updateSession: async () => {},
      deleteSession: async () => {},
      getAllSessions: async () => [],
      searchSessions: async () => [],
      getSessionCount: async () => 0,
      storeEvent: async () => {},
      getEvents: async () => [],
      updateUsageStats: async () => {},
      getSentimentAnalysisByUser: async () => [],
      getCrisisDetectionByUser: async () => [],
      getResponseGenerationByUser: async () => [],
      getInterventionAnalysisByUser: async () => [],
      storeTherapeuticTechnique: async () => {},
      getEfficacyStatsByTechnique: async () => ({}),
      storeEfficacyFeedback: async () => {},
      getEfficacyFeedbackForTechnique: async () => [],
    } as unknown as AIRepository

    // Create efficacy tracking service
    const efficacyTrackingService = new EfficacyTrackingService(
      mockEfficacyRepository,
      mockTechniqueRepository,
    )

    // Create personalization service (replace with actual implementation when available)
    const personalizationService = new DefaultPersonalizationService()

    // Create and return the enhanced recommendation service
    return new EnhancedRecommendationService(
      recommendationService,
      efficacyTrackingService,
      personalizationService,
      createExtendedRedisService(undefined),
    )
  } catch (error) {
    logger.error('Failed to create EnhancedRecommendationService', { error })
    throw new Error(
      'Failed to initialize EnhancedRecommendationService: ' +
        (error instanceof Error ? error.message : String(error)),
    )
  }
}

/**
 * Creates a test instance of EnhancedRecommendationService with mocked dependencies
 */
export function createTestEnhancedRecommendationService(
  mockRedisService?: IRedisService,
): EnhancedRecommendationService {
  logger.info('Creating test EnhancedRecommendationService')

  // Create mock FHE service and configuration for pattern recognition
  const mockFHEService = {
    processPatterns: async (): Promise<EncryptedPattern[]> => [],
    identifyCrossSessionPatterns: async (): Promise<EncryptedPattern[]> => [],
    analyzeRiskCorrelations: async (): Promise<EncryptedCorrelation[]> => [],
    getEncryptedAnalysisResults: async (): Promise<EncryptedAnalysis[]> => [],
    decryptAnalysisResults: async () => [],
    // Additional required methods
    decryptPatterns: async () => [],
    analyzeCrossSessions: async (): Promise<EncryptedAnalysis> => ({
      id: 'mock-id',
      encryptedData: 'mock-data',
      metadata: { timestamp: Date.now(), analysisType: 'cross-session' },
    }),
    decryptCrossSessionAnalysis: async () => ({}),
    processRiskCorrelations: async (): Promise<EncryptedCorrelation[]> => [],
    decryptRiskCorrelations: async () => [],
  } as unknown as PatternRecognitionOps
  const mockConfig = {
    timeWindow: 7,
    minDataPoints: 3,
    confidenceThreshold: 0.7,
    riskFactorWeights: {},
  }

  // Create test pattern recognition service
  const patternRecognitionService = new PatternRecognitionService(
    mockFHEService,
    mockConfig,
  )

  // Create recommendation service
  const recommendationService = new RecommendationService(
    patternRecognitionService,
  )

  // Create mock repositories for efficacy tracking
  const mockEfficacyRepository = {
    storeEfficacyFeedback: async () => {},
    getEfficacyFeedbackForTechnique: async () => [],
    getTechniqueById: async () => ({ name: 'Mock Technique' }),
    storeSentimentAnalysis: async () => {},
    storeCrisisDetection: async () => {},
    storeResponseGeneration: async () => {},
    storeInterventionAnalysis: async () => {},
    storeSession: async () => {},
    getSessionById: async () => null,
    getSessionsByClientId: async () => [],
    updateSession: async () => {},
    deleteSession: async () => {},
    getAllSessions: async () => [],
    searchSessions: async () => [],
    getSessionCount: async () => 0,
    storeEvent: async () => {},
    getEvents: async () => [],
    updateUsageStats: async () => {},
    getSentimentAnalysisByUser: async () => [],
    getCrisisDetectionByUser: async () => [],
    getResponseGenerationByUser: async () => [],
    getInterventionAnalysisByUser: async () => [],
    getTechniquesForIndication: async () => [],
    storeTherapeuticTechnique: async () => {},
    getEfficacyStatsByTechnique: async () => ({}),
  } as unknown as AIRepository
  const mockTechniqueRepository = {
    getTechniqueById: async () => ({ name: 'Mock Technique' }),
    getTechniquesForIndication: async () => [],
    storeSentimentAnalysis: async () => {},
    storeCrisisDetection: async () => {},
    storeResponseGeneration: async () => {},
    storeInterventionAnalysis: async () => {},
    storeSession: async () => {},
    getSessionById: async () => null,
    getSessionsByClientId: async () => [],
    updateSession: async () => {},
    deleteSession: async () => {},
    getAllSessions: async () => [],
    searchSessions: async () => [],
    getSessionCount: async () => 0,
    storeEvent: async () => {},
    getEvents: async () => [],
    updateUsageStats: async () => {},
    getSentimentAnalysisByUser: async () => [],
    getCrisisDetectionByUser: async () => [],
    getResponseGenerationByUser: async () => [],
    getInterventionAnalysisByUser: async () => [],
    storeTherapeuticTechnique: async () => {},
    getEfficacyStatsByTechnique: async () => ({}),
    storeEfficacyFeedback: async () => {},
    getEfficacyFeedbackForTechnique: async () => [],
  } as unknown as AIRepository

  // Create efficacy tracking service
  const efficacyTrackingService = new EfficacyTrackingService(
    mockEfficacyRepository,
    mockTechniqueRepository,
  )

  // Create personalization service
  const personalizationService = new DefaultPersonalizationService()

  // Create and return the enhanced recommendation service
  return new EnhancedRecommendationService(
    recommendationService,
    efficacyTrackingService,
    personalizationService,
    createExtendedRedisService(mockRedisService),
  )
}
