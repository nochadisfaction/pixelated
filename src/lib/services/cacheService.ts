import { Redis } from '@upstash/redis'
import { getLogger } from '../utils/logger'

const logger = getLogger({ prefix: 'cache-service' })

// Types for cache entries
interface CacheEntry<T> {
  value: T
  expires: number // Timestamp when entry expires
}

/**
 * Cache Service Interface
 * Provides methods for caching data with TTL support
 */
export interface CacheService {
  /**
   * Get a value from the cache
   * @param key Cache key
   * @returns Cached value or null if not found/expired
   */
  get<T = string>(key: string): Promise<T | null>

  /**
   * Set a value in the cache with TTL
   * @param key Cache key
   * @param value Value to cache
   * @param ttl Time to live in seconds (default: 5 minutes)
   */
  set(key: string, value: string, ttl?: number): Promise<void>

  /**
   * Delete a value from the cache
   * @param key Cache key
   */
  delete(key: string): Promise<void>

  /**
   * Clear all values with a specific prefix
   * @param prefix Key prefix to clear
   */
  clearByPrefix(prefix: string): Promise<void>

  /**
   * Get multiple values from the cache
   * @param keys Array of cache keys
   * @returns Object mapping keys to values
   */
  mget<T = string>(keys: string[]): Promise<Record<string, T | null>>
}

/**
 * Redis Cache Service Implementation
 * Uses Redis for distributed caching across instances
 */
class RedisCacheService implements CacheService {
  private redis: Redis
  private connected = false
  private readonly prefix = 'app:cache:'

  constructor() {
    // Initialize Redis client
    try {
      this.redis = new Redis({
        url: import.meta.env.REDIS_URL || '',
        token: import.meta.env.REDIS_TOKEN || '',
      })
      this.connected = true
      logger.info('Redis cache service initialized')
    } catch (error) {
      logger.error('Failed to initialize Redis cache service', { error })
      this.connected = false
    }
  }

  private getFullKey(key: string): string {
    return `${this.prefix}${key}`
  }

  async get<T = string>(key: string): Promise<T | null> {
    if (!this.connected) {
      return null
    }

    try {
      const fullKey = this.getFullKey(key)
      const result = await this.redis.get<T>(fullKey)

      if (result) {
        logger.debug('Cache hit', { key })
        return result
      }

      logger.debug('Cache miss', { key })
      return null
    } catch (error) {
      logger.error('Error getting from cache', { key, error })
      return null
    }
  }

  async set(key: string, value: string, ttl = 300): Promise<void> {
    if (!this.connected) {
      return
    }

    try {
      const fullKey = this.getFullKey(key)
      await this.redis.set(fullKey, value, { ex: ttl })
      logger.debug('Cached value', { key, ttl })
    } catch (error) {
      logger.error('Error setting cache', { key, error })
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.connected) {
      return
    }

    try {
      const fullKey = this.getFullKey(key)
      await this.redis.del(fullKey)
      logger.debug('Deleted from cache', { key })
    } catch (error) {
      logger.error('Error deleting from cache', { key, error })
    }
  }

  async clearByPrefix(prefix: string): Promise<void> {
    if (!this.connected) {
      return
    }

    try {
      const fullPrefix = this.getFullKey(prefix)
      const keys = await this.redis.keys(`${fullPrefix}*`)

      if (keys.length > 0) {
        await this.redis.del(...keys)
        logger.info('Cleared cache by prefix', { prefix, count: keys.length })
      }
    } catch (error) {
      logger.error('Error clearing cache by prefix', { prefix, error })
    }
  }

  async mget<T = string>(keys: string[]): Promise<Record<string, T | null>> {
    if (!this.connected || keys.length === 0) {
      return {}
    }

    try {
      const fullKeys = keys.map((key) => this.getFullKey(key))
      const results = await this.redis.mget<T[]>(...fullKeys)

      const resultMap: Record<string, T | null> = {}
      keys.forEach((key, index) => {
        resultMap[key] = results[index]
      })

      return resultMap
    } catch (error) {
      logger.error('Error getting multiple values from cache', { error })
      return {}
    }
  }
}

/**
 * Memory Cache Service Implementation
 * Uses in-memory Map for local caching (fallback when Redis is unavailable)
 */
