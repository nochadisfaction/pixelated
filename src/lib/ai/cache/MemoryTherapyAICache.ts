import type {
  EmotionAnalysis,
  TherapyAIOptions,
  TherapyAIResponse,
  TherapySession,
  SessionDocumentation,
} from '../interfaces/therapy'
import type {
  AICache,
  AIResponse,
  AIServiceOptions,
  Message,
} from '../AIService'
import { generateHash } from '../../crypto/hash'

/**
 * In-memory implementation of AICache, including therapy-specific methods
 */
export class MemoryTherapyAICache implements AICache {
  private cacheStore: Map<string, { timestamp: number; data: unknown }>
  private readonly TTL: number // Time to live in ms

  constructor(ttlMinutes = 60) {
    this.cacheStore = new Map()
    this.TTL = ttlMinutes * 60 * 1000
  }

  /**
   * Generate cache key for general chat completions
   */
  private generateChatCacheKey(
    messages: Message[],
    options?: AIServiceOptions,
  ): string {
    // Simple key generation for in-memory cache
    const keyData = { messages, options }
    // Use generateHash for consistency, though simple stringify might suffice here
    return `chat:${generateHash(JSON.stringify(keyData))}`
  }

  /**
   * Get cached chat completion response
   */
  async get(
    messages: Message[],
    options?: AIServiceOptions,
  ): Promise<AIResponse | null> {
    const key = this.generateChatCacheKey(messages, options)
    const cacheEntry = this.cacheStore.get(key)

    if (cacheEntry && Date.now() - cacheEntry.timestamp < this.TTL) {
      return cacheEntry.data as AIResponse
    }

    return null
  }

  /**
   * Cache chat completion response
   */
  async set(
    messages: Message[],
    response: AIResponse,
    options?: AIServiceOptions,
  ): Promise<void> {
    const key = this.generateChatCacheKey(messages, options)
    this.cacheStore.set(key, {
      timestamp: Date.now(),
      data: response,
    })
    // Optional: Implement cleanup for expired TTLs if memory becomes an issue
    // Setting a specific TTL here doesn't automatically clean up in this simple Map implementation
  }

  /**
   * Get cached session documentation
   */
  async getSessionDocumentation(
    session: TherapySession,
    emotionAnalyses: EmotionAnalysis[],
    interventions: TherapyAIResponse[],
    options?: TherapyAIOptions,
  ): Promise<SessionDocumentation | null> {
    const key = this.getSessionDocumentationCacheKey(
      session,
      emotionAnalyses,
      interventions,
      options,
    )

    const cacheEntry = this.cacheStore.get(key)

    if (cacheEntry && Date.now() - cacheEntry.timestamp < this.TTL) {
      return cacheEntry.data as SessionDocumentation
    }

    return null
  }

  /**
   * Cache session documentation
   */
  async cacheSessionDocumentation(
    session: TherapySession,
    emotionAnalyses: EmotionAnalysis[],
    interventions: TherapyAIResponse[],
    documentation: SessionDocumentation,
    options?: TherapyAIOptions,
  ): Promise<void> {
    const key = this.getSessionDocumentationCacheKey(
      session,
      emotionAnalyses,
      interventions,
      options,
    )

    this.cacheStore.set(key, {
      timestamp: Date.now(),
      data: documentation,
    })
  }

  /**
   * Generate cache key for session documentation
   */
  private getSessionDocumentationCacheKey(
    session: TherapySession,
    emotionAnalyses: EmotionAnalysis[],
    interventions: TherapyAIResponse[],
    options?: TherapyAIOptions,
  ): string {
    // Create a stable representation for hashing
    // We only need to include the essential data that would affect documentation output
    const keyData = {
      sessionId: session.sessionId,
      clientId: session.clientId,
      therapistId: session.therapistId,
      startTime: session.startTime.toISOString(),
      endTime: session.endTime?.toISOString(),

      // For emotion analyses, only include the most critical data
      emotionAnalysesSummary: emotionAnalyses.map((ea) => ({
        timestamp: ea.timestamp.toISOString(),
        riskFactors: ea.riskFactors,
        requiresAttention: ea.requiresAttention,
        overallSentiment: ea.overallSentiment,
      })),

      // For interventions, include response text and key details
      interventionsSummary: interventions.map((i) => ({
        content: i.content,
        suggestedInterventions: i.suggestedInterventions?.map((si) => si.type),
        riskLevel: i.riskAssessment?.level,
      })),

      // Include any options that would affect documentation generation
      model: options?.model,
      temperature: options?.temperature,
    }

    return `documentation:${generateHash(JSON.stringify(keyData))}`
  }
}
