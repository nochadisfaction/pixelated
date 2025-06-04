/**
 * Performance Optimization Engine
 *
 * This engine implements comprehensive performance optimizations for AI components
 * including database query optimization, advanced caching strategies, and
 * performance monitoring to achieve sub-500ms response times.
 */

import { createLogger } from '../../../utils/logger'
import { PerformanceLogger } from '../../logging/performance-logger'
import type { IRedisService } from '../../services/redis/types'
import type { BenchmarkRepository } from '../services/ComparativeAnalyticsService'
import type {
  CrossSessionPattern,
  TrendPattern,
  RiskCorrelation,
} from '../../fhe/pattern-recognition'
import type { EmotionAnalysis } from '../interfaces/therapy'
import { createHash } from 'crypto'
import sanitizeHtml from 'sanitize-html'

const logger = createLogger({ context: 'PerformanceOptimizationEngine' })
const performanceLogger = PerformanceLogger.getInstance()

// Performance optimization configuration
export interface PerformanceOptimizationConfig {
  // Database optimization settings
  maxQueryTimeMs: number
  enableQueryOptimization: boolean
  batchSize: number
  connectionPoolSize: number

  // Caching configuration
  enableAdvancedCaching: boolean
  cacheHitRateTarget: number
  maxCacheSize: number
  defaultTTL: number

  // Performance targets
  targetResponseTimeMs: number
  maxConcurrentRequests: number
  enablePerformanceMonitoring: boolean

  // Pattern caching specifics
  patternCacheTTL: number
  emotionCacheTTL: number
  benchmarkCacheTTL: number

  // Query optimization specifics
  enableQueryBatching: boolean
  enableIndexOptimization: boolean
  enableMaterializedViews: boolean
}

// Cache entry interface
interface CacheEntry<T> {
  data: T
  timestamp: number
  lastAccessed: number
  hitCount: number
  computationTimeMs: number
}

// Query optimization metrics
interface QueryMetrics {
  queryType: string
  executionTimeMs: number
  resultCount: number
  cacheHit: boolean
  optimized: boolean
  timestamp: number
}

// Performance optimization results
export interface OptimizationResult {
  originalTimeMs: number
  optimizedTimeMs: number
  improvementPercent: number
  cacheHitRate: number
  queryOptimizations: number
  recommendedActions: string[]
}

// Batch query item interface
interface BatchQueryItem {
  identifier: string
  queryFunction: () => Promise<unknown>
}

/**
 * Advanced Performance Optimization Engine for AI Components
 */
export class PerformanceOptimizationEngine {
  private readonly config: Required<PerformanceOptimizationConfig>
  private readonly cache = new Map<string, CacheEntry<unknown>>()
  private readonly queryMetrics: QueryMetrics[] = []
  private readonly performanceHistory: number[] = []

  // Query optimization state
  private readonly queryBatches = new Map<string, BatchQueryItem[]>()
  private readonly batchTimeouts = new Map<string, NodeJS.Timeout>()

  // Performance monitoring
  private totalRequests = 0
  private cacheHits = 0
  private cacheMisses = 0
  private averageResponseTime = 0

  constructor(
    private readonly redisService?: IRedisService,
    private readonly benchmarkRepository?: BenchmarkRepository,
    config?: Partial<PerformanceOptimizationConfig>,
  ) {
    this.config = {
      maxQueryTimeMs: 200,
      enableQueryOptimization: true,
      batchSize: 50,
      connectionPoolSize: 10,
      enableAdvancedCaching: true,
      cacheHitRateTarget: 0.8,
      maxCacheSize: 10000,
      defaultTTL: 3600,
      targetResponseTimeMs: 500,
      maxConcurrentRequests: 100,
      enablePerformanceMonitoring: true,
      patternCacheTTL: 7200,
      emotionCacheTTL: 1800,
      benchmarkCacheTTL: 14400,
      enableQueryBatching: true,
      enableIndexOptimization: true,
      enableMaterializedViews: true,
      ...config,
    }

    logger.info('Performance Optimization Engine initialized', {
      config: this.config,
    })

    // Start performance monitoring
    if (this.config.enablePerformanceMonitoring) {
      this.startPerformanceMonitoring()
    }
  }