class MemoryCacheService implements CacheService {
  private cache = new Map<string, CacheEntry<any>>()
  private readonly maxEntries = 1000
  private readonly prefix = 'memory:'
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    // Periodic cleanup of expired entries
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000)
    logger.info('Memory cache service initialized')
  }

  private getFullKey(key: string): string {
    return `${this.prefix}${key}`
  }

  private cleanup(): void {
    const now = Date.now()
    let expiredCount = 0

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expires < now) {
        this.cache.delete(key)
        expiredCount++
      }
    }

    if (expiredCount > 0) {
      logger.debug('Cleaned up expired cache entries', { count: expiredCount })
    }
  }

  async get<T = string>(key: string): Promise<T | null> {
    const fullKey = this.getFullKey(key)
    const entry = this.cache.get(fullKey)

    if (!entry) {
      logger.debug('Memory cache miss', { key })
      return null
    }

    const now = Date.now()
    if (entry.expires < now) {
      this.cache.delete(fullKey)
      logger.debug('Memory cache expired', { key })
      return null
    }

    logger.debug('Memory cache hit', { key })
    return entry.value
  }

  async set(key: string, value: string, ttl = 300): Promise<void> {
    // Ensure we don't exceed max entries
    if (this.cache.size >= this.maxEntries) {
      this.evictOldest()
    }

    const fullKey = this.getFullKey(key)
    const expires = Date.now() + ttl * 1000

    this.cache.set(fullKey, { value, expires })
    logger.debug('Set memory cache', { key, ttl })
  }

  async delete(key: string): Promise<void> {
    const fullKey = this.getFullKey(key)
    this.cache.delete(fullKey)
    logger.debug('Deleted from memory cache', { key })
  }

  async clearByPrefix(prefix: string): Promise<void> {
    const fullPrefix = this.getFullKey(prefix)
    let count = 0

    for (const key of this.cache.keys()) {
      if (key.startsWith(fullPrefix)) {
        this.cache.delete(key)
        count++
      }
    }

    logger.info('Cleared memory cache by prefix', { prefix, count })
  }

  async mget<T = string>(keys: string[]): Promise<Record<string, T | null>> {
    const result: Record<string, T | null> = {}
    const now = Date.now()

    for (const key of keys) {
      const fullKey = this.getFullKey(key)
      const entry = this.cache.get(fullKey)

      if (entry && entry.expires > now) {
        result[key] = entry.value
      } else {
        result[key] = null
        if (entry) {
          this.cache.delete(fullKey)
        }
      }
    }

    return result
  }

  private evictOldest(): void {
    let oldestKey: string | null = null
    let oldestTime = Infinity

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expires < oldestTime) {
        oldestTime = entry.expires
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
      logger.debug('Evicted oldest entry from memory cache')
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval)
    this.cache.clear()
    logger.debug('Memory cache service destroyed')
  }
}

// Singleton instances
let redisCacheService: RedisCacheService | null = null
let memoryCacheService: MemoryCacheService | null = null

/**
 * Get the appropriate cache service.
 * Tries to use Redis first, falls back to in-memory cache
 *
 * @returns CacheService implementation
 */
export function getCacheService(): CacheService {
  // Initialize Redis cache service if not already initialized
  if (!redisCacheService) {
    redisCacheService = new RedisCacheService()
  }

  // Initialize memory cache service if not already initialized
  if (!memoryCacheService) {
    memoryCacheService = new MemoryCacheService()
  }

  // Use Redis if connected, otherwise fall back to memory cache
  if (redisCacheService.connected) {
    return redisCacheService
  } else {
    return memoryCacheService
  }
}

/**
 * Higher-order function to cache the results of any async function
 *
 * @param fn Function to cache results for
 * @param keyPrefix Prefix for cache keys
 * @param ttl TTL in seconds
 * @returns Cached version of the function
 */
export function withCache<T, Args extends any[]>(
  fn: (...args: Args) => Promise<T>,
  keyPrefix: string,
  ttl: number = 300,
): (...args: Args) => Promise<T> {
  const cacheService = getCacheService()

  return async (...args: Args): Promise<T> => {
    // Generate cache key from function arguments
    const argsHash = JSON.stringify(args)
    const key = `${keyPrefix}:${Buffer.from(argsHash).toString('base64')}`

    // Try to get from cache
    const cached = await cacheService.get<T>(key)
    if (cached !== null) {
      return cached
    }

    // Call original function
    const result = await fn(...args)

    // Cache the result
    await cacheService.set(key, JSON.stringify(result), ttl)

    return result
  }
}
