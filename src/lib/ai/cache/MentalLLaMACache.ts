import type { RedisService } from '../../../services/redis/RedisService' // Adjusted path
import { generateHash } from '../../../crypto/hash' // Adjusted path
import { appLogger as logger } from '../../../logging' // Assuming logger path

// Placeholder types - will be refined based on MentalLLaMAAdapter actual types
// These will be imported from MentalLLaMAAdapter or related type files eventually
interface MentalLLaMACacheKeyParams {
  text: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  categories?: any[] // Simplified for now
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  routingContextParams?: any // Simplified for now
  // Potentially add model version or other factors if they vary
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MentalLLaMAResponseType = any // Simplified for now

const MENTAL_LLAMA_CACHE_PREFIX = 'mentalllama:'
const DEFAULT_MENTAL_LLAMA_CACHE_TTL_SECONDS = 3600 // 1 hour

export class MentalLLaMACache {
  private redis: RedisService
  private defaultTTL: number

  constructor(redis: RedisService, defaultTTLSeconds?: number) {
    this.redis = redis
    const envTTL = process.env.MENTAL_LLAMA_CACHE_TTL_SECONDS
      ? parseInt(process.env.MENTAL_LLAMA_CACHE_TTL_SECONDS, 10)
      : NaN
    this.defaultTTL = !isNaN(envTTL)
      ? envTTL
      : (defaultTTLSeconds ?? DEFAULT_MENTAL_LLAMA_CACHE_TTL_SECONDS)

    logger.info(
      `MentalLLaMACache initialized with TTL: ${this.defaultTTL} seconds.`,
    )
  }

  private generateCacheKey(params: MentalLLaMACacheKeyParams): string {
    // Sort keys in objects to ensure consistent hash for same logical params
    const sortedParams = JSON.stringify(params, (key, value) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return (
          Object.keys(value)
            .sort()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .reduce((sortedObj: any, k) => {
              sortedObj[k] = value[k]
              return sortedObj
            }, {})
        )
      }
      return value
    })
    return `${MENTAL_LLAMA_CACHE_PREFIX}${generateHash(sortedParams)}`
  }

  async get(
    params: MentalLLaMACacheKeyParams,
  ): Promise<MentalLLaMAResponseType | null> {
    if (
      !process.env.MENTAL_LLAMA_CACHE_ENABLED ||
      process.env.MENTAL_LLAMA_CACHE_ENABLED === 'false'
    ) {
      logger.debug('MentalLLaMACache is disabled. Skipping get.')
      return null
    }
    const key = this.generateCacheKey(params)
    try {
      const cachedData = await this.redis.get(key)
      if (cachedData) {
        logger.debug({ cacheKey: key }, 'MentalLLaMACache hit.')
        return JSON.parse(cachedData) as MentalLLaMAResponseType
      }
      logger.debug({ cacheKey: key }, 'MentalLLaMACache miss.')
      return null
    } catch (error) {
      logger.error(
        { cacheKey: key, error },
        'MentalLLaMACache: Error getting data from Redis.',
      )
      return null // Treat cache errors as a cache miss
    }
  }

  async set(
    params: MentalLLaMACacheKeyParams,
    response: MentalLLaMAResponseType,
    ttlSeconds?: number,
  ): Promise<void> {
    if (
      !process.env.MENTAL_LLAMA_CACHE_ENABLED ||
      process.env.MENTAL_LLAMA_CACHE_ENABLED === 'false'
    ) {
      logger.debug('MentalLLaMACache is disabled. Skipping set.')
      return
    }
    const key = this.generateCacheKey(params)
    const effectiveTTL = ttlSeconds ?? this.defaultTTL
    try {
      await this.redis.set(key, JSON.stringify(response), effectiveTTL)
      logger.debug(
        { cacheKey: key, ttl: effectiveTTL },
        'MentalLLaMACache: Data set in Redis.',
      )
    } catch (error) {
      logger.error(
        { cacheKey: key, error },
        'MentalLLaMACache: Error setting data in Redis.',
      )
    }
  }

  async clear(params: MentalLLaMACacheKeyParams): Promise<void> {
    const key = this.generateCacheKey(params)
    try {
      await this.redis.del(key)
      logger.info(
        { cacheKey: key },
        'MentalLLaMACache: Key deleted from Redis.',
      )
    } catch (error) {
      logger.error(
        { cacheKey: key, error },
        'MentalLLaMACache: Error deleting key from Redis.',
      )
    }
  }

  async clearAllMentalLLaMACache(): Promise<void> {
    try {
      const keys = await this.redis.keys(`${MENTAL_LLAMA_CACHE_PREFIX}*`)
      if (keys.length > 0) {
        // Assuming redis.del can take multiple keys or we loop
        // For simplicity, let's assume it can take an array or we handle it in RedisService
        // TherapyAICache looped, so we should loop here too if RedisService.del is single.
        for (const k of keys) {
          await this.redis.del(k)
        }
        logger.info(
          `MentalLLaMACache: Cleared ${keys.length} keys with prefix ${MENTAL_LLAMA_CACHE_PREFIX}.`,
        )
      } else {
        logger.info(
          `MentalLLaMACache: No keys found with prefix ${MENTAL_LLAMA_CACHE_PREFIX} to clear.`,
        )
      }
    } catch (error) {
      logger.error(
        { error },
        'MentalLLaMACache: Error clearing all MentalLLaMA cache.',
      )
    }
  }
}