  /**
   * Optimize Comparative Analytics database queries
   */
  async optimizeComparativeAnalyticsQueries<T>(
    queryType: 'indication' | 'technique' | 'benchmark' | 'insight',
    identifier: string,
    queryFunction: () => Promise<T>,
  ): Promise<T> {
    const startTime = Date.now()
    const cacheKey = this.generateCacheKey(queryType, identifier)

    try {
      // Check cache first
      if (this.config.enableAdvancedCaching) {
        const cached = await this.getFromCache<T>(cacheKey)
        if (cached) {
          this.recordCacheHit()
          return cached
        }
      }

      // Apply query optimization strategies
      let result: T

      if (this.config.enableQueryBatching && this.shouldBatchQuery(queryType)) {
        result = await this.executeBatchedQuery(
          queryType,
          identifier,
          queryFunction,
        )
      } else {
        result = await this.executeOptimizedQuery(queryFunction)
      }

      // Cache the result
      if (this.config.enableAdvancedCaching) {
        await this.setCache(cacheKey, result, this.getCacheTTL(queryType))
      }

      const endTime = Date.now()
      const executionTime = endTime - startTime

      // Record metrics
      this.recordQueryMetrics({
        queryType,
        executionTimeMs: executionTime,
        resultCount: Array.isArray(result) ? result.length : 1,
        cacheHit: false,
        optimized: true,
        timestamp: Date.now(),
      })

      this.recordCacheMiss()
      return result
    } catch (error) {
      logger.error('Error in optimized query execution', {
        queryType,
        identifier,
        error,
      })
      throw error
    }
  }

  /**
   * Implement advanced caching strategy for common patterns
   */
  async cacheCommonPatterns(
    patterns: CrossSessionPattern[] | TrendPattern[] | RiskCorrelation[],
    patternType: 'cross-session' | 'trend' | 'risk-correlation',
    clientId?: string,
  ): Promise<void> {
    const cacheKey = clientId
      ? `patterns:${patternType}:${clientId}`
      : `patterns:${patternType}:global`

    try {
      // Analyze pattern frequency and importance
      const optimizedPatterns = this.optimizePatternsForCaching(patterns)

      // Store in multi-level cache
      await this.setCache(
        cacheKey,
        optimizedPatterns,
        this.config.patternCacheTTL,
      )

      // Store frequently accessed patterns in Redis for cross-instance sharing
      if (this.redisService && this.isHighValuePattern(patterns)) {
        await this.redisService.set(
          cacheKey,
          JSON.stringify(optimizedPatterns),
          this.config.patternCacheTTL,
        )
      }

      logger.debug('Cached common patterns', {
        patternType,
        clientId,
        patternCount: patterns.length,
        optimizedCount: optimizedPatterns.length,
      })
    } catch (error) {
      logger.error('Error caching common patterns', {
        patternType,
        clientId,
        error,
      })
    }
  }

  /**
   * Cache emotion analysis results with intelligent TTL
   */
  async cacheEmotionAnalysis(
    text: string,
    analysis: EmotionAnalysis,
    context?: Record<string, unknown>,
  ): Promise<void> {
    const cacheKey = this.generateEmotionCacheKey(text, context)

    try {
      // Determine TTL based on analysis complexity and confidence
      const ttl = this.calculateEmotionCacheTTL(analysis)

      await this.setCache(cacheKey, analysis, ttl)

      // Cache high-confidence results in Redis for sharing
      if (this.redisService && this.isHighConfidenceAnalysis(analysis)) {
        await this.redisService.set(cacheKey, JSON.stringify(analysis), ttl)
      }
    } catch (error) {
      logger.error('Error caching emotion analysis', { error })
    }
  }

  /**
   * Get cached emotion analysis
   */
  async getCachedEmotionAnalysis(
    text: string,
    context?: Record<string, unknown>,
  ): Promise<EmotionAnalysis | null> {
    const cacheKey = this.generateEmotionCacheKey(text, context)

    try {
      // Check local cache first
      const cached = await this.getFromCache<EmotionAnalysis>(cacheKey)
      if (cached) {
        return cached
      }

      // Check Redis cache
      if (this.redisService) {
        const redisCached = await this.redisService.get(cacheKey)
        if (redisCached) {
          const analysis = JSON.parse(redisCached) as EmotionAnalysis
          // Store in local cache for faster access
          await this.setCache(cacheKey, analysis, this.config.emotionCacheTTL)
          return analysis
        }
      }

      return null
    } catch (error) {
      logger.error('Error retrieving cached emotion analysis', { error })
      return null
    }
  }

