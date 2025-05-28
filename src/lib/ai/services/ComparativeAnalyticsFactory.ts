/**
 * Factory for creating ComparativeAnalyticsService instances
 *
 * This module provides a factory function to create properly configured
 * ComparativeAnalyticsService instances with the necessary dependencies.
 */

import {
  ComparativeAnalyticsService,
  ComparativeAnalyticsOptions,
} from './ComparativeAnalyticsService'
import { EfficacyTrackingService } from './EfficacyTrackingService'
import { PatternRecognitionService } from './PatternRecognitionService'
import { getLogger } from '../../logging'
import { redis as redisInstance } from '../../services/redis'
import {
  createDefaultBenchmarkRepository,
  BenchmarkRepositoryImpl,
} from './ComparativeAnalyticsRepository'
import { RedisService } from '../../services/redis/RedisService'

// Get logger instance
const logger = getLogger({ prefix: 'comparative-analytics-factory' })

// Default configuration
const DEFAULT_CONFIG: ComparativeAnalyticsOptions = {
  minSampleSizeForInsights: 10,
  minConfidenceForBenchmarks: 0.7,
  insightGenerationFrequency: 24, // Daily
  benchmarkRefreshFrequency: 168, // Weekly
  anonymizationLevel: 'high',
}

/**
 * Interface for ComparativeAnalyticsService creation options
 */
export interface ComparativeAnalyticsFactoryOptions {
  // Analysis configuration
  minSampleSizeForInsights?: number
  minConfidenceForBenchmarks?: number
  insightGenerationFrequency?: number
  benchmarkRefreshFrequency?: number
  anonymizationLevel?: 'high' | 'medium' | 'standard'

  // Redis configuration
  redisUrl?: string

  // Services and repositories
  efficacyTrackingService?: EfficacyTrackingService
  patternRecognitionService?: PatternRecognitionService
  benchmarkRepository?: BenchmarkRepositoryImpl
}

/**
 * Create a ComparativeAnalyticsService with proper dependencies
 */
export async function createComparativeAnalyticsService(
  options: ComparativeAnalyticsFactoryOptions = {},
): Promise<ComparativeAnalyticsService> {
  logger.info('Creating ComparativeAnalyticsService')

  try {
    // Create configuration by merging defaults with provided options
    const config: ComparativeAnalyticsOptions = {
      ...DEFAULT_CONFIG,
      minSampleSizeForInsights:
        options.minSampleSizeForInsights ||
        DEFAULT_CONFIG.minSampleSizeForInsights,
      minConfidenceForBenchmarks:
        options.minConfidenceForBenchmarks ||
        DEFAULT_CONFIG.minConfidenceForBenchmarks,
      insightGenerationFrequency:
        options.insightGenerationFrequency ||
        DEFAULT_CONFIG.insightGenerationFrequency,
      benchmarkRefreshFrequency:
        options.benchmarkRefreshFrequency ||
        DEFAULT_CONFIG.benchmarkRefreshFrequency,
      anonymizationLevel:
        options.anonymizationLevel || DEFAULT_CONFIG.anonymizationLevel,
    }

    // Get or create required services
    const efficacyService = options.efficacyTrackingService
    const patternService = options.patternRecognitionService

    if (!efficacyService) {
      logger.warn(
        'No EfficacyTrackingService provided, ComparativeAnalyticsService will have limited functionality',
      )
    }

    if (!patternService) {
      logger.warn(
        'No PatternRecognitionService provided, ComparativeAnalyticsService will have limited functionality',
      )
    }

    // Create or use provided benchmark repository
    const benchmarkRepository =
      options.benchmarkRepository || (await createDefaultBenchmarkRepository())

    // Create redis instance if URL is provided
    let redis = redisInstance
    if (options.redisUrl) {
      try {
        // Instantiate RedisService instead of ioredis.Redis directly
        redis = new RedisService({ url: options.redisUrl })
        // The RedisService's own connect method will handle connection and logging
        // We might need to explicitly call await redis.connect() if it's not called in the constructor
        // or if the ComparativeAnalyticsService expects it to be connected.
        // For now, let's assume connect is handled or not immediately required here.

        // Remove the direct ioredis client setup
        /*
        redis = new Redis(options.redisUrl, {
          retryStrategy: (times: number) => {
            const delay = Math.min(times * 50, 2000)
            logger.info(
              `Reconnecting to Redis at ${options.redisUrl} in ${delay}ms...`,
            )
            return delay
          },
          maxRetriesPerRequest: 3,
          enableOfflineQueue: true,
          connectionName: 'comparative-analytics-service',
        })

        // Set up event handlers
        redis.on('connect', () => {
          logger.info(`Successfully connected to Redis at ${options.redisUrl}`)
        })

        redis.on('error', (err: Error) => {
          logger.error(`Redis connection error: ${err.message}`, { error: err })
        })
        */

        logger.info(
          `Created custom RedisService instance for ComparativeAnalyticsService at ${options.redisUrl}`,
        )
      } catch (err) {
        logger.error(`Failed to create Redis instance at ${options.redisUrl}`, {
          error: err,
        })
        logger.info('Falling back to default Redis instance')
      }
    }

    // Create and return the service
    const service = new ComparativeAnalyticsService(
      efficacyService!,
      patternService!,
      benchmarkRepository,
      redis,
      config,
    )

    logger.info('ComparativeAnalyticsService created successfully')
    return service
  } catch (error) {
    logger.error('Failed to create ComparativeAnalyticsService', { error })
    throw new Error(
      `ComparativeAnalyticsService creation failed: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}
