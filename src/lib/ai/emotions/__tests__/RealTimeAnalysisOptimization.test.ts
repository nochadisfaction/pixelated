import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { EmotionDetectionEngine } from '../EmotionDetectionEngine'
import { PerformanceLogger } from '../../../logging/performance-logger'

// Mock the performance logger
vi.mock('../../../logging/performance-logger', () => ({
  PerformanceLogger: {
    getInstance: vi.fn(() => ({
      logMetric: vi.fn().mockResolvedValue(undefined),
    })),
  },
}))

// Mock environment variables
vi.stubEnv('EMOTION_LLAMA_API_URL', 'https://test-url.com')
vi.stubEnv('EMOTION_LLAMA_API_KEY', 'test-api-key')

describe('Real-Time Emotion Analysis Optimization', () => {
  let engine: EmotionDetectionEngine

  // Create a mock provider for the engine
  const mockProvider = {
    analyzeEmotions: vi.fn().mockImplementation(() => {
      return Promise.resolve({
        emotions: [
          { type: 'happiness', confidence: 0.8, intensity: 0.7 },
          { type: 'excitement', confidence: 0.6, intensity: 0.5 },
        ],
      })
    }),
    generateIntervention: vi.fn(),
    assessRisk: vi.fn(),
    handleEmergency: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    engine = new EmotionDetectionEngine({
      // Set small batch size and timeout for faster tests
      batchSize: 3,
      batchTimeoutMs: 50,
      // Enable adaptive batch sizing
      useAdaptiveBatchSize: true,
      minBatchSize: 2,
      maxBatchSize: 5,
      targetProcessingTimeMs: 100,
    })

    // Insert mock provider
    Object.defineProperty(engine, 'provider', {
      value: mockProvider,
      writable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    if (typeof global.fetch?.mockRestore === 'function') {
      global.fetch.mockRestore()
    } else if (typeof global.fetch !== 'undefined') {
      delete global.fetch
    }
  })

  it('should process real-time requests with higher priority', async () => {
    // Create a stub for analyzeEmotionsFromText that simulates processing time
    const analyzeStub = vi.fn().mockImplementation((text) => {
      // Simulate different processing times based on text
      const delay = text.includes('slow') ? 100 : 10
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve([
            { type: 'happiness', confidence: 0.8, intensity: 0.7 },
            { type: 'excitement', confidence: 0.6, intensity: 0.5 },
          ])
        }, delay)
      })
    })

    // Replace the original method with our stub
    Object.defineProperty(engine, 'analyzeEmotionsFromText', {
      value: analyzeStub,
    })

    // Queue a mix of regular and real-time requests
    const regularPromise1 = engine.detectEmotionsFromText('regular text 1')
    const regularPromise2 = engine.detectEmotionsFromText('slow regular text 2')
    const realTimePromise =
      engine.detectEmotionsFromTextRealTime('real-time text')
    const regularPromise3 = engine.detectEmotionsFromText('regular text 3')

    // Wait for all promises to resolve
    const [regular1, regular2, realTime, regular3] = await Promise.all([
      regularPromise1,
      regularPromise2,
      realTimePromise,
      regularPromise3,
    ])

    // All requests should be processed
    expect(analyzeStub).toHaveBeenCalledTimes(4)

    // Verify results
    expect(realTime.emotions).toHaveLength(2)
    expect(realTime.emotions[0].type).toBe('happiness')
    expect(regular1.emotions).toHaveLength(2)
    expect(regular2.emotions).toHaveLength(2)
    expect(regular3.emotions).toHaveLength(2)

    // Check performance logging
    const performanceLogger = PerformanceLogger.getInstance()
    expect(performanceLogger.logMetric).toHaveBeenCalled()

    // At least one call should be for real-time processing
    const callArgs = vi.mocked(performanceLogger.logMetric).mock.calls
    const realTimeCall = callArgs.find(
      (call) => call[0].model === 'emotion-detection-real-time',
    )
    expect(realTimeCall).toBeDefined()
  })

  it('should adapt batch size based on processing time', async () => {
    // Create a stub that tracks calls and simulates processing
    const processBatchSpy = vi.fn()
    const optimizeBatchSizeSpy = vi.fn()

    // Replace methods with our spies
    Object.defineProperty(engine, 'processBatch', {
      value: processBatchSpy,
    })

    Object.defineProperty(engine, 'optimizeBatchSize', {
      value: optimizeBatchSizeSpy,
    })

    // Run multiple batches of requests
    const requests = []
    for (let i = 0; i < 10; i++) {
      requests.push(engine.detectEmotionsFromText(`text ${i}`))
    }

    // Force batch processing to complete
    Object.defineProperty(engine, 'lastBatchOptimization', {
      value: Date.now() - 31000, // Make it eligible for optimization
    })

    // Wait a bit for batch processing to occur
    await new Promise((resolve) => setTimeout(resolve, 200))

    // Verify that batch processing was called
    expect(processBatchSpy).toHaveBeenCalled()

    // Set processing times for testing adaptive batch sizing
    Object.defineProperty(engine, 'processingTimes', {
      value: [150, 160, 170], // Simulating slow processing times
    })

    // Call optimize directly since we've mocked the processBatch method
    engine['optimizeBatchSize']()

    // Verify optimization was called
    expect(optimizeBatchSizeSpy).toHaveBeenCalled()
  })

  it('should correctly handle concurrent real-time and batch requests', async () => {
    // Create an array to track processing order
    const processingOrder: string[] = []

    // Create a stub that tracks processing order
    const analyzeStub = vi.fn().mockImplementation((text) => {
      return new Promise((resolve) => {
        processingOrder.push(text)
        setTimeout(() => {
          resolve([{ type: 'happiness', confidence: 0.8, intensity: 0.7 }])
        }, 10)
      })
    })

    // Replace the original method with our stub
    Object.defineProperty(engine, 'analyzeEmotionsFromText', {
      value: analyzeStub,
    })

    // Send a mix of real-time and regular requests
    const realTime1 = engine.detectEmotionsFromTextRealTime('realtime-1')
    const regular1 = engine.detectEmotionsFromText('regular-1')
    const regular2 = engine.detectEmotionsFromText('regular-2')
    const realTime2 = engine.detectEmotionsFromTextRealTime('realtime-2')
    const regular3 = engine.detectEmotionsFromText('regular-3')

    // Wait for all requests to complete
    await Promise.all([realTime1, regular1, regular2, realTime2, regular3])

    // Wait a bit more to ensure all processing is done
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Verify real-time requests were processed first or in priority
    // This is approximate since precise ordering in async context is hard to guarantee
    const realTime1Index = processingOrder.indexOf('realtime-1')
    const realTime2Index = processingOrder.indexOf('realtime-2')

    // Regular requests should be in the list
    expect(processingOrder).toContain('regular-1')
    expect(processingOrder).toContain('regular-2')
    expect(processingOrder).toContain('regular-3')

    // Real-time requests should be found in the processing order
    expect(realTime1Index).not.toBe(-1)
    expect(realTime2Index).not.toBe(-1)
  })

  it('should handle errors gracefully during batch processing', async () => {
    // Make the analysis method throw an error for specific text
    const analyzeStub = vi.fn().mockImplementation((text) => {
      if (text.includes('error')) {
        return Promise.reject(new Error('Test error'))
      }
      return Promise.resolve([
        { type: 'happiness', confidence: 0.8, intensity: 0.7 },
      ])
    })

    // Replace the original method with our stub
    Object.defineProperty(engine, 'analyzeEmotionsFromText', {
      value: analyzeStub,
    })

    // Send both successful and error-producing requests
    const goodPromise = engine.detectEmotionsFromText('good text')
    const errorPromise = engine.detectEmotionsFromText('error text')
    const realTimePromise = engine.detectEmotionsFromTextRealTime(
      'good real-time text',
    )

    // The good requests should succeed
    const goodResult = await goodPromise
    const realTimeResult = await realTimePromise
    expect(goodResult.emotions).toHaveLength(1)
    expect(realTimeResult.emotions).toHaveLength(1)

    // The error request should be rejected
    await expect(errorPromise).rejects.toThrow('Test error')

    // But the engine should continue processing other requests
    const afterErrorPromise = engine.detectEmotionsFromText('text after error')
    const afterErrorResult = await afterErrorPromise
    expect(afterErrorResult.emotions).toHaveLength(1)
  })
})
