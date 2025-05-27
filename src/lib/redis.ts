/**
 * Redis client wrapper for Upstash Redis
 * This module provides a consistent interface for Redis operations with proper error handling
 */

import { Redis } from '@upstash/redis'
import { config } from '../config/env.config'

// Determine if we're in a production environment
const isProduction = config.isProduction()

// Get Redis credentials from environment
const restUrl = config.redis.url()
const restToken = config.redis.token()

// Log appropriate warnings in production
if (isProduction && (!restUrl || !restToken)) {
  console.error('CRITICAL: Missing Redis credentials in production environment')
}

// Create a mock Redis client for development
function createMockRedisClient() {
  const message = isProduction
    ? 'CRITICAL: Using mock Redis client in production. This should never happen.'
    : 'Using mock Redis client for development. This should not be used in production.'

  console.warn(message)

  return {
    get: async (_key: string) => null,
    set: async (_key: string, _value: any, _options?: any) => 'OK',
    del: async (_key: string) => 1,
    incr: async (_key: string) => 1,
    exists: async (_key: string) => 0,
    expire: async (_key: string, _seconds: number) => 1,
    hset: async (_key: string, _field: string, _value: any) => 1,
    hget: async (_key: string, _field: string) => null,
    hgetall: async (_key: string) => ({}),
    hdel: async (_key: string, _field: string) => 1,
    disconnect: async () => {},
  }
}

// Check if we have valid credentials
const hasValidCredentials = Boolean(restUrl && restToken)

// Create Redis client with appropriate configuration
export const redis = hasValidCredentials
  ? new Redis({
      url: restUrl as string,
      token: restToken as string,
      retry: {
        retries: 3,
        backoff: (retryCount) => Math.min(retryCount * 500, 3000),
      },
    })
  : (createMockRedisClient() as any)

/**
 * Wrapper function for Redis get with error handling
 */
export async function getFromCache<T>(key: string): Promise<T | null> {
  try {
    return (await redis.get(key)) as T | null
  } catch (error) {
    console.error(`Error getting key ${key} from Redis:`, error)
    return null
  }
}

/**
 * Wrapper function for Redis set with error handling
 */
export async function setInCache(
  key: string,
  value: any,
  expirationSeconds?: number,
): Promise<boolean> {
  try {
    const options = expirationSeconds ? { ex: expirationSeconds } : undefined
    await redis.set(key, value, options)
    return true
  } catch (error) {
    console.error(`Error setting key ${key} in Redis:`, error)
    return false
  }
}

/**
 * Wrapper function for Redis del with error handling
 */
export async function removeFromCache(key: string): Promise<boolean> {
  try {
    await redis.del(key)
    return true
  } catch (error) {
    console.error(`Error removing key ${key} from Redis:`, error)
    return false
  }
}

/**
 * Check Redis connectivity
 */
export async function checkRedisConnection(): Promise<boolean> {
  try {
    const pingResult = await redis.ping()
    return pingResult === 'PONG'
  } catch (error) {
    console.error('Redis connectivity check failed:', error)
    return false
  }
}

/**
 * Health check for Redis service
 */
export async function getRedisHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy'
  details?: any
}> {
  try {
    const isConnected = await checkRedisConnection()
    if (isConnected) {
      return { status: 'healthy' }
    } else {
      return {
        status: 'unhealthy',
        details: { message: 'Could not connect to Redis' },
      }
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      details: {
        message: 'Redis health check failed',
        error: error instanceof Error ? error.message : String(error),
      },
    }
  }
}
