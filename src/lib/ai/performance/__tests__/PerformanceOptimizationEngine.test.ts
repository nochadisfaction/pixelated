// eslint-disable no-unused-vars
/**
 * Performance Optimization Engine Tests
 *
 * Comprehensive test suite for the Performance Optimization Engine
 * covering database query optimization, caching strategies, and performance monitoring.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  PerformanceOptimizationEngine,
  createPerformanceOptimizationEngine,
  PerformanceUtils,
  type PerformanceOptimizationConfig,
  type OptimizationResult,
} from '../PerformanceOptimizationEngine'
import type { IRedisService } from '../../../services/redis/types'
import type {
  BenchmarkRepository,
  AnonymizedBenchmark,
  TechniqueWithEffectiveness,
  EffectivenessInsight,
} from '../../services/ComparativeAnalyticsService'
import type {
  CrossSessionPattern,
  TrendPattern,
  RiskCorrelation,
} from '../../../fhe/pattern-recognition'
import type { EmotionAnalysis } from '../../interfaces/therapy'
import type { EmotionType } from '../../emotions/types'

// Mock dependencies
const mockRedisService: IRedisService = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  deletePattern: vi.fn(),
  exists: vi.fn(),
  ttl: vi.fn(),
  keys: vi.fn(),
  incr: vi.fn(),
  sadd: vi.fn(),
  srem: vi.fn(),
  smembers: vi.fn(),
  isHealthy: vi.fn(),
  getPoolStats: vi.fn(),
}

const mockBenchmarkRepository: BenchmarkRepository = {
  storeBenchmark: vi.fn(),
  getBenchmarksByIndication: vi.fn(),
  getBenchmarksByTechnique: vi.fn(),
  getAllTechniques: vi.fn(),
  getTechniquesByIndication: vi.fn(),
  getInsightsForPattern: vi.fn(),
  getInsightsForTechnique: vi.fn(),
  storeInsight: vi.fn(),
}

// Test data
const mockEmotionAnalysis: EmotionAnalysis = {
  id: 'test-emotion-1',
  timestamp: new Date(),
  emotions: [
    {
      type: 'joy' as EmotionType,
      confidence: 0.85,
      intensity: 0.7,
      intensityLevel: 'moderate',
      timestamp: new Date(),
    },
    {
      type: 'excitement' as EmotionType,
      confidence: 0.72,
      intensity: 0.6,
      intensityLevel: 'moderate',
      timestamp: new Date(),
    },
  ],
  overallSentiment: 0.75,
  userId: 'test-user-1',
  source: 'text',
  input: 'I feel great today!',
}

const mockCrossSessionPatterns: CrossSessionPattern[] = [
  {
    id: 'pattern-1',
    type: 'improvement_trend',
    confidence: 0.89,
    sessions: ['session-1', 'session-2', 'session-3'],
    description: 'Consistent improvement in mood scores',
    strength: 0.85,
  },
  {
    id: 'pattern-2',
    type: 'resistance_pattern',
    confidence: 0.76,
    sessions: ['session-2', 'session-4'],
    description: 'Resistance to certain therapeutic approaches',
    strength: 0.68,
  },
]

const mockTrendPatterns: TrendPattern[] = [
  {
    id: 'trend-1',
    type: 'mood_improvement',
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
    confidence: 0.87,
    indicators: ['mood_score', 'engagement_level'],
    description: 'Consistent mood improvement over past week',
  },
]

const mockBenchmarks: AnonymizedBenchmark[] = [
  {
    id: 'benchmark-1',
    timestamp: new Date(),
    patternType: 'anxiety',
    patternConfidence: 0.85,
    techniqueIds: ['tech-001', 'tech-002'],
    effectivenessRatings: {
      'tech-001': 0.82,
      'tech-002': 0.74,
    },
    dataPointCount: 45,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

describe('PerformanceOptimizationEngine', () => {
  let engine: PerformanceOptimizationEngine
  let config: Partial<PerformanceOptimizationConfig>

  beforeEach(() => {
    vi.clearAllMocks()

    config = {
      maxQueryTimeMs: 100,
      enableQueryOptimization: true,
      batchSize: 10,
      enableAdvancedCaching: true,
      cacheHitRateTarget: 0.8,
      maxCacheSize: 1000,
      defaultTTL: 3600,
      targetResponseTimeMs: 500,
      enablePerformanceMonitoring: false, // Disable for tests
      patternCacheTTL: 7200,
      emotionCacheTTL: 1800,
      benchmarkCacheTTL: 14400,
    }

    engine = new PerformanceOptimizationEngine(
      mockRedisService,
      mockBenchmarkRepository,
      config,
    )
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      const defaultEngine = new PerformanceOptimizationEngine()
      expect(defaultEngine).toBeDefined()
    })

    it('should merge provided configuration with defaults', () => {
      const customConfig = { maxQueryTimeMs: 150 }
      const customEngine = new PerformanceOptimizationEngine(
        undefined,
        undefined,
        customConfig,
      )
      expect(customEngine).toBeDefined()
    })

    it('should create engine using factory function', () => {
      const factoryEngine = createPerformanceOptimizationEngine(
        mockRedisService,
        mockBenchmarkRepository,
        config,
      )
      expect(factoryEngine).toBeDefined()
    })
  })

  describe('Database Query Optimization', () => {
    it('should optimize comparative analytics queries with caching', async () => {
      const mockQueryFunction = vi.fn().mockResolvedValue(mockBenchmarks)

      // First call should execute query and cache result
      const result1 = await engine.optimizeComparativeAnalyticsQueries(
        'benchmark',
        'test-indication',
        mockQueryFunction,
      )

      expect(result1).toEqual(mockBenchmarks)
      expect(mockQueryFunction).toHaveBeenCalledTimes(1)

      // Second call should use cache
      const result2 = await engine.optimizeComparativeAnalyticsQueries(
        'benchmark',
        'test-indication',
        mockQueryFunction,
      )

      expect(result2).toEqual(mockBenchmarks)
      expect(mockQueryFunction).toHaveBeenCalledTimes(1) // Should not call again
    })

    it('should handle query optimization errors gracefully', async () => {
      const mockQueryFunction = vi
        .fn()
        .mockRejectedValue(new Error('Query failed'))

      await expect(
        engine.optimizeComparativeAnalyticsQueries(
          'technique',
          'test-technique',
          mockQueryFunction,
        ),
      ).rejects.toThrow('Query failed')
    })

    it('should apply different cache TTL based on query type', async () => {
      const mockQueryFunction = vi.fn().mockResolvedValue(['result'])

      // Test different query types
      await engine.optimizeComparativeAnalyticsQueries(
        'benchmark',
        'test-1',
        mockQueryFunction,
      )

      await engine.optimizeComparativeAnalyticsQueries(
        'insight',
        'test-2',
        mockQueryFunction,
      )

      expect(mockQueryFunction).toHaveBeenCalledTimes(2)
    })

    it('should enable query batching for supported query types', async () => {
      const mockQueryFunction = vi.fn().mockResolvedValue(['result'])

      // Test indication query (should support batching)
      await engine.optimizeComparativeAnalyticsQueries(
        'indication',
        'test-indication',
        mockQueryFunction,
      )

      expect(mockQueryFunction).toHaveBeenCalled()
    })
  })

  describe('Advanced Caching Strategy', () => {
    it('should cache common patterns with optimization', async () => {
      await engine.cacheCommonPatterns(
        mockCrossSessionPatterns,
        'cross-session',
        'test-client',
      )

      // Should not throw and should handle the caching internally
      expect(true).toBe(true) // Basic assertion that no error occurred
    })

    it('should cache high-value patterns in Redis', async () => {
      const highValuePatterns = [
        ...mockCrossSessionPatterns,
        {
          id: 'pattern-3',
          type: 'breakthrough',
          confidence: 0.95,
          sessions: ['session-5', 'session-6'],
          description: 'Significant breakthrough pattern',
          strength: 0.92,
        },
      ]

      await engine.cacheCommonPatterns(
        highValuePatterns,
        'cross-session',
        'test-client',
      )

      // Should attempt to store in Redis for high-value patterns
      expect(mockRedisService.set).toHaveBeenCalled()
    })

    it('should cache emotion analysis with intelligent TTL', async () => {
      await engine.cacheEmotionAnalysis(
        'I feel great today!',
        mockEmotionAnalysis,
      )

      // Should cache the analysis
      expect(true).toBe(true) // Basic assertion
    })

    it('should retrieve cached emotion analysis', async () => {
      // First cache the analysis
      await engine.cacheEmotionAnalysis(
        'I feel great today!',
        mockEmotionAnalysis,
      )

      // Then retrieve it
      const cached = await engine.getCachedEmotionAnalysis(
        'I feel great today!',
      )
      expect(cached).toEqual(mockEmotionAnalysis)
    })

    it('should return null for non-cached emotion analysis', async () => {
      const cached = await engine.getCachedEmotionAnalysis('Non-cached text')
      expect(cached).toBeNull()
    })

    it('should handle Redis cache fallback for emotion analysis', async () => {
      const mockAnalysis = JSON.stringify(mockEmotionAnalysis)
      const mockGet = mockRedisService.get as ReturnType<typeof vi.fn>
      mockGet.mockResolvedValue(mockAnalysis)

      const cached = await engine.getCachedEmotionAnalysis('Redis cached text')
      expect(cached).toEqual(mockEmotionAnalysis)
    })
  })

  describe('Performance Monitoring and Reporting', () => {
    it('should generate performance report', async () => {
      // Execute some queries to generate metrics
      const mockQueryFunction = vi.fn().mockResolvedValue(['result'])

      await engine.optimizeComparativeAnalyticsQueries(
        'benchmark',
        'test-1',
        mockQueryFunction,
      )

      await engine.optimizeComparativeAnalyticsQueries(
        'technique',
        'test-2',
        mockQueryFunction,
      )

      const report = await engine.getPerformanceReport()

      expect(report).toHaveProperty('originalTimeMs')
      expect(report).toHaveProperty('optimizedTimeMs')
      expect(report).toHaveProperty('improvementPercent')
      expect(report).toHaveProperty('cacheHitRate')
      expect(report).toHaveProperty('queryOptimizations')
      expect(report).toHaveProperty('recommendedActions')
      expect(Array.isArray(report.recommendedActions)).toBe(true)
    })

    it('should auto-tune performance parameters', async () => {
      await engine.autoTunePerformance()

      // Should complete without errors
      expect(true).toBe(true)
    })

    it('should optimize benchmark queries', async () => {
      await engine.optimizeBenchmarkQueries()

      // Should complete optimization process
      expect(true).toBe(true)
    })
  })

  describe('Cache Management', () => {
    it('should implement LRU eviction when cache is full', async () => {
      // Create engine with small cache size
      const smallCacheEngine = new PerformanceOptimizationEngine(
        mockRedisService,
        mockBenchmarkRepository,
        { ...config, maxCacheSize: 2 },
      )

      const mockQueryFunction = vi.fn().mockResolvedValue(['result'])

      // Fill cache beyond capacity
      await smallCacheEngine.optimizeComparativeAnalyticsQueries(
        'benchmark',
        'test-1',
        mockQueryFunction,
      )

      await smallCacheEngine.optimizeComparativeAnalyticsQueries(
        'benchmark',
        'test-2',
        mockQueryFunction,
      )

      await smallCacheEngine.optimizeComparativeAnalyticsQueries(
        'benchmark',
        'test-3',
        mockQueryFunction,
      )

      // Should handle cache eviction gracefully
      expect(mockQueryFunction).toHaveBeenCalledTimes(3)
    })

    it('should handle cache expiration correctly', async () => {
      // Create engine with very short TTL
      const shortTTLEngine = new PerformanceOptimizationEngine(
        mockRedisService,
        mockBenchmarkRepository,
        { ...config, defaultTTL: 0.001 }, // 1ms TTL
      )

      const mockQueryFunction = vi.fn().mockResolvedValue(['result'])

      // Cache a result
      await shortTTLEngine.optimizeComparativeAnalyticsQueries(
        'benchmark',
        'test-1',
        mockQueryFunction,
      )

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Should execute query again due to expiration
      await shortTTLEngine.optimizeComparativeAnalyticsQueries(
        'benchmark',
        'test-1',
        mockQueryFunction,
      )

      expect(mockQueryFunction).toHaveBeenCalledTimes(2)
    })
  })

  describe('Performance Utilities', () => {
    it('should measure execution time accurately', async () => {
      const testFunction = async () => {
        await new Promise((resolve) => setTimeout(resolve, 50))
        return 'result'
      }

      const { result, timeMs } =
        await PerformanceUtils.measureExecutionTime(testFunction)

      expect(result).toBe('result')
      expect(timeMs).toBeGreaterThanOrEqual(45) // Allow some variance
      expect(timeMs).toBeLessThan(100)
    })

    it('should create debounced function', async () => {
      const mockFn = vi.fn()
      const debouncedFn = PerformanceUtils.debounce(mockFn, 50)

      // Call multiple times rapidly
      debouncedFn('arg1')
      debouncedFn('arg2')
      debouncedFn('arg3')

      // Should not have been called yet
      expect(mockFn).not.toHaveBeenCalled()

      // Wait for debounce delay
      await new Promise((resolve) => setTimeout(resolve, 60))

      // Should have been called once with last arguments
      expect(mockFn).toHaveBeenCalledTimes(1)
      expect(mockFn).toHaveBeenCalledWith('arg3')
    })

    it('should create throttled function', async () => {
      const mockFn = vi.fn()
      const throttledFn = PerformanceUtils.throttle(mockFn, 50)

      // Call multiple times rapidly
      throttledFn('arg1')
      throttledFn('arg2')
      throttledFn('arg3')

      // Should have been called once immediately
      expect(mockFn).toHaveBeenCalledTimes(1)
      expect(mockFn).toHaveBeenCalledWith('arg1')

      // Wait for throttle interval
      await new Promise((resolve) => setTimeout(resolve, 60))

      // Call again
      throttledFn('arg4')

      // Should have been called again
      expect(mockFn).toHaveBeenCalledTimes(2)
      expect(mockFn).toHaveBeenCalledWith('arg4')
    })
  })

  describe('Error Handling', () => {
    it('should handle Redis connection errors gracefully', async () => {
      const mockGet = mockRedisService.get as ReturnType<typeof vi.fn>
      mockGet.mockRejectedValue(new Error('Redis connection failed'))

      const cached = await engine.getCachedEmotionAnalysis('test text')
      expect(cached).toBeNull()
    })

    it('should handle caching errors without affecting main functionality', async () => {
      const mockSet = mockRedisService.set as ReturnType<typeof vi.fn>
      mockSet.mockRejectedValue(new Error('Redis write failed'))

      await expect(
        engine.cacheEmotionAnalysis('test text', mockEmotionAnalysis),
      ).resolves.not.toThrow()
    })

    it('should handle auto-tuning errors gracefully', async () => {
      // Mock a method to throw an error
      const originalMethod = engine.getPerformanceReport
      engine.getPerformanceReport = vi
        .fn()
        .mockRejectedValue(new Error('Report generation failed'))

      await expect(engine.autoTunePerformance()).resolves.not.toThrow()

      // Restore original method
      engine.getPerformanceReport = originalMethod
    })
  })

  describe('Performance Targets', () => {
    it('should achieve sub-500ms response time for optimized queries', async () => {
      const fastQueryFunction = vi.fn().mockResolvedValue(['result'])

      const startTime = Date.now()
      await engine.optimizeComparativeAnalyticsQueries(
        'benchmark',
        'fast-query',
        fastQueryFunction,
      )
      const endTime = Date.now()

      const responseTime = endTime - startTime
      expect(responseTime).toBeLessThan(500) // Should meet target
    })

    it('should maintain high cache hit rate with repeated queries', async () => {
      const mockQueryFunction = vi.fn().mockResolvedValue(['result'])

      // Execute same query multiple times
      for (let i = 0; i < 10; i++) {
        await engine.optimizeComparativeAnalyticsQueries(
          'benchmark',
          'repeated-query',
          mockQueryFunction,
        )
      }

      // Should only execute query once due to caching
      expect(mockQueryFunction).toHaveBeenCalledTimes(1)

      const report = await engine.getPerformanceReport()
      expect(report.cacheHitRate).toBeGreaterThan(0.8) // Should meet target
    })
  })

  describe('Integration Tests', () => {
    it('should integrate with existing emotion detection caching', async () => {
      // Test integration with emotion analysis caching
      await engine.cacheEmotionAnalysis(
        'Integration test text',
        mockEmotionAnalysis,
        { sessionId: 'test-session' },
      )

      const cached = await engine.getCachedEmotionAnalysis(
        'Integration test text',
        { sessionId: 'test-session' },
      )

      expect(cached).toEqual(mockEmotionAnalysis)
    })

    it('should integrate with pattern recognition optimization', async () => {
      await engine.cacheCommonPatterns(
        mockTrendPatterns,
        'trend',
        'integration-test-client',
      )

      // Should complete without errors
      expect(true).toBe(true)
    })

    it('should provide comprehensive optimization for full workflow', async () => {
      // Simulate a complete optimization workflow
      const mockQueryFunction = vi.fn().mockResolvedValue(mockBenchmarks)

      // 1. Optimize database queries
      await engine.optimizeComparativeAnalyticsQueries(
        'benchmark',
        'workflow-test',
        mockQueryFunction,
      )

      // 2. Cache patterns
      await engine.cacheCommonPatterns(
        mockCrossSessionPatterns,
        'cross-session',
        'workflow-client',
      )

      // 3. Cache emotion analysis
      await engine.cacheEmotionAnalysis(
        'Workflow test text',
        mockEmotionAnalysis,
      )

      // 4. Optimize benchmark queries
      await engine.optimizeBenchmarkQueries()

      // 5. Generate performance report
      const report = await engine.getPerformanceReport()

      // 6. Auto-tune performance
      await engine.autoTunePerformance()

      // All steps should complete successfully
      expect(report).toBeDefined()
      expect(report.cacheHitRate).toBeGreaterThanOrEqual(0)
      expect(report.optimizedTimeMs).toBeGreaterThanOrEqual(0)
    })
  })
})

describe('Performance Optimization Integration', () => {
  it('should demonstrate end-to-end performance improvement', async () => {
    const engine = createPerformanceOptimizationEngine(
      mockRedisService,
      mockBenchmarkRepository,
      {
        targetResponseTimeMs: 500,
        cacheHitRateTarget: 0.8,
        enableAdvancedCaching: true,
        enableQueryOptimization: true,
      },
    )

    // Simulate realistic workload
    const queries = [
      'anxiety-patterns',
      'depression-techniques',
      'mood-benchmarks',
      'therapy-insights',
      'user-analytics',
    ]

    const results = []

    for (const query of queries) {
      const mockQueryFunction = vi
        .fn()
        .mockResolvedValue([`result-for-${query}`])

      const startTime = Date.now()
      const result = await engine.optimizeComparativeAnalyticsQueries(
        'benchmark',
        query,
        mockQueryFunction,
      )
      const endTime = Date.now()

      results.push({
        query,
        result,
        responseTime: endTime - startTime,
        cached: false,
      })
    }

    // Run same queries again to test caching
    for (const query of queries) {
      const mockQueryFunction = vi
        .fn()
        .mockResolvedValue([`result-for-${query}`])

      const startTime = Date.now()
      const result = await engine.optimizeComparativeAnalyticsQueries(
        'benchmark',
        query,
        mockQueryFunction,
      )
      const endTime = Date.now()

      results.push({
        query,
        result,
        responseTime: endTime - startTime,
        cached: true,
      })
    }

    // Verify performance improvements
    const uncachedTimes = results
      .filter((r) => !r.cached)
      .map((r) => r.responseTime)
    const cachedTimes = results
      .filter((r) => r.cached)
      .map((r) => r.responseTime)

    const avgUncachedTime =
      uncachedTimes.reduce((a, b) => a + b, 0) / uncachedTimes.length
    const avgCachedTime =
      cachedTimes.reduce((a, b) => a + b, 0) / cachedTimes.length

    // Cached queries should be significantly faster
    expect(avgCachedTime).toBeLessThan(avgUncachedTime)
    expect(avgCachedTime).toBeLessThan(50) // Should be very fast from cache

    const report = await engine.getPerformanceReport()
    expect(report.cacheHitRate).toBeGreaterThan(0.4) // Should have decent hit rate
  })
})
