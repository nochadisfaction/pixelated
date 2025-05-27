/**
 * Factory for creating PatternRecognitionService instances
 *
 * This module provides a factory function to create properly configured
 * PatternRecognitionService instances with the enhanced FHE service.
 */

import { PatternRecognitionService } from './PatternRecognitionService'
import { createPatternRecognitionFHEService } from '../../fhe/pattern-recognition-factory'
import { RedisService, redis as redisInstance } from '../../services/redis'
import { getLogger } from '../../logging'

// Get logger instance
const logger = getLogger({ prefix: 'pattern-recognition-factory' })

// Default configuration
const DEFAULT_CONFIG = {
  timeWindow: 7, // 7 days window for analysis
  minDataPoints: 5, // Minimum number of data points required
  confidenceThreshold: 0.75, // Minimum confidence level for patterns
  riskFactorWeights: {
    suicidal: 1.0,
    depression: 0.8,
    anxiety: 0.7,
    isolation: 0.6,
    substance_use: 0.9,
  },
}

/**
 * Interface for PatternRecognitionService creation options
 */
export interface PatternRecognitionOptions {
  // Analysis configuration
  timeWindow?: number
  minDataPoints?: number
  confidenceThreshold?: number
  riskFactorWeights?: Record<string, number>

  // FHE configuration
  fheConfig?: Record<string, unknown>

  // Redis configuration
  redisUrl?: string

  // Repositories
  sessionRepository?: any
  analysisRepository?: any
}

/**
 * Create a properly configured PatternRecognitionService
 */
export async function createPatternRecognitionService(
  options: PatternRecognitionOptions = {},
): Promise<PatternRecognitionService> {
  try {
    logger.info('Creating PatternRecognitionService')

    // Create pattern recognition FHE service using the new factory
    const fheService = await createPatternRecognitionFHEService(
      options.fheConfig,
    )
    logger.info('Pattern recognition FHE service initialized')

    // Get Redis service - use the singleton or create a new instance if custom URL provided
    let redisService
    if (options.redisUrl) {
      redisService = new RedisService({
        url: options.redisUrl,
        maxRetries: 3,
        retryDelay: 1000,
        connectTimeout: 5000,
      })
      await redisService.connect()
    } else {
      redisService = redisInstance
      // Ensure the singleton is connected - we always call connect() which is safe to call multiple times
      await redisInstance.connect()
    }
    logger.info('Redis service connected')

    // Merge default config with provided options
    const config = {
      timeWindow: options.timeWindow || DEFAULT_CONFIG.timeWindow,
      minDataPoints: options.minDataPoints || DEFAULT_CONFIG.minDataPoints,
      confidenceThreshold:
        options.confidenceThreshold || DEFAULT_CONFIG.confidenceThreshold,
      riskFactorWeights:
        options.riskFactorWeights || DEFAULT_CONFIG.riskFactorWeights,
    }

    // Create and return the service
    const service = new PatternRecognitionService(
      fheService,
      redisService,
      config,
      options.sessionRepository,
      options.analysisRepository,
    )

    logger.info('PatternRecognitionService created successfully')
    return service
  } catch (error) {
    logger.error('Failed to create PatternRecognitionService', { error })
    throw new Error(
      `PatternRecognitionService creation failed: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

/**
 * Create PatternRecognitionService with default configuration for development
 */
export async function createDevPatternRecognitionService(): Promise<PatternRecognitionService> {
  return createPatternRecognitionService({
    // Development-specific configuration
    timeWindow: 30, // Larger window for development
    minDataPoints: 3, // Lower threshold for development
    confidenceThreshold: 0.6, // Lower confidence threshold for development

    // Development FHE config
    fheConfig: {
      mode: 'development',
      useMock: true,
      enableDebug: true,
    },
  })
}

/**
 * Factory class with static methods for creating PatternRecognitionService instances
 */
export class PatternRecognitionFactory {
  /**
   * Create a production-ready PatternRecognitionService with optimized settings
   */
  static async createProductionService(): Promise<PatternRecognitionService> {
    logger.info('Creating production PatternRecognitionService')

    return createPatternRecognitionService({
      // Production-specific configuration
      timeWindow: 14, // 2 weeks window for analysis in production
      minDataPoints: 7, // Higher threshold for production
      confidenceThreshold: 0.8, // Higher confidence threshold for production

      // Production FHE config
      fheConfig: {
        mode: 'production',
        useMock: false,
        enableDebug: false,
        cacheResults: true,
      },
    })
  }

  /**
   * Create a testing PatternRecognitionService with mocked dependencies
   */
  static createTestService(): PatternRecognitionService {
    logger.info('Creating test PatternRecognitionService')

    // For tests, we create a basic service without external dependencies
    return new PatternRecognitionService()
  }
}
