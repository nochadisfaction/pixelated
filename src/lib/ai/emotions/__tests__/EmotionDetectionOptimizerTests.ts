import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EmotionDetectionEngine } from '../EmotionDetectionEngine'
import { EmotionLlamaProvider } from '../../providers/EmotionLlamaProvider'
import { PerformanceLogger } from '../../../logging/performance-logger'

interface TestGlobalWithOptionalFetch extends NodeJS.Global {
  fetch?: (input: RequestInfo | URL, init?: RequestInit | undefined) => Promise<Response>;
}

// Mock dependencies
vi.mock('../../providers/EmotionLlamaProvider', () => ({
  EmotionLlamaProvider: vi.fn().mockImplementation(() => ({
    analyzeEmotions: vi.fn().mockResolvedValue({
      emotions: [
        { type: 'joy', confidence: 0.8, intensity: 0.7 },
        { type: 'surprise', confidence: 0.6, intensity: 0.5 },
      ],
      timestamp: new Date().toISOString(),
    }),
    analyzeVoice: vi.fn().mockResolvedValue({
      emotions: [
        { type: 'joy', confidence: 0.8, intensity: 0.7 },
        { type: 'surprise', confidence: 0.6, intensity: 0.5 },
      ],
      timestamp: new Date().toISOString(),
    }),
    getBaseUrl: vi.fn().mockReturnValue('https://api.example.com'),
    getApiKey: vi.fn().mockReturnValue('mock-api-key'),
  })),
}))
vi.mock('../../../logging/performance-logger', () => ({
  PerformanceLogger: {
    getInstance: vi.fn(() => ({
      logMetric: vi.fn().mockResolvedValue(undefined),
    })),
  },
}))