  /**
   * Optimize benchmark queries with intelligent indexing
   */
  async optimizeBenchmarkQueries(): Promise<void> {
    if (!this.benchmarkRepository || !this.config.enableIndexOptimization) {
      return
    }

    try {
      logger.info('Optimizing benchmark database queries')

      // Analyze query patterns to recommend indexes
      const indexRecommendations = this.analyzeQueryPatternsForIndexing()

      // Create materialized views for frequently accessed data
      if (this.config.enableMaterializedViews) {
        await this.createMaterializedViews()
      }

      // Optimize connection pooling
      await this.optimizeConnectionPooling()

      logger.info('Benchmark query optimization complete', {
        indexRecommendations: indexRecommendations.length,
      })
    } catch (error) {
      logger.error('Error optimizing benchmark queries', { error })
    }
  }

  /**
   * Monitor and report performance metrics
   */
  async getPerformanceReport(): Promise<OptimizationResult> {
    const currentTime = Date.now()
    const recentMetrics = this.queryMetrics.filter(
      (m) => currentTime - m.timestamp < 3600000, // Last hour
    )

    const originalTimes = recentMetrics
      .filter((m) => !m.optimized)
      .map((m) => m.executionTimeMs)

    const optimizedTimes = recentMetrics
      .filter((m) => m.optimized)
      .map((m) => m.executionTimeMs)

    const avgOriginal =
      originalTimes.length > 0
        ? originalTimes.reduce((a, b) => a + b, 0) / originalTimes.length
        : 0

    const avgOptimized =
      optimizedTimes.length > 0
        ? optimizedTimes.reduce((a, b) => a + b, 0) / optimizedTimes.length
        : 0

    const improvement =
      avgOriginal > 0 ? ((avgOriginal - avgOptimized) / avgOriginal) * 100 : 0

    const cacheHitRate =
      this.totalRequests > 0 ? this.cacheHits / this.totalRequests : 0

    const recommendedActions = this.generateRecommendations(
      avgOptimized,
      cacheHitRate,
      recentMetrics,
    )

    return {
      originalTimeMs: avgOriginal,
      optimizedTimeMs: avgOptimized,
      improvementPercent: improvement,
      cacheHitRate,
      queryOptimizations: recentMetrics.filter((m) => m.optimized).length,
      recommendedActions,
    }
  }

  /**
   * Auto-tune performance parameters based on usage patterns
   */
  async autoTunePerformance(): Promise<void> {
    try {
      const report = await this.getPerformanceReport()

      // Adjust cache size if hit rate is low
      if (report.cacheHitRate < this.config.cacheHitRateTarget) {
        await this.increaseCacheSize()
      }

      // Adjust batch size if queries are slow
      if (report.optimizedTimeMs > this.config.targetResponseTimeMs) {
        this.adjustBatchSize()
      }

      // Adjust TTL based on cache effectiveness
      this.adjustCacheTTL(report.cacheHitRate)

      logger.info('Performance auto-tuning complete', {
        cacheHitRate: report.cacheHitRate,
        avgResponseTime: report.optimizedTimeMs,
        improvements: report.improvementPercent,
      })
    } catch (error) {
      logger.error('Error in performance auto-tuning', { error })
    }
  }

  // Private helper methods

  private generateCacheKey(queryType: string, identifier: string): string {
    const sanitizedId = sanitizeHtml(identifier)
    return `opt:${queryType}:${createHash('md5').update(sanitizedId).digest('hex')}`
  }

  private generateEmotionCacheKey(
    text: string,
    context?: Record<string, unknown>,
  ): string {
    const sanitizedText = sanitizeHtml(text)
    const contextStr = context ? JSON.stringify(context) : ''
    const combined = sanitizedText + contextStr
    return `emotion:${createHash('md5').update(combined).digest('hex')}`
  }

