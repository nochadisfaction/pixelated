import { FHEService } from '../../fhe'
import { RedisService } from '../../services/redis'
import { logger } from '../../utils/logger'
import { AIService } from '../AIService'
import { TherapyAICache } from '../cache/TherapyAICache'
import { EmotionLlamaProvider } from '../providers/EmotionLlamaProvider'

export class EmotionLlamaFactory {
  static async create(config: {
    baseUrl: string
    apiKey: string
    redisUrl: string
    fheConfig: {
      keyPath: string
      certPath: string
    }
  }): Promise<AIService> {
    try {
      // Initialize FHE service
      const fheService = new FHEService({
        keyPath: config.fheConfig.keyPath,
        certPath: config.fheConfig.certPath,
      })
      await fheService.initialize()

      // Initialize Redis service
      const redis = new RedisService(config.redisUrl)
      await redis.connect()

      // Create cache with 1-hour default TTL
      const cache = new TherapyAICache(redis, 3600)

      // Create provider
      const provider = new EmotionLlamaProvider(
        config.baseUrl,
        config.apiKey,
        fheService,
      )

      // Create and return service
      return new AIService(cache, provider)
    } catch (error) {
      logger.error('Failed to create EmotionLlama service:', error)
      throw error
    }
  }

  static async createFromEnv(): Promise<AIService> {
    const requiredEnvVars = [
      'EMOTION_LLAMA_API_URL',
      'EMOTION_LLAMA_API_KEY',
      'REDIS_URL',
      'FHE_KEY_PATH',
      'FHE_CERT_PATH',
    ]

    const missingVars = requiredEnvVars.filter(
      (varName) => !process.env[varName],
    )
    if (missingVars.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missingVars.join(', ')}`,
      )
    }

    return EmotionLlamaFactory.create({
      baseUrl: process.env.EMOTION_LLAMA_API_URL!,
      apiKey: process.env.EMOTION_LLAMA_API_KEY!,
      redisUrl: process.env.REDIS_URL!,
      fheConfig: {
        keyPath: process.env.FHE_KEY_PATH!,
        certPath: process.env.FHE_CERT_PATH!,
      },
    })
  }

  static async createForTesting(): Promise<AIService> {
    // Initialize with mock services for testing
    const mockRedis = new RedisService('mock://localhost:6379')
    const mockFHE = new FHEService({
      keyPath: 'test/keys/test.key',
      certPath: 'test/certs/test.cert',
    })

    const cache = new TherapyAICache(mockRedis, 60) // 1-minute TTL for tests
    const provider = new EmotionLlamaProvider(
      'http://localhost:8080',
      'test-api-key',
      mockFHE,
    )

    return new AIService(cache, provider)
  }
}