describe('EmotionDetectionEngine Optimization', () => {
  let engine: EmotionDetectionEngine
  let mockProvider: EmotionLlamaProvider
  let mockPerformanceLogger: PerformanceLogger
  let originalFetch: typeof global.fetch | undefined;

  beforeEach(() => {
    vi.clearAllMocks()
    // Create the engine with test options
    engine = new EmotionDetectionEngine({
      batchSize: 3,
      useCache: true,
      cacheTTLMs: 1000,
      useAdaptiveBatchSize: true,
      targetProcessingTimeMs: 100,
      maxCacheSize: 10,
      useRealTimeEndpoint: true,
      maxConcurrentRequests: 5,
    })
    // Insert mock provider
    mockProvider = new (EmotionLlamaProvider as any)()
    Object.defineProperty(engine, 'provider', {
      value: mockProvider,
      writable: true,
    })
    // Insert mock performance logger
    mockPerformanceLogger = PerformanceLogger.getInstance()
    originalFetch = global.fetch;
  })

  afterEach(() => {
    vi.clearAllMocks();

    const currentFetch = global.fetch as any;
    if (currentFetch && typeof currentFetch.mockRestore === 'function') {
      currentFetch.mockRestore();
    }

    // Always try to restore originalFetch if it was captured.
    if (typeof originalFetch !== 'undefined') {
      global.fetch = originalFetch;
    } else if (typeof global.fetch !== 'undefined' && !(currentFetch && typeof currentFetch.mockRestore === 'function')) {
      // If originalFetch was undefined, and currentFetch is not a mock we could restore,
      // delete global.fetch to clean up if a test set it directly.
      delete (global as TestGlobalWithOptionalFetch).fetch;
    }
  })

  describe('Real-time Optimization', () => {
    it('should process real-time requests with higher priority', async () => {
      // Create spy to track the internal priority queue
      Object.defineProperty(engine, 'addToBatch', {
        value: vi.fn(),
        writable: true,
      })
      const addToBatchSpy = (engine as any).addToBatch

      // Make a real-time request
      await engine.detectEmotionsFromTextRealTime(
        'Test text for real-time analysis',
      )

      // Verify real-time priority was used
      expect(addToBatchSpy).toHaveBeenCalledWith(
        'Test text for real-time analysis',
        3, // ProcessingPriority.REAL_TIME = 3
        expect.anything(),
      )

      // Verify performance tracking
      expect(mockPerformanceLogger.logMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'emotion-detection-real-time',
          optimized: true,
        }),
      )
    })

    it('should prioritize real-time requests over standard requests', async () => {
      // Create spies to track method execution order
      Object.defineProperty(engine, 'processBatch', {
        value: vi.fn(),
        writable: true,
      })
      Object.defineProperty(engine, 'processItem', {
        value: vi.fn(),
        writable: true,
      })
      const processBatchSpy = (engine as any).processBatch
      const processItemSpy = (engine as any).processItem

      // Set up behavior to track processing order
      const processOrder: string[] = []
      processItemSpy.mockImplementation(async (item: any) => {
        processOrder.push(item.data)
        return mockProvider.analyzeEmotions('', {})
      })

      // Create mixed batch of requests
      const standardPromise = engine.detectEmotionsFromText('Standard request')
      const realtimePromise =
        engine.detectEmotionsFromTextRealTime('Realtime request')
      const standardPromise2 = engine.detectEmotionsFromText(
        'Another standard request',
      )

      await Promise.all([standardPromise, realtimePromise, standardPromise2])

      // Verify processBatch was called
      expect(processBatchSpy).toHaveBeenCalled()

      // Verify the real-time request was processed first
      expect(processOrder[0]).toBe('Realtime request')
    })

    it('should use the dedicated real-time endpoint when enabled', async () => {
      // Create spy for the real-time analysis method
      Object.defineProperty(engine, 'analyzeEmotionsFromTextRealTime', {
        value: vi.fn(),
        writable: true,
      })
      const realTimeMethodSpy = (engine as any).analyzeEmotionsFromTextRealTime

      // Configure fetch mock for real-time endpoint
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          emotions: [
            { type: 'joy', confidence: 0.9, intensity: 0.8 },
            { type: 'excitement', confidence: 0.7, intensity: 0.6 },
          ],
        }),
      }) as any

      // Make a real-time request
      await engine.detectEmotionsFromTextRealTime('Test real-time API')

      // Verify the real-time analysis method was used
      expect(realTimeMethodSpy).toHaveBeenCalled()

      // Verify fetch was called with the real-time endpoint
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/emotions/analyze/realtime'),
        expect.anything(),
      )
    })

    it('should fall back to standard endpoint if real-time fails', async () => {
      // Mock the real-time endpoint to fail
      global.fetch = vi
        .fn()
        .mockRejectedValueOnce(new Error('Real-time API failed'))
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            emotions: [{ type: 'neutral', confidence: 0.8, intensity: 0.5 }],
          }),
        }) as any

      // Create spies for the real-time and standard analysis methods
      Object.defineProperty(engine, 'analyzeEmotionsFromTextRealTime', {
        value: vi.fn(),
        writable: true,
      })
      Object.defineProperty(engine, 'analyzeEmotionsFromText', {
        value: vi.fn(),
        writable: true,
      })
      const realTimeMethodSpy = (engine as any).analyzeEmotionsFromTextRealTime
      const standardMethodSpy = (engine as any).analyzeEmotionsFromText

      // Make a real-time request
      const result =
        await engine.detectEmotionsFromTextRealTime('Test fallback')

      // Verify the real-time method was attempted
      expect(realTimeMethodSpy).toHaveBeenCalled()

      // Verify the standard method was used as fallback
      expect(standardMethodSpy).toHaveBeenCalled()

      // Verify we got a result despite the error
      expect(result.emotions).toBeDefined()
    })
  })

  describe('Caching Optimization', () => {
    it('should cache results and reuse them for identical requests', async () => {
      // Make the first request
      await engine.detectEmotionsFromText('Cache test text')

      // Reset the provider mock to track if it's called again
      mockProvider.analyzeEmotions = vi.fn().mockResolvedValue({
        emotions: [{ type: 'different', confidence: 0.5, intensity: 0.5 }],
        timestamp: new Date().toISOString(),
      })

      // Make the same request again
      const result = await engine.detectEmotionsFromText('Cache test text')

      // The provider should not have been called again
      expect(mockProvider.analyzeEmotions).not.toHaveBeenCalled()

      // Result should match the original cached result, not the new mock
      expect(result.emotions.some((e) => e.type === 'joy')).toBe(true)
      expect(result.emotions.some((e) => e.type === 'different')).toBe(false)
    })

    it('should respect cache TTL and refresh expired results', async () => {
      // Create engine with short TTL for testing
      const shortTTLEngine = new EmotionDetectionEngine({
        useCache: true,
        cacheTTLMs: 10, // Very short TTL for testing
      })

      // Make the first request
      await shortTTLEngine.detectEmotionsFromText('TTL test')

      // Reset provider mock to track next call
      mockProvider.analyzeEmotions = vi.fn().mockResolvedValue({
        emotions: [{ type: 'refreshed', confidence: 0.8, intensity: 0.7 }],
        timestamp: new Date().toISOString(),
      })

      // Wait for cache to expire
      await new Promise((resolve) => setTimeout(resolve, 20))

      // Make the same request again
      const result = await shortTTLEngine.detectEmotionsFromText('TTL test')

      // Provider should have been called again due to expired cache
      expect(mockProvider.analyzeEmotions).toHaveBeenCalled()

      // Result should have the refreshed data
      expect(result.emotions.some((e) => e.type === 'refreshed')).toBe(true)
    })

    it('should implement LRU cache eviction when reaching max size', async () => {
      // Create engine with small cache size
      const smallCacheEngine = new EmotionDetectionEngine({
        useCache: true,
        maxCacheSize: 2, // Only allow 2 items in cache
      })

      // Create spy for the eviction method
      Object.defineProperty(smallCacheEngine, 'evictLRUCache', {
        value: vi.fn(),
        writable: true,
      })
      const evictSpy = (smallCacheEngine as any).evictLRUCache

      // Fill the cache
      await smallCacheEngine.detectEmotionsFromText('Cache item 1')
      await smallCacheEngine.detectEmotionsFromText('Cache item 2')

      // Add one more to trigger eviction
      await smallCacheEngine.detectEmotionsFromText('Cache item 3')

      // Verify eviction was triggered
      expect(evictSpy).toHaveBeenCalled()

      // Get cache metrics
      const metrics = smallCacheEngine.getCacheMetrics()

      // Cache size should not exceed max
      expect(metrics.size).toBeLessThanOrEqual(2)
    })
  })

  describe('Adaptive Batch Sizing', () => {
    it('should adjust batch size based on processing times', async () => {
      // Override the processingTimes array with mock data to simulate slow processing
      Object.defineProperty(engine, 'processingTimes', {
        get: vi.fn().mockReturnValue([150, 160, 170]), // Above target of 100ms
        set: vi.fn(),
        configurable: true,
      })

      // Call the optimize method directly
      Object.defineProperty(engine, 'optimizeBatchSize', {
        value: vi.fn(),
        writable: true,
      })
      const optimizeSpy = (engine as any).optimizeBatchSize
      ;
      (engine as unknown as { optimizeBatchSize: () => void }).optimizeBatchSize();

      // Verify optimization was called
      expect(optimizeSpy).toHaveBeenCalled()

      // Check that batch size was decreased
      expect(Object.getOwnPropertyDescriptor(engine, 'currentBatchSize')?.value).toBeLessThan(3);

      // Now simulate fast processing
      Object.defineProperty(engine, 'processingTimes', {
        get: vi.fn().mockReturnValue([50, 55, 60]), // Below target of 100ms
      })

      // Reset batch size for testing
      Object.defineProperty(engine, 'currentBatchSize', { value: 3, writable: true, configurable: true });

      // Call optimize again
      (engine as unknown as { optimizeBatchSize: () => void }).optimizeBatchSize();

      // Check that batch size was increased
      expect(Object.getOwnPropertyDescriptor(engine, 'currentBatchSize')?.value).toBeGreaterThan(3);
    })

    it('should consider stability of processing times in optimization', async () => {
      // Simulate stable fast processing (low standard deviation)
      Object.defineProperty(engine, 'processingTimes', {
        get: vi.fn().mockReturnValue([52, 50, 51, 53, 50]), // Very consistent
        set: vi.fn(),
        configurable: true,
      })

      // Capture initial batch size
      const initialBatchSize = Object.getOwnPropertyDescriptor(engine, 'currentBatchSize')?.value as number;

      // Call optimize
      ;
      (engine as unknown as { optimizeBatchSize: () => void }).optimizeBatchSize();

      // Should increase more aggressively when stable
      expect(Object.getOwnPropertyDescriptor(engine, 'currentBatchSize')?.value).toBe(initialBatchSize + 1);

      // Reset batch size for next test
      ;
      Object.defineProperty(engine, 'currentBatchSize', { value: initialBatchSize, writable: true, configurable: true });

      // Now simulate unstable processing (high standard deviation)
      Object.defineProperty(engine, 'processingTimes', {
        get: vi.fn().mockReturnValue([20, 50, 90, 30, 70]), // Very inconsistent
        set: vi.fn(),
        configurable: true,
      })

      // Call optimize again
      ;
      (engine as unknown as { optimizeBatchSize: () => void }).optimizeBatchSize();

      // Should be more conservative with unstable times
      expect(Object.getOwnPropertyDescriptor(engine, 'currentBatchSize')?.value).toBe(initialBatchSize);
    })
  })

  describe('Concurrency Management', () => {
    it('should respect concurrency limits when processing batches', async () => {
      // Create spy for the concurrency method
      Object.defineProperty(engine, 'processWithConcurrencyLimit', {
        value: vi.fn(),
        writable: true,
      })
      const concurrencySpy = (engine as any).processWithConcurrencyLimit

      // Mock a delay in processing to test concurrency
      mockProvider.analyzeEmotions = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
        return {
          emotions: [{ type: 'joy', confidence: 0.8, intensity: 0.7 }],
          timestamp: new Date().toISOString(),
        }
      })

      // Submit multiple requests
      const promises = []
      for (let i = 0; i < 10; i++) {
        promises.push(engine.detectEmotionsFromText(`Concurrent request ${i}`))
      }

      // Wait for all to complete
      await Promise.all(promises)

      // Verify concurrency method was called
      expect(concurrencySpy).toHaveBeenCalled()

      // Verify batch was processed in chunks
      const { calls } = concurrencySpy.mock
      expect(calls.length).toBeGreaterThan(0)

      // Each call should have items array
      const items = calls[0][0]
      expect(Array.isArray(items)).toBe(true)
    })
  })

  describe('Performance Monitoring', () => {
    it('should log comprehensive performance metrics', async () => {
      // Create spy for performance logger
      const logMetricSpy = (mockPerformanceLogger.logMetric = vi.fn())

      // Process a request
      await engine.detectEmotionsFromTextRealTime('Performance test')

      // Verify metrics were logged
      expect(logMetricSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'emotion-detection-real-time',
          success: true,
          optimized: true,
          metadata: expect.objectContaining({
            textLength: 'Performance test'.length,
          }),
        }),
      )
    })

    it('should track cache hit rate metrics', async () => {
      // Make initial request to populate cache
      await engine.detectEmotionsFromText('Cache metrics test')

      // Make same request to trigger cache hit
      await engine.detectEmotionsFromText('Cache metrics test')

      // Make different request for cache miss
      await engine.detectEmotionsFromText('Different request')

      // Get cache metrics
      const metrics = engine.getCacheMetrics()

      // Should have 2 items in cache
      expect(metrics.size).toBe(2)

      // Hit rate should be 1/3 (one hit out of three requests)
      expect(metrics.hitRate).toBeCloseTo(0.33, 1)
    })
  })
})