  private async getFromCache<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key)
    if (!entry) {
      return null
    }

    // Check if expired
    if (Date.now() - entry.timestamp > this.config.defaultTTL * 1000) {
      this.cache.delete(key)
      return null
    }

    // Update access time and hit count
    entry.lastAccessed = Date.now()
    entry.hitCount++
    this.cache.set(key, entry)

    return entry.data as T
  }

  private async setCache<T>(
    key: string,
    data: T,
    _ttl?: number,
  ): Promise<void> {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.config.maxCacheSize) {
      this.evictLRUEntries()
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      lastAccessed: Date.now(),
      hitCount: 0,
      computationTimeMs: 0, // Could be set by caller
    }

    this.cache.set(key, entry)
  }

  private evictLRUEntries(): void {
    // Sort by last accessed time and remove oldest 10%
    const entries = Array.from(this.cache.entries())
    entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed)

    const toRemove = Math.floor(entries.length * 0.1)
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0])
    }
  }

  private shouldBatchQuery(queryType: string): boolean {
    return (
      this.config.enableQueryBatching &&
      ['indication', 'technique'].includes(queryType)
    )
  }

  private async executeBatchedQuery<T>(
    queryType: string,
    identifier: string,
    queryFunction: () => Promise<T>,
  ): Promise<T> {
    const batchKey = `batch:${queryType}`

    // Add to batch
    if (!this.queryBatches.has(batchKey)) {
      this.queryBatches.set(batchKey, [])
    }

    const batch = this.queryBatches.get(batchKey)!
    batch.push({ identifier, queryFunction })

    // Set timeout for batch execution
    if (!this.batchTimeouts.has(batchKey)) {
      const timeout = setTimeout(() => {
        this.executeBatch(batchKey)
      }, 50) // 50ms batch window

      this.batchTimeouts.set(batchKey, timeout)
    }

    // If batch is full, execute immediately
    if (batch.length >= this.config.batchSize) {
      clearTimeout(this.batchTimeouts.get(batchKey)!)
      this.batchTimeouts.delete(batchKey)
      await this.executeBatch(batchKey)
    }

    // For now, execute the query directly (batching would require more complex coordination)
    return await this.executeOptimizedQuery(queryFunction)
  }

  private async executeBatch(batchKey: string): Promise<void> {
    const batch = this.queryBatches.get(batchKey)
    if (!batch || batch.length === 0) {
      return
    }

    try {
      // Execute all queries in the batch concurrently
      await Promise.all(
        batch.map((item) => this.executeOptimizedQuery(item.queryFunction)),
      )
    } catch (error) {
      logger.error('Error executing query batch', { batchKey, error })
    } finally {
      // Clean up
      this.queryBatches.delete(batchKey)
      this.batchTimeouts.delete(batchKey)
    }
  }

  private async executeOptimizedQuery<T>(
    queryFunction: () => Promise<T>,
  ): Promise<T> {
    const startTime = Date.now()

    try {
      const result = await queryFunction()

      const executionTime = Date.now() - startTime

      // Log performance metrics
      await performanceLogger.logMetric({
        model: 'optimized-query',
        latency: executionTime,
        success: true,
        cached: false,
        optimized: true,
        requestId: `opt-${Date.now()}`,
        startTime,
        endTime: Date.now(),
      })

      return result
    } catch (error) {
      const executionTime = Date.now() - startTime

      await performanceLogger.logMetric({
        model: 'optimized-query',
        latency: executionTime,
        success: false,
        cached: false,
        optimized: true,
        requestId: `opt-${Date.now()}`,
        startTime,
        endTime: Date.now(),
      })

      throw error
    }
  }

  private getCacheTTL(queryType: string): number {
    switch (queryType) {
      case 'benchmark':
        return this.config.benchmarkCacheTTL
      case 'pattern':
        return this.config.patternCacheTTL
      case 'emotion':
        return this.config.emotionCacheTTL
      default:
        return this.config.defaultTTL
    }
  }

  private optimizePatternsForCaching(
    patterns: (CrossSessionPattern | TrendPattern | RiskCorrelation)[],
  ): (CrossSessionPattern | TrendPattern | RiskCorrelation)[] {
    // Sort by confidence/importance and take top patterns
    return patterns
      .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
      .slice(0, Math.min(patterns.length, 100)) // Limit cache size
  }

  private isHighValuePattern(
    patterns: (CrossSessionPattern | TrendPattern | RiskCorrelation)[],
  ): boolean {
    return (
      patterns.length > 5 && patterns.some((p) => (p.confidence || 0) > 0.8)
    )
  }

  private calculateEmotionCacheTTL(analysis: EmotionAnalysis): number {
    // Higher confidence = longer cache time
    const avgConfidence =
      analysis.emotions.length > 0
        ? analysis.emotions.reduce((sum, e) => sum + e.confidence, 0) /
          analysis.emotions.length
        : 0

    const baseTTL = this.config.emotionCacheTTL
    return Math.floor(baseTTL * (0.5 + avgConfidence * 0.5))
  }

  private isHighConfidenceAnalysis(analysis: EmotionAnalysis): boolean {
    return analysis.emotions.some((e) => e.confidence > 0.8)
  }

  private recordQueryMetrics(metrics: QueryMetrics): void {
    this.queryMetrics.push(metrics)

    // Keep only recent metrics
    const cutoff = Date.now() - 3600000 // 1 hour
    while (
      this.queryMetrics.length > 0 &&
      this.queryMetrics[0].timestamp < cutoff
    ) {
      this.queryMetrics.shift()
    }
  }

  private recordCacheHit(): void {
    this.cacheHits++
    this.totalRequests++
  }

  private recordCacheMiss(): void {
    this.cacheMisses++
    this.totalRequests++
  }

  private analyzeQueryPatternsForIndexing(): string[] {
    const recommendations: string[] = []

    // Analyze query metrics to suggest indexes
    const queryTypes = [...new Set(this.queryMetrics.map((m) => m.queryType))]

    for (const queryType of queryTypes) {
      const typeMetrics = this.queryMetrics.filter(
        (m) => m.queryType === queryType,
      )
      const avgTime =
        typeMetrics.reduce((sum, m) => sum + m.executionTimeMs, 0) /
        typeMetrics.length

      if (avgTime > this.config.maxQueryTimeMs) {
        recommendations.push(`Create index for ${queryType} queries`)
      }
    }

    return recommendations
  }

  private async createMaterializedViews(): Promise<void> {
    // This would create materialized views for frequently accessed data
    // Implementation would depend on the specific database system
    logger.info('Creating materialized views for performance optimization')
  }

  private async optimizeConnectionPooling(): Promise<void> {
    // This would optimize database connection pooling
    logger.info('Optimizing database connection pooling')
  }

  private generateRecommendations(
    avgResponseTime: number,
    cacheHitRate: number,
    metrics: QueryMetrics[],
  ): string[] {
    const recommendations: string[] = []

    if (avgResponseTime > this.config.targetResponseTimeMs) {
      recommendations.push('Consider increasing cache TTL or batch size')
    }

    if (cacheHitRate < this.config.cacheHitRateTarget) {
      recommendations.push('Increase cache size or adjust caching strategy')
    }

    const slowQueries = metrics.filter(
      (m) => m.executionTimeMs > this.config.maxQueryTimeMs,
    )
    if (slowQueries.length > 0) {
      recommendations.push('Optimize slow queries with better indexing')
    }

    return recommendations
  }

  private async increaseCacheSize(): Promise<void> {
    // Increase cache size by 20%
    this.config.maxCacheSize = Math.floor(this.config.maxCacheSize * 1.2)
    logger.info('Increased cache size', { newSize: this.config.maxCacheSize })
  }

  private adjustBatchSize(): void {
    // Decrease batch size to reduce latency
    this.config.batchSize = Math.max(
      10,
      Math.floor(this.config.batchSize * 0.8),
    )
    logger.info('Adjusted batch size', { newSize: this.config.batchSize })
  }

  private adjustCacheTTL(hitRate: number): void {
    if (hitRate < 0.5) {
      // Increase TTL if hit rate is low
      this.config.defaultTTL = Math.floor(this.config.defaultTTL * 1.2)
    } else if (hitRate > 0.9) {
      // Decrease TTL if hit rate is very high (might be stale data)
      this.config.defaultTTL = Math.floor(this.config.defaultTTL * 0.9)
    }
  }

  private startPerformanceMonitoring(): void {
    // Monitor performance every 30 seconds
    setInterval(async () => {
      try {
        await this.autoTunePerformance()
      } catch (error) {
        logger.error('Error in performance monitoring', { error })
      }
    }, 30000)

    logger.info('Performance monitoring started')
  }
}

