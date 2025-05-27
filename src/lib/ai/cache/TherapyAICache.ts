import type { RedisService } from '../../services/redis'
import type {
  AICache,
  AIResponse,
  AIServiceOptions,
  Message,
} from '../AIService'
import type {
  EmotionAnalysis,
  TherapyAIOptions,
  TherapyAIResponse,
  TherapySession,
  SessionDocumentation,
} from '../interfaces/therapy'
import { logger } from '../../utils/logger'

export class TherapyAICache implements AICache {
  private redis: RedisService
  private defaultTTL: number = 3600 // 1 hour default TTL

  constructor(redis: RedisService, defaultTTL?: number) {
    this.redis = redis
    if (defaultTTL) {
      this.defaultTTL = defaultTTL
    }
  }

  private generateKey(prefix: string, data: unknown): string {
    return `${prefix}:${JSON.stringify(data)}`
  }

  async get(
    messages: Message[],
    options?: AIServiceOptions,
  ): Promise<AIResponse | null> {
    try {
      const key = this.generateKey('chat', { messages, options })
      const cached = await this.redis.get(key)
      return cached ? JSON.parse(cached) : null
    } catch (error) {
      logger.error('Cache retrieval failed:', error)
      return null
    }
  }

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    try {
      await this.redis.set(key, JSON.stringify(value), ttl || this.defaultTTL)
    } catch (error) {
      logger.error('Cache set failed:', error)
    }
  }

  async getEmotionAnalysis(
    text: string,
    options?: TherapyAIOptions,
  ): Promise<EmotionAnalysis | null> {
    try {
      // Don't cache if using encryption
      if (options?.securityOptions?.useEncryption) {
        return null
      }

      const key = this.generateKey('emotion', { text, options })
      const cached = await this.redis.get(key)
      return cached ? JSON.parse(cached) : null
    } catch (error) {
      logger.error('Emotion analysis cache retrieval failed:', error)
      return null
    }
  }

  async getIntervention(
    context: TherapySession,
    analysis: EmotionAnalysis,
  ): Promise<TherapyAIResponse | null> {
    try {
      // Only cache for non-emergency sessions
      if (context.status === 'emergency') {
        return null
      }

      const key = this.generateKey('intervention', {
        sessionId: context.sessionId,
        analysis,
      })
      const cached = await this.redis.get(key)
      return cached ? JSON.parse(cached) : null
    } catch (error) {
      logger.error('Intervention cache retrieval failed:', error)
      return null
    }
  }

  async getRiskAssessment(
    session: TherapySession,
    recentAnalyses: EmotionAnalysis[],
  ): Promise<TherapyAIResponse | null> {
    try {
      // Don't cache risk assessments for active or emergency sessions
      if (session.status === 'active' || session.status === 'emergency') {
        return null
      }

      const key = this.generateKey('risk', {
        sessionId: session.sessionId,
        analysisCount: recentAnalyses.length,
        lastAnalysis: recentAnalyses[recentAnalyses.length - 1],
      })
      const cached = await this.redis.get(key)
      return cached ? JSON.parse(cached) : null
    } catch (error) {
      logger.error('Risk assessment cache retrieval failed:', error)
      return null
    }
  }

  // Emergency responses are never cached
  async getEmergencyResponse(): Promise<null> {
    return null
  }

  async cacheEmotionAnalysis(
    text: string,
    analysis: EmotionAnalysis,
    options?: TherapyAIOptions,
  ): Promise<void> {
    // Don't cache if using encryption
    if (options?.securityOptions?.useEncryption) {
      return
    }

    const key = this.generateKey('emotion', { text, options })
    await this.set(key, analysis, 1800) // 30 minutes TTL for emotion analysis
  }

  async cacheIntervention(
    context: TherapySession,
    analysis: EmotionAnalysis,
    response: TherapyAIResponse,
  ): Promise<void> {
    // Only cache for non-emergency sessions
    if (context.status === 'emergency') {
      return
    }

    const key = this.generateKey('intervention', {
      sessionId: context.sessionId,
      analysis,
    })
    await this.set(key, response, 3600) // 1 hour TTL for interventions
  }

  async cacheRiskAssessment(
    session: TherapySession,
    recentAnalyses: EmotionAnalysis[],
    assessment: TherapyAIResponse,
  ): Promise<void> {
    // Don't cache risk assessments for active or emergency sessions
    if (session.status === 'active' || session.status === 'emergency') {
      return
    }

    const key = this.generateKey('risk', {
      sessionId: session.sessionId,
      analysisCount: recentAnalyses.length,
      lastAnalysis: recentAnalyses[recentAnalyses.length - 1],
    })
    await this.set(key, assessment, 1800) // 30 minutes TTL for risk assessments
  }

  async clearSessionCache(sessionId: string): Promise<void> {
    try {
      const pattern = `*:{"sessionId":"${sessionId}"*`
      // Use the keys() method provided by RedisService
      const keysToDelete = await this.redis.keys(pattern)

      if (keysToDelete.length > 0) {
        // Delete keys individually as RedisService.del expects a single key
        for (const key of keysToDelete) {
          await this.redis.del(key)
        }
      }
    } catch (error) {
      logger.error('Session cache clear failed:', error)
    }
  }

  async clearAllCache(): Promise<void> {
    try {
      // Clear each pattern individually using keys() and del()
      for (const pattern of [
        'chat:*',
        'emotion:*',
        'intervention:*',
        'risk:*',
      ]) {
        const keysToDelete = await this.redis.keys(pattern)

        if (keysToDelete.length > 0) {
          // Delete keys individually
          for (const key of keysToDelete) {
            await this.redis.del(key)
          }
        }
      }
    } catch (error) {
      logger.error('Cache clear failed:', error)
    }
  }

  async getSessionDocumentation(
    _session: TherapySession,
    _emotionAnalyses: EmotionAnalysis[],
    _interventions: TherapyAIResponse[],
    _options?: TherapyAIOptions,
  ): Promise<SessionDocumentation | null> {
    // Implementation needed
    throw new Error('Method not implemented')
  }

  async cacheSessionDocumentation(
    _session: TherapySession,
    _emotionAnalyses: EmotionAnalysis[],
    _interventions: TherapyAIResponse[],
    _documentation: SessionDocumentation,
    _options?: TherapyAIOptions,
  ): Promise<void> {
    // Implementation needed
    throw new Error('Method not implemented')
  }
}
