import type { RedisServiceConfig, IRedisService } from './types'
import { EventEmitter } from 'node:events'
import { getLogger } from '~/lib/logging'
import Redis from 'ioredis'
import { RedisErrorCode, RedisServiceError } from './types'

const logger = getLogger()

/**
 * Redis service implementation with connection pooling and health checks
 */
export class RedisService extends EventEmitter implements IRedisService {
  [x: string]: unknown
  getClient(): Redis | import('.').RedisService {
    throw new Error('Method not implemented.')
  }
  private client: Redis | null = null
  private subscribers: Map<string, Redis> = new Map()
  private healthCheckInterval: NodeJS.Timeout | null = null
  private readonly config: RedisServiceConfig

  constructor(config: RedisServiceConfig = { url: '' }) {
    super()
    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      maxConnections: 10,
      url: '',
    }
    this.validateConfig(config)
  }

  private validateConfig(config: RedisServiceConfig): void {
    // Merge the provided config with defaults
    Object.assign(this.config, config)

    // Check if we have either UPSTASH_REDIS_REST_URL or traditional Redis URL
    const hasUpstashUrl = Boolean(process.env.UPSTASH_REDIS_REST_URL)
    const hasRedisUrl = Boolean(process.env.REDIS_URL)

    // If environment variables exist, use them regardless of what was in config
    if (hasUpstashUrl) {
      this.config.url = process.env.UPSTASH_REDIS_REST_URL as string
    } else if (hasRedisUrl) {
      this.config.url = process.env.REDIS_URL as string
    }

    // After all resolution, if we still don't have a URL and we're not in development
    if (!this.config.url && !hasUpstashUrl && !hasRedisUrl) {
      // If we're in development mode, we can use mock services
      if (process.env.NODE_ENV === 'development') {
        // Just log a warning
        logger.warn('No Redis URL configured, using mock Redis in development')
        return
      }

      logger.error('No Redis URL available, service may not function properly')
      // Don't throw during build, just warn heavily
      if (process.env.NODE_ENV !== 'production') {
        return
      }
    }

    // Successfully validated
  }

  async connect(): Promise<void> {
    try {
      if (this.client) {
        return
      }

      // If no URL is configured and we're in development, return early
      if (!this.config.url && process.env.NODE_ENV === 'development') {
        logger.warn(
          'No Redis URL configured, skipping connection in development',
        )
        // Don't create a client - we'll use the mock client when needed
        return
      }

      this.client = new Redis(this.config.url, {
        keyPrefix: this.config.keyPrefix,
        maxRetriesPerRequest: this.config.maxRetries,
        retryStrategy: (times: number) => {
          if (times > (this.config.maxRetries || 3)) {
            return null
          }
          return this.config.retryDelay || 100
        },
        connectTimeout: this.config.connectTimeout,
      })

      // Set up event handlers
      this.client.on('error', (error) => {
        logger.error('Redis error:', { error: String(error) })
      })

      this.client.on('connect', () => {
        logger.info('Connected to Redis')
      })

      this.client.on('close', () => {
        logger.warn('Redis connection closed')
      })

      await this.client.connect()

      // Start health checks
      this.startHealthCheck()
    } catch (error) {
      // In development, we can continue without Redis
      if (process.env.NODE_ENV === 'development') {
        logger.warn(
          'Failed to connect to Redis in development, will use mock:',
          {
            error: error instanceof Error ? error.message : String(error),
          },
        )
        // Clear the client so we'll use the mock
        this.client = null
        return
      }

      throw new RedisServiceError(
        RedisErrorCode.CONNECTION_FAILED,
        'Failed to connect to Redis',
        error,
      )
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval)
        this.healthCheckInterval = null
      }

      if (this.client) {
        await this.client.quit()
        this.client = null
      }

      await Promise.all(
        Array.from(this.subscribers.values()).map((sub) => sub.quit()),
      )
      this.subscribers.clear()
    } catch (error) {
      throw new RedisServiceError(
        RedisErrorCode.CONNECTION_CLOSED,
        'Error disconnecting from Redis',
        error,
      )
    }
  }

  private async ensureConnection(): Promise<Redis> {
    if (!this.client) {
      await this.connect()
    }

    if (!this.client) {
      // If we're in development, return a mock client
      if (process.env.NODE_ENV === 'development') {
        logger.warn('Using mock Redis client in development')
        // Create a mock client that implements basic Redis methods
        return this.createMockClient()
      }

      throw new RedisServiceError(
        RedisErrorCode.CONNECTION_FAILED,
        'Redis client is not initialized',
      )
    }

    return this.client
  }

  // Mock client for development when no Redis URL is available
  private createMockClient(): Redis {
    // Create a simple in-memory store
    const store = new Map<string, string>()
    const setStore = new Map<string, Set<string>>()

    // We need to cast this to Redis because we're creating a partial implementation
    return {
      get: async (key: string) => store.get(key) || null,
      set: async (key: string, value: string) => {
        store.set(key, value)
        return 'OK'
      },
      del: async (key: string) => {
        const deleted = store.delete(key)
        return deleted ? 1 : 0
      },
      exists: async (key: string) => (store.has(key) ? 1 : 0),
      sadd: async (key: string, member: string) => {
        if (!setStore.has(key)) {
          setStore.set(key, new Set())
        }
        const set = setStore.get(key)!
        const existed = set.has(member)
        set.add(member)
        return existed ? 0 : 1
      },
      srem: async (key: string, member: string) => {
        if (!setStore.has(key)) {
          return 0
        }
        const set = setStore.get(key)!
        const deleted = set.delete(member)
        return deleted ? 1 : 0
      },
      smembers: async (key: string) => {
        if (!setStore.has(key)) {
          return []
        }
        return Array.from(setStore.get(key)!)
      },
      keys: async (pattern: string) => {
        // Simple glob pattern matching
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
        return Array.from(store.keys()).filter((key) => regex.test(key))
      },
      // Add mock deletePattern method for development
      deletePattern: async (pattern: string) => {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
        const keysToDelete = Array.from(store.keys()).filter((key) =>
          regex.test(key),
        )
        keysToDelete.forEach((key) => store.delete(key))
        return keysToDelete.length
      },
      ping: async () => 'PONG',
      incr: async (key: string) => {
        const value = store.get(key)
        const num = value ? parseInt(value, 10) + 1 : 1
        store.set(key, num.toString())
        return num
      },
      pttl: async () => -1,
      info: async () => 'connected_clients:1\nblocked_clients:0',
      publish: async () => 0,
      quit: async () => 'OK',
      connect: async () => {},
      on: (event: string, callback: (...args: unknown[]) => void) => {
        // Emit the event immediately to simulate connection events
        if (['connect', 'ready'].includes(event)) {
          setTimeout(() => callback(), 0)
        }
        return this
      }, // Basic event handling for mock
      pipeline: () => {
        const commands: { cmd: string; args: unknown[] }[] = []
        return {
          del: (key: string) => {
            commands.push({ cmd: 'del', args: [key] })
            return this
          },
          exec: async () => {
            return commands.map((cmd) => {
              if (cmd.cmd === 'del') {
                const deleted = store.delete(cmd.args[0] as string)
                return [null, deleted ? 1 : 0]
              }
              return [null, null]
            })
          },
        }
      },
    } as unknown as Redis
  }

  private createClient(): Redis {
    return new Redis(this.config.url, {
      keyPrefix: this.config.keyPrefix,
      maxRetriesPerRequest: this.config.maxRetries,
      retryStrategy: (times: number) => {
        if (times > (this.config.maxRetries || 3)) {
          return null
        }
        return this.config.retryDelay || 100
      },
      connectTimeout: this.config.connectTimeout,
    })
  }

  private startHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }

    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.isHealthy()
      } catch (error) {
        logger.error('Health check failed:', { error: String(error) })
      }
    }, this.config.healthCheckInterval || 5000)
  }

  async isHealthy(): Promise<boolean> {
    try {
      const client = await this.ensureConnection()
      await client.ping()
      return true
    } catch (error) {
      logger.error('Redis health check failed:', {
        error: error instanceof Error ? error.message : String(error),
      })
      return false
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      const client = await this.ensureConnection()
      return await client.get(key)
    } catch (error) {
      throw new RedisServiceError(
        RedisErrorCode.OPERATION_FAILED,
        `Failed to get key: ${key}`,
        error,
      )
    }
  }

  async set(key: string, value: string, ttlMs?: number): Promise<void> {
    try {
      const client = await this.ensureConnection()
      if (ttlMs) {
        await client.set(key, value, 'PX', ttlMs)
      } else {
        await client.set(key, value)
      }
    } catch (error) {
      throw new RedisServiceError(
        RedisErrorCode.OPERATION_FAILED,
        `Failed to set key: ${key}`,
        error,
      )
    }
  }

  async del(key: string): Promise<void> {
    try {
      const client = await this.ensureConnection()
      await client.del(key)
    } catch (error) {
      throw new RedisServiceError(
        RedisErrorCode.OPERATION_FAILED,
        `Failed to delete key: ${key}`,
        error,
      )
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const client = await this.ensureConnection()
      const result = await client.exists(key)
      return result === 1
    } catch (error) {
      throw new RedisServiceError(
        RedisErrorCode.OPERATION_FAILED,
        `Failed to check existence of key: ${key}`,
        error,
      )
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      const client = await this.ensureConnection()
      return await client.pttl(key)
    } catch (error) {
      throw new RedisServiceError(
        RedisErrorCode.OPERATION_FAILED,
        `Failed to get TTL for key: ${key}`,
        error,
      )
    }
  }

  async incr(key: string): Promise<number> {
    try {
      const client = await this.ensureConnection()
      return await client.incr(key)
    } catch (error) {
      throw new RedisServiceError(
        RedisErrorCode.OPERATION_FAILED,
        `Failed to increment key: ${key}`,
        error,
      )
    }
  }

  async sadd(key: string, member: string): Promise<number> {
    try {
      const client = await this.ensureConnection()
      return await client.sadd(key, member)
    } catch (error) {
      throw new RedisServiceError(
        RedisErrorCode.OPERATION_FAILED,
        `Failed to add member to set: ${key}`,
        error,
      )
    }
  }

  async srem(key: string, member: string): Promise<number> {
    try {
      const client = await this.ensureConnection()
      return await client.srem(key, member)
    } catch (error) {
      throw new RedisServiceError(
        RedisErrorCode.OPERATION_FAILED,
        `Failed to remove member from set: ${key}`,
        error,
      )
    }
  }

  async smembers(key: string): Promise<string[]> {
    try {
      const client = await this.ensureConnection()
      return await client.smembers(key)
    } catch (error) {
      throw new RedisServiceError(
        RedisErrorCode.OPERATION_FAILED,
        `Failed to get members of set: ${key}`,
        error,
      )
    }
  }

  async keys(pattern: string): Promise<string[]> {
    try {
      const client = await this.ensureConnection()
      return await client.keys(pattern)
    } catch (error) {
      throw new RedisServiceError(
        RedisErrorCode.OPERATION_FAILED,
        `Failed to get keys matching pattern: ${pattern}`,
        error,
      )
    }
  }

  async getPoolStats(): Promise<{
    totalConnections: number
    activeConnections: number
    idleConnections: number
    waitingClients: number
  }> {
    try {
      const client = await this.ensureConnection()
      const info = await client.info('clients')
      const stats = {
        totalConnections: 0,
        activeConnections: 0,
        idleConnections: 0,
        waitingClients: 0,
      }

      // Parse Redis INFO output
      info.split('\n').forEach((line) => {
        if (line.startsWith('connected_clients:')) {
          stats.totalConnections = Number.parseInt(line.split(':')[1], 10)
        }
        if (line.startsWith('blocked_clients:')) {
          stats.waitingClients = Number.parseInt(line.split(':')[1], 10)
        }
      })

      stats.activeConnections = stats.totalConnections - stats.waitingClients
      stats.idleConnections = Math.max(
        0,
        stats.totalConnections - stats.activeConnections,
      )

      return stats
    } catch (error) {
      throw new RedisServiceError(
        RedisErrorCode.OPERATION_FAILED,
        'Failed to get pool stats',
        error,
      )
    }
  }

  async subscribe(
    channel: string,
    callback: (message: string) => void,
  ): Promise<void> {
    if (!this.subscribers.has(channel)) {
      const subscriber = this.createClient()
      this.subscribers.set(channel, subscriber)

      subscriber.on('message', (ch: string, message: string) => {
        if (ch === channel) {
          callback(message)
        }
      })

      await subscriber.subscribe(channel)
    }
  }

  async publish(channel: string, message: string): Promise<number> {
    try {
      if (!this.client) {
        await this.connect()
      }

      if (!this.client) {
        throw new RedisServiceError(
          RedisErrorCode.CONNECTION_FAILED,
          'Redis client is not initialized',
        )
      }

      return await this.client.publish(channel, message)
    } catch (error) {
      throw new RedisServiceError(
        RedisErrorCode.OPERATION_FAILED,
        `Failed to publish to channel: ${channel}`,
        error,
      )
    }
  }

  async unsubscribe(channel: string): Promise<void> {
    const subscriber = this.subscribers.get(channel)
    if (subscriber) {
      await subscriber.unsubscribe(channel)
      subscriber.disconnect()
      this.subscribers.delete(channel)
    }
  }

  /**
   * Delete all keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<void> {
    try {
      const client = await this.ensureConnection()

      // Get all keys matching the pattern
      const keys = await client.keys(pattern)

      if (keys.length === 0) {
        return
      }

      // Delete all keys in a pipeline
      if (keys.length > 0) {
        const pipeline = client.pipeline()
        keys.forEach((key) => pipeline.del(key))
        await pipeline.exec()
      }

      logger.debug(`Deleted ${keys.length} keys matching pattern: ${pattern}`)
    } catch (error) {
      throw new RedisServiceError(
        RedisErrorCode.OPERATION_FAILED,
        `Failed to delete keys matching pattern: ${pattern}`,
        error,
      )
    }
  }
}