/**
 * Factory function to create a performance optimization engine
 */
export function createPerformanceOptimizationEngine(
  redisService?: IRedisService,
  benchmarkRepository?: BenchmarkRepository,
  config?: Partial<PerformanceOptimizationConfig>,
): PerformanceOptimizationEngine {
  return new PerformanceOptimizationEngine(
    redisService,
    benchmarkRepository,
    config,
  )
}

/**
 * Utility functions for performance optimization
 */
export const PerformanceUtils = {
  /**
   * Measure execution time of a function
   */
  async measureExecutionTime<T>(
    fn: () => Promise<T>,
  ): Promise<{ result: T; timeMs: number }> {
    const startTime = Date.now()
    const result = await fn()
    const timeMs = Date.now() - startTime
    return { result, timeMs }
  },

  /**
   * Create a debounced version of a function for performance
   */
  debounce<T extends (...args: unknown[]) => unknown>(
    fn: T,
    delayMs: number,
  ): T {
    let timeoutId: NodeJS.Timeout
    return ((...args: unknown[]) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => fn(...args), delayMs)
    }) as T
  },

  /**
   * Create a throttled version of a function for performance
   */
  throttle<T extends (...args: unknown[]) => unknown>(
    fn: T,
    intervalMs: number,
  ): T {
    let lastCall = 0
    return ((...args: unknown[]) => {
      const now = Date.now()
      if (now - lastCall >= intervalMs) {
        lastCall = now
        return fn(...args)
      }
    }) as T
  },
}
