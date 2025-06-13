/**
 * Unit tests for the EmotionDetectionEngine
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  type MockedFunction,
} from 'vitest'

// Mock all dependencies
vi.mock('../../../utils/logger')
vi.mock('../providers/EmotionLlamaProvider')
vi.mock('../../fhe')
vi.mock('../../../lib/logging/performance-logger')
vi.mock('crypto')
vi.mock('os')
vi.mock('sanitize-html')

import { EmotionDetectionEngine } from './EmotionDetectionEngine'
import { createLogger } from '../../../utils/logger'
import { EmotionLlamaProvider } from '../providers/EmotionLlamaProvider'

import { PerformanceLogger } from '../../../lib/logging/performance-logger'
import type { EmotionAnalysis, EmotionData, EmotionType } from './types'

describe('EmotionDetectionEngine', () => {
  let emotionEngine: EmotionDetectionEngine
  let mockLogger: any
  let mockPerformanceLogger: any
  let mockEmotionProvider: any
  let mockFheService: any

  const mockEmotionData: EmotionData = {
    text: 'I feel really anxious about the upcoming presentation',
    timestamp: new Date('2024-01-15T10:00:00Z'),
    sessionId: 'session-123',
    userId: 'user-456',
    metadata: {
      source: 'chat',
      context: 'therapy_session',
    },
  }

  const mockEmotionAnalysis: EmotionAnalysis = {
    sessionId: 'session-123',
    timestamp: new Date('2024-01-15T10:00:00Z'),
    primaryEmotion: 'anxiety',
    emotions: {
      anxiety: 0.85,
      fear: 0.3,
      sadness: 0.2,
      anger: 0.1,
      joy: 0.05,
      surprise: 0.1,
      disgust: 0.05,
      trust: 0.4,
      anticipation: 0.6,
    },
    confidence: 0.88,
    contextualFactors: [
      {
        factor: 'upcoming_event',
        impact: 0.7,
        description: 'Anticipation of future presentation',
      },
    ],
    riskFactors: [
      {
        type: 'anxiety_escalation',
        severity: 'medium',
        confidence: 0.75,
        description: 'High anxiety levels may escalate without intervention',
      },
    ],
    recommendations: [
      'Consider breathing exercises to manage anxiety',
      'Practice presentation beforehand to build confidence',
    ],
    metadata: {
      processingTime: 150,
      modelVersion: '1.0.0',
      language: 'en',
    },
  }

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()

    // Setup logger mocks
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
    }
    ;(createLogger as MockedFunction<typeof createLogger>).mockReturnValue(
      mockLogger,
    )

    // Setup performance logger mocks
    mockPerformanceLogger = {
      startTimer: vi.fn().mockReturnValue('timer-id'),
      endTimer: vi.fn(),
      logMetric: vi.fn(),
      getInstance: vi.fn(),
    }
    ;(
      PerformanceLogger.getInstance as MockedFunction<
        typeof PerformanceLogger.getInstance
      >
    ).mockReturnValue(mockPerformanceLogger)

    // Setup emotion provider mocks
    mockEmotionProvider = {
      analyzeEmotion: vi.fn().mockResolvedValue(mockEmotionAnalysis),
      batchAnalyzeEmotions: vi.fn().mockResolvedValue([mockEmotionAnalysis]),
      isAvailable: vi.fn().mockReturnValue(true),
    }
    ;(EmotionLlamaProvider as any).mockImplementation(() => mockEmotionProvider)

    // Setup FHE service mocks
    mockFheService = {
      encrypt: vi.fn().mockResolvedValue('encrypted_data'),
      decrypt: vi.fn().mockResolvedValue('decrypted_data'),
      isAvailable: vi.fn().mockReturnValue(true),
      performOperation: vi.fn().mockResolvedValue('fhe_result'),
    }
    ;(fheService as any) = mockFheService

    // Create engine instance
    emotionEngine = new EmotionDetectionEngine({
      includeConfidence: true,
      includeContextualFactors: true,
      includeRiskFactors: true,
      sensitivity: 0.7,
      confidenceThreshold: 0.6,
      language: 'en',
      useSecureProcessing: false,
      batchSize: 10,
      batchTimeoutMs: 5000,
      useCache: true,
      cacheTTLMs: 300000,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Constructor and Initialization', () => {
    it('should initialize with default options', () => {
      const defaultEngine = new EmotionDetectionEngine()
      expect(defaultEngine).toBeInstanceOf(EmotionDetectionEngine)
    })

    it('should initialize with custom options', () => {
      const customEngine = new EmotionDetectionEngine({
        sensitivity: 0.9,
        confidenceThreshold: 0.8,
        useSecureProcessing: true,
        batchSize: 20,
      })
      expect(customEngine).toBeInstanceOf(EmotionDetectionEngine)
    })

    it('should log initialization', () => {
      expect(mockLogger.info).toHaveBeenCalledWith(
        'EmotionDetectionEngine initialized',
        expect.objectContaining({
          sensitivity: expect.any(Number),
          confidenceThreshold: expect.any(Number),
        }),
      )
    })
  })

  describe('Single Emotion Analysis', () => {
    it('should analyze emotion successfully', async () => {
      const result = await emotionEngine.analyzeEmotion(mockEmotionData)

      expect(result).toEqual(mockEmotionAnalysis)
      expect(mockEmotionProvider.analyzeEmotion).toHaveBeenCalledWith(
        mockEmotionData,
        expect.objectContaining({
          includeConfidence: true,
          includeContextualFactors: true,
          includeRiskFactors: true,
        }),
      )
      expect(mockPerformanceLogger.startTimer).toHaveBeenCalled()
      expect(mockPerformanceLogger.endTimer).toHaveBeenCalled()
    })

    it('should handle empty text input', async () => {
      const emptyData: EmotionData = {
        ...mockEmotionData,
        text: '',
      }

      await expect(emotionEngine.analyzeEmotion(emptyData)).rejects.toThrow(
        'Text input cannot be empty',
      )

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Invalid emotion data provided',
        expect.objectContaining({
          error: 'Text input cannot be empty',
        }),
      )
    })

    it('should handle null or undefined text', async () => {
      const nullData: EmotionData = {
        ...mockEmotionData,
        text: null as any,
      }

      await expect(emotionEngine.analyzeEmotion(nullData)).rejects.toThrow(
        'Text input cannot be empty',
      )
    })

    it('should sanitize HTML input', async () => {
      const htmlData: EmotionData = {
        ...mockEmotionData,
        text: '<script>alert("xss")</script>I feel happy',
      }

      await emotionEngine.analyzeEmotion(htmlData)

      // Should call sanitize-html
      expect(mockEmotionProvider.analyzeEmotion).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.not.stringContaining('<script>'),
        }),
        expect.any(Object),
      )
    })

    it('should use secure processing when enabled', async () => {
      const secureEngine = new EmotionDetectionEngine({
        useSecureProcessing: true,
      })

      await secureEngine.analyzeEmotion(mockEmotionData)

      expect(mockFheService.encrypt).toHaveBeenCalled()
      expect(mockFheService.performOperation).toHaveBeenCalled()
    })

    it('should handle provider errors gracefully', async () => {
      const error = new Error('Provider service unavailable')
      mockEmotionProvider.analyzeEmotion.mockRejectedValue(error)

      await expect(
        emotionEngine.analyzeEmotion(mockEmotionData),
      ).rejects.toThrow('Provider service unavailable')

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Emotion analysis failed',
        expect.objectContaining({
          error: error.message,
          sessionId: mockEmotionData.sessionId,
        }),
      )
    })

    it('should filter emotions below confidence threshold', async () => {
      const lowConfidenceAnalysis: EmotionAnalysis = {
        ...mockEmotionAnalysis,
        emotions: {
          anxiety: 0.9,
          fear: 0.5, // Below threshold
          sadness: 0.4, // Below threshold
          anger: 0.1, // Below threshold
          joy: 0.05, // Below threshold
          surprise: 0.1, // Below threshold
          disgust: 0.05, // Below threshold
          trust: 0.7,
          anticipation: 0.8,
        },
      }

      mockEmotionProvider.analyzeEmotion.mockResolvedValue(
        lowConfidenceAnalysis,
      )

      const result = await emotionEngine.analyzeEmotion(mockEmotionData)

      // Should only include emotions above threshold (0.6)
      expect(Object.keys(result.emotions)).toEqual([
        'anxiety',
        'trust',
        'anticipation',
      ])
    })

    it('should handle different languages', async () => {
      const spanishEngine = new EmotionDetectionEngine({
        language: 'es',
      })

      const spanishData: EmotionData = {
        ...mockEmotionData,
        text: 'Me siento muy ansioso por la presentación',
      }

      await spanishEngine.analyzeEmotion(spanishData)

      expect(mockEmotionProvider.analyzeEmotion).toHaveBeenCalledWith(
        spanishData,
        expect.objectContaining({
          language: 'es',
        }),
      )
    })
  })

  describe('Batch Emotion Analysis', () => {
    const mockBatchData: EmotionData[] = [
      mockEmotionData,
      {
        ...mockEmotionData,
        text: 'I am feeling great today!',
        sessionId: 'session-124',
      },
      {
        ...mockEmotionData,
        text: 'This is frustrating',
        sessionId: 'session-125',
      },
    ]

    it('should process batch emotions successfully', async () => {
      const batchResults = [
        mockEmotionAnalysis,
        {
          ...mockEmotionAnalysis,
          primaryEmotion: 'joy' as EmotionType,
          sessionId: 'session-124',
        },
        {
          ...mockEmotionAnalysis,
          primaryEmotion: 'anger' as EmotionType,
          sessionId: 'session-125',
        },
      ]

      mockEmotionProvider.batchAnalyzeEmotions.mockResolvedValue(batchResults)

      const results = await emotionEngine.batchAnalyzeEmotions(mockBatchData)

      expect(results).toEqual(batchResults)
      expect(mockEmotionProvider.batchAnalyzeEmotions).toHaveBeenCalledWith(
        mockBatchData,
        expect.objectContaining({
          batchSize: 10,
          batchTimeoutMs: 5000,
        }),
      )
    })

    it('should handle empty batch input', async () => {
      await expect(emotionEngine.batchAnalyzeEmotions([])).rejects.toThrow(
        'Batch data cannot be empty',
      )
    })

    it('should split large batches appropriately', async () => {
      const largeBatch = Array.from({ length: 25 }, (_, i) => ({
        ...mockEmotionData,
        sessionId: `session-${i}`,
      }))

      const batchResults = largeBatch.map((_, i) => ({
        ...mockEmotionAnalysis,
        sessionId: `session-${i}`,
      }))

      mockEmotionProvider.batchAnalyzeEmotions.mockResolvedValue(batchResults)

      await emotionEngine.batchAnalyzeEmotions(largeBatch)

      // Should be called multiple times for large batch (25 items with batch size 10)
      expect(mockEmotionProvider.batchAnalyzeEmotions).toHaveBeenCalledTimes(3)
    })

    it('should handle batch processing errors', async () => {
      const error = new Error('Batch processing failed')
      mockEmotionProvider.batchAnalyzeEmotions.mockRejectedValue(error)

      await expect(
        emotionEngine.batchAnalyzeEmotions(mockBatchData),
      ).rejects.toThrow('Batch processing failed')

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Batch emotion analysis failed',
        expect.objectContaining({
          error: error.message,
          batchSize: mockBatchData.length,
        }),
      )
    })

    it('should use adaptive batch sizing when enabled', async () => {
      const adaptiveEngine = new EmotionDetectionEngine({
        useAdaptiveBatchSize: true,
        minBatchSize: 5,
        maxBatchSize: 20,
      })

      const mediumBatch = Array.from({ length: 15 }, (_, i) => ({
        ...mockEmotionData,
        sessionId: `session-${i}`,
      }))

      await adaptiveEngine.batchAnalyzeEmotions(mediumBatch)

      expect(mockEmotionProvider.batchAnalyzeEmotions).toHaveBeenCalled()
    })
  })

  describe('Caching Functionality', () => {
    it('should cache analysis results when enabled', async () => {
      // First call
      const result1 = await emotionEngine.analyzeEmotion(mockEmotionData)

      // Second call with same data
      const result2 = await emotionEngine.analyzeEmotion(mockEmotionData)

      expect(result1).toEqual(result2)
      // Provider should only be called once due to caching
      expect(mockEmotionProvider.analyzeEmotion).toHaveBeenCalledTimes(1)
    })

    it('should bypass cache when disabled', async () => {
      const noCacheEngine = new EmotionDetectionEngine({
        useCache: false,
      })

      await noCacheEngine.analyzeEmotion(mockEmotionData)
      await noCacheEngine.analyzeEmotion(mockEmotionData)

      // Provider should be called twice without caching
      expect(mockEmotionProvider.analyzeEmotion).toHaveBeenCalledTimes(2)
    })

    it('should respect cache TTL', async () => {
      const shortTTLEngine = new EmotionDetectionEngine({
        useCache: true,
        cacheTTLMs: 100, // 100ms TTL
      })

      await shortTTLEngine.analyzeEmotion(mockEmotionData)

      // Wait for cache to expire
      await new Promise((resolve) => setTimeout(resolve, 150))

      await shortTTLEngine.analyzeEmotion(mockEmotionData)

      // Provider should be called twice due to cache expiration
      expect(mockEmotionProvider.analyzeEmotion).toHaveBeenCalledTimes(2)
    })
  })

  describe('Performance Monitoring', () => {
    it('should log performance metrics', async () => {
      await emotionEngine.analyzeEmotion(mockEmotionData)

      expect(mockPerformanceLogger.startTimer).toHaveBeenCalledWith(
        'emotion_analysis',
      )
      expect(mockPerformanceLogger.endTimer).toHaveBeenCalledWith('timer-id')
      expect(mockPerformanceLogger.logMetric).toHaveBeenCalledWith(
        'emotion_analysis_completed',
        expect.objectContaining({
          sessionId: mockEmotionData.sessionId,
          primaryEmotion: mockEmotionAnalysis.primaryEmotion,
          confidence: mockEmotionAnalysis.confidence,
        }),
      )
    })

    it('should track batch processing performance', async () => {
      const batchData = [mockEmotionData, mockEmotionData]

      await emotionEngine.batchAnalyzeEmotions(batchData)

      expect(mockPerformanceLogger.startTimer).toHaveBeenCalledWith(
        'batch_emotion_analysis',
      )
      expect(mockPerformanceLogger.logMetric).toHaveBeenCalledWith(
        'batch_emotion_analysis_completed',
        expect.objectContaining({
          batchSize: batchData.length,
        }),
      )
    })
  })

  describe('Risk Factor Detection', () => {
    it('should detect high-risk emotional states', async () => {
      const highRiskAnalysis: EmotionAnalysis = {
        ...mockEmotionAnalysis,
        emotions: {
          anxiety: 0.95,
          fear: 0.8,
          sadness: 0.9,
          anger: 0.1,
          joy: 0.05,
          surprise: 0.1,
          disgust: 0.05,
          trust: 0.2,
          anticipation: 0.3,
        },
        riskFactors: [
          {
            type: 'severe_anxiety',
            severity: 'high',
            confidence: 0.9,
            description: 'Extremely high anxiety levels detected',
          },
          {
            type: 'depression_risk',
            severity: 'high',
            confidence: 0.85,
            description: 'High sadness combined with low positive emotions',
          },
        ],
      }

      mockEmotionProvider.analyzeEmotion.mockResolvedValue(highRiskAnalysis)

      const result = await emotionEngine.analyzeEmotion(mockEmotionData)

      expect(result.riskFactors).toHaveLength(2)
      expect(result.riskFactors[0].severity).toBe('high')
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'High-risk emotional state detected',
        expect.objectContaining({
          sessionId: mockEmotionData.sessionId,
          riskFactors: expect.any(Array),
        }),
      )
    })

    it('should provide appropriate recommendations for risk factors', async () => {
      const result = await emotionEngine.analyzeEmotion(mockEmotionData)

      expect(result.recommendations).toContain(
        'Consider breathing exercises to manage anxiety',
      )
      expect(result.recommendations).toContain(
        'Practice presentation beforehand to build confidence',
      )
    })
  })

  describe('Contextual Factor Analysis', () => {
    it('should identify contextual factors affecting emotions', async () => {
      const result = await emotionEngine.analyzeEmotion(mockEmotionData)

      expect(result.contextualFactors).toHaveLength(1)
      expect(result.contextualFactors[0].factor).toBe('upcoming_event')
      expect(result.contextualFactors[0].impact).toBe(0.7)
    })

    it('should handle multiple contextual factors', async () => {
      const multiFactorAnalysis: EmotionAnalysis = {
        ...mockEmotionAnalysis,
        contextualFactors: [
          {
            factor: 'work_stress',
            impact: 0.8,
            description: 'High workload contributing to stress',
          },
          {
            factor: 'social_support',
            impact: -0.3,
            description: 'Positive social support reducing negative emotions',
          },
          {
            factor: 'time_pressure',
            impact: 0.6,
            description: 'Limited time increasing anxiety',
          },
        ],
      }

      mockEmotionProvider.analyzeEmotion.mockResolvedValue(multiFactorAnalysis)

      const result = await emotionEngine.analyzeEmotion(mockEmotionData)

      expect(result.contextualFactors).toHaveLength(3)
      expect(result.contextualFactors.some((f) => f.impact < 0)).toBe(true) // Positive factor
      expect(result.contextualFactors.some((f) => f.impact > 0.7)).toBe(true) // High impact factor
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle provider unavailability', async () => {
      mockEmotionProvider.isAvailable.mockReturnValue(false)

      await expect(
        emotionEngine.analyzeEmotion(mockEmotionData),
      ).rejects.toThrow('Emotion analysis provider is not available')
    })

    it('should handle FHE service unavailability when secure processing is enabled', async () => {
      const secureEngine = new EmotionDetectionEngine({
        useSecureProcessing: true,
      })

      mockFheService.isAvailable.mockReturnValue(false)

      await expect(
        secureEngine.analyzeEmotion(mockEmotionData),
      ).rejects.toThrow('FHE service is not available for secure processing')
    })

    it('should handle very long text input', async () => {
      const longText = 'a'.repeat(10000)
      const longTextData: EmotionData = {
        ...mockEmotionData,
        text: longText,
      }

      await emotionEngine.analyzeEmotion(longTextData)

      expect(mockEmotionProvider.analyzeEmotion).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/^a+$/), // Should still be processed
        }),
        expect.any(Object),
      )
    })

    it('should handle special characters and emojis', async () => {
      const emojiData: EmotionData = {
        ...mockEmotionData,
        text: 'I feel 😰 about the presentation 📊 tomorrow!',
      }

      await emotionEngine.analyzeEmotion(emojiData)

      expect(mockEmotionProvider.analyzeEmotion).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('😰'),
        }),
        expect.any(Object),
      )
    })

    it('should handle network timeouts gracefully', async () => {
      const timeoutError = new Error('Request timeout')
      mockEmotionProvider.analyzeEmotion.mockRejectedValue(timeoutError)

      await expect(
        emotionEngine.analyzeEmotion(mockEmotionData),
      ).rejects.toThrow('Request timeout')

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Emotion analysis failed',
        expect.objectContaining({
          error: 'Request timeout',
        }),
      )
    })

    it('should validate emotion data structure', async () => {
      const invalidData = {
        text: 'Valid text',
        // Missing required fields
      } as EmotionData

      await expect(emotionEngine.analyzeEmotion(invalidData)).rejects.toThrow()
    })
  })

  describe('Configuration and Options', () => {
    it('should respect sensitivity settings', async () => {
      const highSensitivityEngine = new EmotionDetectionEngine({
        sensitivity: 0.9,
      })

      await highSensitivityEngine.analyzeEmotion(mockEmotionData)

      expect(mockEmotionProvider.analyzeEmotion).toHaveBeenCalledWith(
        mockEmotionData,
        expect.objectContaining({
          sensitivity: 0.9,
        }),
      )
    })

    it('should handle different confidence thresholds', async () => {
      const strictEngine = new EmotionDetectionEngine({
        confidenceThreshold: 0.9,
      })

      const mixedConfidenceAnalysis: EmotionAnalysis = {
        ...mockEmotionAnalysis,
        emotions: {
          anxiety: 0.95, // Above threshold
          fear: 0.85, // Below threshold
          sadness: 0.8, // Below threshold
          anger: 0.7, // Below threshold
          joy: 0.6, // Below threshold
          surprise: 0.5, // Below threshold
          disgust: 0.4, // Below threshold
          trust: 0.92, // Above threshold
          anticipation: 0.91, // Above threshold
        },
      }

      mockEmotionProvider.analyzeEmotion.mockResolvedValue(
        mixedConfidenceAnalysis,
      )

      const result = await strictEngine.analyzeEmotion(mockEmotionData)

      // Should only include emotions above 0.9 threshold
      expect(Object.keys(result.emotions)).toEqual([
        'anxiety',
        'trust',
        'anticipation',
      ])
    })

    it('should handle optional features being disabled', async () => {
      const minimalEngine = new EmotionDetectionEngine({
        includeConfidence: false,
        includeContextualFactors: false,
        includeRiskFactors: false,
      })

      await minimalEngine.analyzeEmotion(mockEmotionData)

      expect(mockEmotionProvider.analyzeEmotion).toHaveBeenCalledWith(
        mockEmotionData,
        expect.objectContaining({
          includeConfidence: false,
          includeContextualFactors: false,
          includeRiskFactors: false,
        }),
      )
    })
  })
})
