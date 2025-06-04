import type { RedisService } from '../../services/redis'
import type {
  CrossSessionPattern,
  RiskCorrelation,
  TrendPattern,
} from './PatternRecognitionService'

interface CacheConfig {
  trendTTL: number // Time-to-live for trend analysis cache in seconds
  patternTTL: number // Time-to-live for pattern detection cache in seconds
  correlationTTL: number // Time-to-live for correlation analysis cache in seconds
  maxBatchSize: number // Maximum number of items to process in a single batch
}

export class PatternRecognitionOptimizer {
  private readonly redisService: RedisService
  private readonly config: CacheConfig

  constructor(redisService: RedisService, config: Partial<CacheConfig> = {}) {
    this.redisService = redisService
    this.config = {
      trendTTL: config.trendTTL || 3600, // 1 hour default
      patternTTL: config.patternTTL || 7200, // 2 hours default
      correlationTTL: config.correlationTTL || 14400, // 4 hours default
      maxBatchSize: config.maxBatchSize || 100,
    }
  }

  /**
   * Caches trend analysis results with TTL
   */
  async cacheTrendAnalysis(
    clientId: string,
    startDate: Date,
    endDate: Date,
    trends: TrendPattern[],
  ): Promise<void> {
    const cacheKey = this.getTrendCacheKey(clientId, startDate, endDate)
    await this.redisService.setex(
      cacheKey,
      this.config.trendTTL,
      JSON.stringify(trends),
    )
  }

  /**
   * Retrieves cached trend analysis results
   */
  async getCachedTrendAnalysis(
    clientId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<TrendPattern[] | null> {
    const cacheKey = this.getTrendCacheKey(clientId, startDate, endDate)
    const cached = await this.redisService.get(cacheKey)
    return cached ? JSON.parse(cached) : null
  }

  /**
   * Caches cross-session pattern results
   */
  async cacheSessionPatterns(
    clientId: string,
    patterns: CrossSessionPattern[],
  ): Promise<void> {
    const cacheKey = this.getPatternCacheKey(clientId)
    await this.redisService.setex(
      cacheKey,
      this.config.patternTTL,
      JSON.stringify(patterns),
    )
  }

  /**
   * Retrieves cached cross-session patterns
   */
  async getCachedSessionPatterns(
    clientId: string,
  ): Promise<CrossSessionPattern[] | null> {
    const cacheKey = this.getPatternCacheKey(clientId)
    const cached = await this.redisService.get(cacheKey)
    return cached ? JSON.parse(cached) : null
  }

  /**
   * Caches risk factor correlation results
   */
  async cacheRiskCorrelations(
    clientId: string,
    correlations: RiskCorrelation[],
  ): Promise<void> {
    const cacheKey = this.getCorrelationCacheKey(clientId)
    await this.redisService.setex(
      cacheKey,
      this.config.correlationTTL,
      JSON.stringify(correlations),
    )
  }

  /**
   * Retrieves cached risk factor correlations
   */
  async getCachedRiskCorrelations(
    clientId: string,
  ): Promise<RiskCorrelation[] | null> {
    const cacheKey = this.getCorrelationCacheKey(clientId)
    const cached = await this.redisService.get(cacheKey)
    return cached ? JSON.parse(cached) : null
  }

  /**
   * Processes items in batches to prevent memory overload
   */
  async processBatch<T, R>(
    items: T[],
    processor: (batch: T[]) => Promise<R[]>,
  ): Promise<R[]> {
    const results: R[] = []
    for (let i = 0; i < items.length; i += this.config.maxBatchSize) {
      const batch = items.slice(i, i + this.config.maxBatchSize)
      const batchResults = await processor(batch)
      results.push(...batchResults)
    }
    return results
  }

  /**
   * Invalidates all cached data for a client
   */
  async invalidateClientCache(clientId: string): Promise<void> {
    const keys = [
      this.getTrendCacheKey(clientId, new Date(), new Date()),
      this.getPatternCacheKey(clientId),
      this.getCorrelationCacheKey(clientId),
    ]
    await Promise.all(keys.map((key) => this.redisService.del(key)))
  }

  /**
   * Prunes old cached data based on TTL
   */
  async pruneExpiredCache(): Promise<void> {
    // Redis automatically handles TTL-based expiration
    // This method exists for potential future manual pruning needs
  }

  private getTrendCacheKey(
    clientId: string,
    startDate: Date,
    endDate: Date,
  ): string {
    return `pattern:trends:${clientId}:${startDate.toISOString()}:${endDate.toISOString()}`
  }

  private getPatternCacheKey(clientId: string): string {
    return `pattern:sessions:${clientId}`
  }

  private getCorrelationCacheKey(clientId: string): string {
    return `pattern:correlations:${clientId}`
  }
}
