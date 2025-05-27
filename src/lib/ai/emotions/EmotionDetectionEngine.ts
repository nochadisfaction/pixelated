import { createLogger } from '../../../utils/logger'
import type {
  ContextualFactor,
  EmotionAnalysis,
  EmotionData,
  EmotionType,
  RiskFactor,
} from './types'
import { EmotionLlamaProvider } from '../providers/EmotionLlamaProvider'
import { fheService } from '../../fhe'
import { PerformanceLogger } from '../../../lib/logging/performance-logger'
import { createHash } from 'crypto'
import * as os from 'os'
import sanitizeHtml from 'sanitize-html'

const logger = createLogger({ context: 'EmotionDetectionEngine' })
const performanceLogger = PerformanceLogger.getInstance()

// Priority levels for batch processing
enum ProcessingPriority {
  LOW = 0,
  MEDIUM = 1,
  HIGH = 2,
  REAL_TIME = 3,
}

interface EmotionDetectionOptions {
  /**
   * Whether to include detailed confidence scores for each emotion
   */
  includeConfidence?: boolean

  /**
   * Whether to include contextual factors affecting emotion
   */
  includeContextualFactors?: boolean

  /**
   * Whether to analyze potential risk factors
   */
  includeRiskFactors?: boolean

  /**
   * The sensitivity level for emotion detection (0-1)
   * Higher values detect more subtle emotions
   */
  sensitivity?: number

  /**
   * Minimum confidence threshold for including an emotion
   */
  confidenceThreshold?: number

  /**
   * Optional language code (default: 'en')
   */
  language?: string

  /**
   * Use secure processing with FHE (default: false)
   */
  useSecureProcessing?: boolean

  /**
   * Number of samples to process in a batch
   */
  batchSize?: number

  /**
   * Maximum time to wait for batch completion
   */
  batchTimeoutMs?: number

  /**
   * Enable response caching
   */
  useCache?: boolean

  /**
   * Cache TTL in milliseconds
   */
  cacheTTLMs?: number

  /**
   * Enable adaptive batch sizing
   */
  useAdaptiveBatchSize?: boolean

  /**
   * Minimum batch size when using adaptive sizing
   */
  minBatchSize?: number

  /**
   * Maximum batch size when using adaptive sizing
   */
  maxBatchSize?: number

  /**
   * Target processing time in ms for adaptive batch sizing
   */
  targetProcessingTimeMs?: number

  /**
   * Maximum cache size (number of entries)
   */
  maxCacheSize?: number

  /**
   * Whether to use the dedicated real-time API endpoint
   */
  useRealTimeEndpoint?: boolean

  /**
   * Maximum number of concurrent requests
   */
  maxConcurrentRequests?: number
}

// Add mental health scoring types
export interface MentalHealthScores {
  depression: number
  anxiety: number
  stress: number
  anger: number
  socialIsolation: number
  [key: string]: number
}

export interface InterventionStrategy {
  type: 'immediate' | 'preventive' | 'supportive'
  content: string
  expertGuidance?: boolean
  suggestedResources?: string[]
}

// Type for batch queue items
interface BatchItem<T> {
  data: T
  context?: Record<string, unknown>
  priority: ProcessingPriority
  timestamp: number
  resolve: (
    result: Array<{ type: string; confidence: number; intensity: number }>,
  ) => void
  reject: (error: Error) => void
}

// LRU Cache entry type
interface CacheEntry {
  result: Array<{ type: string; confidence: number; intensity: number }>
  timestamp: number
  lastAccessed: number
}

/**
 * Handles emotion detection from various input types including
 * text and speech data using NLP and machine learning techniques
 */
export class EmotionDetectionEngine {
  private readonly defaultOptions: Required<EmotionDetectionOptions> = {
    includeConfidence: true,
    includeContextualFactors: true,
    includeRiskFactors: true,
    sensitivity: 0.7,
    confidenceThreshold: 0.4,
    language: 'en',
    useSecureProcessing: false,
    batchSize: 5,
    batchTimeoutMs: 100,
    useCache: true,
    cacheTTLMs: 5000,
    useAdaptiveBatchSize: true,
    minBatchSize: 3,
    maxBatchSize: 10,
    targetProcessingTimeMs: 200,
    maxCacheSize: 1000,
    useRealTimeEndpoint: true,
    maxConcurrentRequests: 10,
  }

  private options: Required<EmotionDetectionOptions>
  private provider: EmotionLlamaProvider | null = null
  private batchQueue: Array<BatchItem<ArrayBuffer | string>> = []
  private batchTimeout: NodeJS.Timeout | null = null
  private responseCache = new Map<string, CacheEntry>()
  private processingTimes: number[] = []
  private currentBatchSize: number
  private isProcessingBatch = false
  private lastBatchOptimization = Date.now()
  private optimizationInterval = 30_000
  private cacheHits = 0
  private cacheMisses = 0
  private activeRequests = 0
  private requestQueue: Array<() => Promise<void>> = []

  constructor(options?: EmotionDetectionOptions) {
    this.options = { ...this.defaultOptions, ...options }
    this.currentBatchSize = this.options.batchSize
    logger.debug('EmotionDetectionEngine initialized', {
      options: this.options,
    })
  }

  /**
   * Initialize the emotion provider
   * @private
   */
  private async getProvider(): Promise<EmotionLlamaProvider> {
    if (this.provider) {
      return this.provider
    }

    // Get API credentials from environment
    const baseUrl = process.env.EMOTION_LLAMA_API_URL
    const apiKey = process.env.EMOTION_LLAMA_API_KEY

    if (!baseUrl || !apiKey) {
      throw new Error(
        'Missing required API credentials for EmotionLlamaProvider',
      )
    }

    // Initialize the EmotionLlamaProvider
    this.provider = new EmotionLlamaProvider(baseUrl, apiKey, fheService)
    return this.provider
  }

  /**
   * Process a batch of emotion analysis requests
   * @private
   */
  private async processBatch() {
    if (this.batchQueue.length === 0 || this.isProcessingBatch) {
      return
    }

    this.isProcessingBatch = true
    const startTime = Date.now()

    try {
      // Sort by priority (highest first) and then by timestamp (oldest first)
      this.batchQueue.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority
        }
        return a.timestamp - b.timestamp
      })

      // Take items up to the current batch size
      const batch = this.batchQueue.splice(0, this.currentBatchSize)

      // Extract real-time priority items for separate processing
      const realTimeItems = batch.filter(
        (item) => item.priority === ProcessingPriority.REAL_TIME,
      )
      const regularItems = batch.filter(
        (item) => item.priority !== ProcessingPriority.REAL_TIME,
      )

      // Process real-time items immediately and independently
      const realTimePromises = realTimeItems.map((item) =>
        this.processItem(item),
      )

      // Process regular items in parallel, respecting concurrency limits
      const regularPromises = this.processWithConcurrencyLimit(regularItems)

      // Wait for all processing to complete
      await Promise.all([...realTimePromises, regularPromises])

      // Dynamic adjustment after batch
      this.dynamicBatchAndConcurrencyAdjustment()

      const endTime = Date.now()
      const processingTime = endTime - startTime

      // Log performance metrics
      await performanceLogger.logMetric({
        model: 'emotion-detection-batch',
        latency: processingTime,
        success: true,
        cached: false,
        optimized: this.options.useAdaptiveBatchSize,
        requestId: `batch-${startTime}`,
        startTime,
        endTime,
        metadata: {
          batchSize: batch.length,
          realTimeCount: realTimeItems.length,
          regularCount: regularItems.length,
        },
      })

      // Track processing time for adaptive batch sizing
      if (regularItems.length > 0) {
        this.processingTimes.push(processingTime)

        // Keep only the last 10 processing times
        if (this.processingTimes.length > 10) {
          this.processingTimes.shift()
        }

        // Periodically adjust batch size if adaptive sizing is enabled
        if (
          this.options.useAdaptiveBatchSize &&
          Date.now() - this.lastBatchOptimization > this.optimizationInterval
        ) {
          this.optimizeBatchSize()
          this.lastBatchOptimization = Date.now()
        }
      }
    } catch (error) {
      logger.error('Error processing batch:', error)
    } finally {
      this.isProcessingBatch = false

      // Process next batch if items remain
      if (this.batchQueue.length > 0) {
        this.scheduleBatchProcessing()
      }
    }
  }

  /**
   * Process items with concurrency limit
   * @private
   */
  private async processWithConcurrencyLimit(
    items: Array<BatchItem<ArrayBuffer | string>>,
  ): Promise<void> {
    // Create a queue of functions to be executed
    const queue = items.map((item) => () => this.processItem(item))

    // Process queue with concurrency limit
    return new Promise((resolve) => {
      const processQueue = async () => {
        while (queue.length > 0) {
          const batch = queue.splice(0, this.options.maxConcurrentRequests)
          if (batch.length === 0) {
            break
          }
          await Promise.all(batch.map((fn) => fn()))
        }
        resolve()
      }

      processQueue()
    })
  }

  /**
   * Process an individual batch item
   * @private
   */
  private async processItem(
    item: BatchItem<ArrayBuffer | string>,
  ): Promise<void> {
    try {
      let result: Array<{
        type: string
        confidence: number
        intensity: number
      }>

      // Check cache if enabled
      if (this.options.useCache && typeof item.data === 'string') {
        const cacheKey = this.getCacheKey(item.data, item.context)
        const cached = this.responseCache.get(cacheKey)

        if (cached && Date.now() - cached.timestamp < this.options.cacheTTLMs) {
          // Update last accessed time for LRU
          cached.lastAccessed = Date.now()
          this.responseCache.set(cacheKey, cached)

          this.cacheHits++
          item.resolve(cached.result)
          return
        }
        this.cacheMisses++
      }

      // Process based on data type
      if (item.data instanceof ArrayBuffer) {
        result = await this.analyzeEmotionsFromSpeech(item.data, item.context)
      } else {
        const useRealTime =
          item.priority === ProcessingPriority.REAL_TIME &&
          this.options.useRealTimeEndpoint

        result = useRealTime
          ? await this.analyzeEmotionsFromTextRealTime(item.data, item.context)
          : await this.analyzeEmotionsFromText(item.data, item.context)
      }

      // Cache result if enabled
      if (this.options.useCache && typeof item.data === 'string') {
        const cacheKey = this.getCacheKey(item.data, item.context)

        // Check if we need to evict entries from cache
        if (this.responseCache.size >= this.options.maxCacheSize) {
          this.evictLRUCache()
        }

        this.responseCache.set(cacheKey, {
          result,
          timestamp: Date.now(),
          lastAccessed: Date.now(),
        })
      }

      item.resolve(result)
    } catch (error) {
      item.reject(error as Error)
    }
  }

  /**
   * Evict least recently used entries from cache
   * @private
   */
  private evictLRUCache(): void {
    if (this.responseCache.size < this.options.maxCacheSize) {
      return
    }

    // Find the least recently accessed entry
    let oldestKey: string | null = null
    let oldestTime = Infinity

    this.responseCache.forEach((entry, key) => {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed
        oldestKey = key
      }
    })

    // Remove the oldest entry
    if (oldestKey) {
      this.responseCache.delete(oldestKey)
    }
  }

  /**
   * Optimize batch size based on processing time history
   * @private
   */
  private optimizeBatchSize(): void {
    if (this.processingTimes.length < 3) {
      return // Need at least 3 data points for meaningful adaptation
    }

    // Calculate average and standard deviation
    const avgProcessingTime =
      this.processingTimes.reduce((sum, time) => sum + time, 0) /
      this.processingTimes.length

    const stdDev = Math.sqrt(
      this.processingTimes.reduce(
        (sum, time) => sum + (time - avgProcessingTime) ** 2,
        0,
      ) / this.processingTimes.length,
    )

    logger.debug('Adaptive batch sizing', {
      currentBatchSize: this.currentBatchSize,
      avgProcessingTime,
      stdDev,
      targetTime: this.options.targetProcessingTimeMs,
      cacheHitRate: this.getCacheHitRate(),
    })

    // Factor in stability of processing times
    const isStable = stdDev < avgProcessingTime * 0.2

    if (avgProcessingTime > this.options.targetProcessingTimeMs * 1.2) {
      // Processing is too slow, reduce batch size more aggressively if times are stable
      const reduction = isStable ? 2 : 1
      this.currentBatchSize = Math.max(
        this.options.minBatchSize,
        this.currentBatchSize - reduction,
      )
      logger.debug('Reduced batch size', {
        newBatchSize: this.currentBatchSize,
        reduction,
      })
    } else if (
      avgProcessingTime < this.options.targetProcessingTimeMs * 0.8 &&
      this.currentBatchSize < this.options.maxBatchSize
    ) {
      // Processing is fast, increase batch size (more cautiously if unstable)
      const increase = isStable ? 1 : this.currentBatchSize < 5 ? 1 : 0
      this.currentBatchSize = Math.min(
        this.options.maxBatchSize,
        this.currentBatchSize + increase,
      )
      logger.debug('Increased batch size', {
        newBatchSize: this.currentBatchSize,
        increase,
      })
    }

    // Reset processing times after adjustment
    this.processingTimes = []
  }

  /**
   * Calculate cache hit rate
   * @private
   */
  private getCacheHitRate(): number {
    const total = this.cacheHits + this.cacheMisses
    return total > 0 ? this.cacheHits / total : 0
  }

  /**
   * Generate a cache key from input and context using semantic normalization
   * @private
   */
  private getCacheKey(data: string, context?: Record<string, unknown>): string {
    // Semantic normalization: lowercase, trim, remove punctuation, collapse whitespace
    const normalize = (str: string) =>
      str
        .toLowerCase()
        .replace(/[\p{P}$+<=>^`|~]/gu, '') // Remove punctuation (unicode safe)
        .replace(/\s+/g, ' ') // Collapse whitespace
        .trim()
    const normalizedData = normalize(data)
    const contextStr = context ? JSON.stringify(context) : ''
    return createHash('md5')
      .update(`${normalizedData}:${contextStr}`)
      .digest('hex')
  }

  /**
   * Schedule batch processing with timeout
   * @private
   */
  private scheduleBatchProcessing(): void {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout)
    }

    this.batchTimeout = setTimeout(() => {
      this.batchTimeout = null
      this.processBatch()
    }, this.options.batchTimeoutMs)
  }

  /**
   * Add item to batch queue with priority
   * @private
   */
  private addToBatch<T extends ArrayBuffer | string>(
    data: T,
    priority: ProcessingPriority = ProcessingPriority.MEDIUM,
    context?: Record<string, unknown>,
  ): Promise<Array<{ type: string; confidence: number; intensity: number }>> {
    return new Promise((resolve, reject) => {
      this.batchQueue.push({
        data,
        context,
        priority,
        timestamp: Date.now(),
        resolve,
        reject,
      })

      // Process immediately if real-time priority or batch is full
      if (
        priority === ProcessingPriority.REAL_TIME ||
        this.batchQueue.length >= this.currentBatchSize
      ) {
        this.processBatch()
      } else {
        this.scheduleBatchProcessing()
      }
    })
  }

  /**
   * Public method to detect emotions from text with real-time priority
   */
  public async detectEmotionsFromTextRealTime(
    text: string,
    context?: Record<string, unknown>,
  ): Promise<EmotionAnalysis> {
    const startTime = Date.now()

    try {
      logger.debug('Detecting emotions from text (real-time)', {
        textLength: text.length,
        hasContext: !!context,
      })

      // Initial result with timestamp
      const result: EmotionAnalysis = {
        timestamp: new Date().toISOString(),
        emotions: [],
        userId: 'anonymous', // Required field
        source: 'text', // Required field
        input: text, // Required field
      }

      // Check cache first for immediate response
      if (this.options.useCache) {
        const cacheKey = this.getCacheKey(text, context)
        const cached = this.responseCache.get(cacheKey)

        if (cached && Date.now() - cached.timestamp < this.options.cacheTTLMs) {
          // Update LRU timestamp and use cached result
          cached.lastAccessed = Date.now()
          this.responseCache.set(cacheKey, cached)

          result.emotions = cached.result.filter(
            (e) => e.confidence >= this.options.confidenceThreshold,
          )

          // Add dimensions and other features
          this.enhanceEmotionAnalysis(result, text, context)

          const endTime = Date.now()
          await performanceLogger.logMetric({
            model: 'emotion-detection-real-time',
            latency: endTime - startTime,
            success: true,
            cached: true,
            optimized: true,
            requestId: `real-time-${startTime}`,
            startTime,
            endTime,
            metadata: {
              textLength: text.length,
              fromCache: true,
            },
          })

          return result
        }
      }

      // Analyze text with REAL_TIME priority
      const emotions = await this.addToBatch(
        text,
        ProcessingPriority.REAL_TIME,
        context,
      )

      // Filter emotions based on confidence threshold
      result.emotions = emotions.filter(
        (e) => e.confidence >= this.options.confidenceThreshold,
      )

      // Add dimensions and other features
      this.enhanceEmotionAnalysis(result, text, context)

      const endTime = Date.now()

      // Log real-time performance metrics
      await performanceLogger.logMetric({
        model: 'emotion-detection-real-time',
        latency: endTime - startTime,
        success: true,
        cached: false,
        optimized: true,
        requestId: `real-time-${startTime}`,
        startTime,
        endTime,
        metadata: {
          textLength: text.length,
          fromCache: false,
        },
      })

      return result
    } catch (error) {
      logger.error('Error in real-time emotion detection:', error)

      // Return a default response on error
      return {
        timestamp: new Date().toISOString(),
        emotions: [{ type: 'neutral', confidence: 1.0, intensity: 0.5 }],
        userId: 'anonymous',
        source: 'text',
        input: text,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Helper method to add dimensions and other analysis features
   * @private
   */
  private enhanceEmotionAnalysis(
    result: EmotionAnalysis,
    text: string,
    context?: Record<string, unknown>,
  ): void {
    // Calculate and add dimensions
    if (result.emotions.length > 0) {
      result.dimensions = {
        valence: this.calculateValenceDimension(result.emotions),
        arousal: this.calculateArousalDimension(result.emotions),
        dominance: this.calculateDominanceDimension(result.emotions),
      }
    }

    // Add risk factors if enabled
    if (this.options.includeRiskFactors) {
      result.riskFactors = this.detectRiskFactors(text, result.emotions)

      // Set requiresAttention flag if high severity risk factors are present
      if (result.riskFactors.some((risk) => risk.severity > 0.7)) {
        result.requiresAttention = true
      }
    }

    // Add contextual factors if enabled
    if (this.options.includeContextualFactors) {
      result.contextualFactors = this.detectContextualFactors(text, context)
    }
  }

  /**
   * Detects emotions from text using NLP techniques
   *
   * @param text The text to analyze for emotions
   * @param context Optional additional context to improve accuracy
   * @returns Emotion analysis result
   */
  public async detectEmotionsFromText(
    text: string,
    context?: Record<string, unknown>,
  ): Promise<EmotionAnalysis> {
    try {
      logger.debug('Detecting emotions from text', {
        textLength: text.length,
        hasContext: !!context,
      })

      // Initial result with timestamp
      const result: EmotionAnalysis = {
        timestamp: new Date().toISOString(),
        emotions: [],
        userId: 'anonymous', // Required field in EmotionAnalysis
        source: 'text', // Required field
        input: text, // Required field
      }

      // Use EmotionLlamaProvider to detect emotions from text
      const emotions = await this.analyzeEmotionsFromText(text, context)

      // Filter emotions based on confidence threshold
      result.emotions = emotions.filter(
        (e) => e.confidence >= this.options.confidenceThreshold,
      )

      // Calculate overall sentiment (weighted average)
      if (result.emotions.length > 0) {
        const sentimentValues: number[] = []
        const weights: number[] = []

        result.emotions.forEach((emotion) => {
          // Convert emotion type to sentiment value (-1 to 1)
          const sentimentValue = this.emotionToSentimentValue(
            emotion.type as EmotionType,
          )
          sentimentValues.push(sentimentValue)
          weights.push(emotion.confidence * emotion.intensity)
        })

        // Calculate weighted average
        const totalWeight = weights.reduce((sum, w) => sum + w, 0)
        const overallSentiment =
          totalWeight > 0
            ? sentimentValues.reduce((sum, v, i) => sum + v * weights[i], 0) /
              totalWeight
            : 0

        // Add dimensions to the result
        result.dimensions = {
          valence: overallSentiment,
          arousal: this.calculateArousalDimension(result.emotions),
          dominance: this.calculateDominanceDimension(result.emotions),
        }
      }

      // Add risk factors if requested
      if (this.options.includeRiskFactors) {
        const riskFactors = this.detectRiskFactors(text, result.emotions)
        if (riskFactors.length > 0) {
          result.riskFactors = riskFactors

          // Set requiresAttention flag if high severity risk factors are present
          if (riskFactors.some((risk) => risk.severity > 0.7)) {
            result.requiresAttention = true
          }
        }
      }

      // Add contextual factors if requested
      if (this.options.includeContextualFactors) {
        const contextualFactors = this.detectContextualFactors(text, context)
        if (contextualFactors.length > 0) {
          result.contextualFactors = contextualFactors
        }
      }

      return result
    } catch (error) {
      logger.error('Error detecting emotions from text', { error })
      throw error
    }
  }

  /**
   * Analyze emotions from text using the provider
   * @private
   */
  private async analyzeEmotionsFromText(
    text: string,
    _context?: Record<string, unknown>,
  ): Promise<Array<{ type: string; confidence: number; intensity: number }>> {
    const provider = await this.getProvider()
    try {
      const safeText = this.sanitizeInput(text)
      const response = await provider.analyzeEmotions(safeText, {
        securityOptions: {
          useEncryption: this.options.useSecureProcessing,
          encryptionLevel: 'standard',
          allowThirdParty: false,
        },
      })
      return response.emotions
    } catch (error) {
      logger.error('Error analyzing emotions from text', { error, text })
      throw new Error(`Failed to analyze emotions from text: ${error}`)
    }
  }

  /**
   * Analyze emotions from text using optimized real-time API
   * @private
   */
  private async analyzeEmotionsFromTextRealTime(
    text: string,
    context?: Record<string, unknown>,
  ): Promise<Array<{ type: string; confidence: number; intensity: number }>> {
    const provider = await this.getProvider()
    try {
      const safeText = this.sanitizeInput(text)
      // Use the real-time endpoint specifically designed for lower latency
      const response = await fetch(
        `${provider.getBaseUrl()}/v1/emotions/analyze/realtime`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${provider.getApiKey()}`,
          },
          body: JSON.stringify({
            text: safeText,
            context: context || {},
            options: {
              sensitivity: this.options.sensitivity,
              security_level: this.options.useSecureProcessing
                ? 'standard'
                : 'none',
              include_confidence: this.options.includeConfidence,
            },
          }),
        },
      )

      if (!response.ok) {
        throw new Error(
          `Real-time emotion analysis failed: ${response.statusText}`,
        )
      }

      const data = await response.json()
      return data.emotions.map(
        (e: { type: string; confidence: number; intensity: number }) => ({
          type: e.type,
          confidence: e.confidence,
          intensity: e.intensity,
        }),
      )
    } catch (error) {
      logger.error('Error in real-time emotion analysis', { error, text })
      // Fall back to standard analysis if real-time endpoint fails
      logger.info('Falling back to standard emotion analysis')
      return this.analyzeEmotionsFromText(text, context)
    }
  }

  /**
   * Calculate valence dimension from emotions
   * @private
   */
  private calculateValenceDimension(emotions: EmotionData[]): number {
    const positiveEmotions = [
      'joy',
      'happiness',
      'contentment',
      'excitement',
      'trust',
      'anticipation',
    ]
    const negativeEmotions = [
      'sadness',
      'anger',
      'fear',
      'disgust',
      'anxiety',
      'apprehension',
    ]

    let totalValence = 0
    let totalWeight = 0

    emotions.forEach((emotion) => {
      const weight = emotion.confidence * emotion.intensity
      totalWeight += weight

      if (positiveEmotions.includes(emotion.type)) {
        totalValence += weight
      } else if (negativeEmotions.includes(emotion.type)) {
        totalValence -= weight
      }
    })

    return totalWeight > 0 ? totalValence / totalWeight : 0
  }

  /**
   * Calculate the arousal dimension from detected emotions
   * Arousal indicates the level of activation/energy (-1 to 1)
   */
  private calculateArousalDimension(emotions: EmotionData[]): number {
    if (emotions.length === 0) {
      return 0
    }

    const arousalMap: Record<string, number> = {
      joy: 0.5,
      sadness: -0.4,
      anger: 0.7,
      fear: 0.6,
      disgust: 0.2,
      surprise: 0.7,
      trust: 0.1,
      anticipation: 0.4,
      acceptance: 0.0,
      contentment: -0.2,
      excitement: 0.8,
      calmness: -0.7,
      anxiety: 0.6,
      apprehension: 0.3,
      confusion: 0.2,
      neutral: 0,
      mixed: 0.1,
      other: 0,
    }

    let totalArousal = 0
    let totalWeight = 0

    emotions.forEach((emotion) => {
      const arousalValue = arousalMap[emotion.type as string] || 0
      const weight = emotion.confidence * emotion.intensity

      totalArousal += arousalValue * weight
      totalWeight += weight
    })

    return totalWeight > 0 ? totalArousal / totalWeight : 0
  }

  /**
   * Calculate the dominance dimension from detected emotions
   * Dominance indicates the level of control/power (-1 to 1)
   */
  private calculateDominanceDimension(emotions: EmotionData[]): number {
    if (emotions.length === 0) {
      return 0
    }

    const dominanceMap: Record<string, number> = {
      joy: 0.4,
      sadness: -0.6,
      anger: 0.5, // Can be high dominance despite negative valence
      fear: -0.7,
      disgust: 0.1,
      surprise: -0.1,
      trust: 0.3,
      anticipation: 0.2,
      acceptance: 0.1,
      contentment: 0.4,
      excitement: 0.5,
      calmness: 0.3,
      anxiety: -0.6,
      apprehension: -0.4,
      confusion: -0.3,
      neutral: 0,
      mixed: 0,
      other: 0,
    }

    let totalDominance = 0
    let totalWeight = 0

    emotions.forEach((emotion) => {
      const dominanceValue = dominanceMap[emotion.type as string] || 0
      const weight = emotion.confidence * emotion.intensity

      totalDominance += dominanceValue * weight
      totalWeight += weight
    })

    return totalWeight > 0 ? totalDominance / totalWeight : 0
  }

  /**
   * Helper method to convert emotion type to sentiment value (-1 to 1)
   */
  private emotionToSentimentValue(emotionType: EmotionType): number {
    const sentimentMap: Record<string, number> = {
      joy: 0.8,
      sadness: -0.7,
      anger: -0.6,
      fear: -0.7,
      disgust: -0.6,
      surprise: 0.1, // Surprise can be positive or negative, slightly positive by default
      trust: 0.6,
      anticipation: 0.3,
      acceptance: 0.5,
      contentment: 0.7,
      excitement: 0.6,
      calmness: 0.4,
      anxiety: -0.5,
      apprehension: -0.4,
      confusion: -0.2,
      neutral: 0,
      mixed: 0,
      other: 0,
    }

    return sentimentMap[emotionType] || 0
  }

  /**
   * Detects risk factors from text and identified emotions
   */
  private detectRiskFactors(
    text: string | null,
    emotions: EmotionData[],
  ): RiskFactor[] {
    // Production implementation of risk factor detection
    const riskFactors: RiskFactor[] = []

    // Check for high-intensity negative emotions
    const negativeEmotions = emotions.filter((e) =>
      [
        'sadness',
        'anger',
        'fear',
        'disgust',
        'anxiety',
        'apprehension',
      ].includes(e.type),
    )

    const highIntensityNegative = negativeEmotions.filter(
      (e) => e.intensity > 0.7 && e.confidence > 0.6,
    )

    if (highIntensityNegative.length > 0) {
      riskFactors.push({
        type: 'high_intensity_negative_emotion',
        severity: Math.min(
          ...highIntensityNegative.map((e) => e.intensity * e.confidence),
        ),
        confidence: Math.min(...highIntensityNegative.map((e) => e.confidence)),
      })
    }

    // Check for emotional volatility
    if (
      emotions.length >= 3 &&
      emotions.some((e) => e.type === 'anger' && e.intensity > 0.6) &&
      emotions.some((e) => e.type === 'sadness' && e.intensity > 0.6)
    ) {
      riskFactors.push({
        type: 'emotional_volatility',
        severity: 0.7,
        confidence: 0.6,
      })
    }

    // Text-based risk factors
    if (text) {
      const lowerText = text.toLowerCase()

      // Check for potential self-harm or crisis language
      const crisisKeywords = [
        'suicide',
        'kill myself',
        'end it all',
        'no reason to live',
        'better off dead',
        "can't go on",
        'want to die',
        'self harm',
        'hurt myself',
        'not worth it',
      ]

      // Check for domestic violence indicators
      const violenceKeywords = [
        'hit me',
        'threatened',
        'hurt me',
        'afraid of',
        'physically hurt',
        'control me',
        'trapped',
        'abusive',
        'scared of them',
      ]

      // Crisis assessment
      let crisisScore = 0
      crisisKeywords.forEach((keyword) => {
        if (lowerText.includes(keyword)) {
          crisisScore++
        }
      })

      if (crisisScore > 0) {
        riskFactors.push({
          type: 'potential_crisis',
          severity: Math.min(0.5 + crisisScore * 0.1, 0.9),
          confidence: 0.8,
        })
      }

      // Violence assessment
      let violenceScore = 0
      violenceKeywords.forEach((keyword) => {
        if (lowerText.includes(keyword)) {
          violenceScore++
        }
      })

      if (violenceScore > 0) {
        riskFactors.push({
          type: 'potential_violence',
          severity: Math.min(0.6 + violenceScore * 0.1, 0.9),
          confidence: 0.75,
        })
      }
    }

    return riskFactors
  }

  /**
   * Detects contextual factors that may influence emotion detection
   */
  private detectContextualFactors(
    text: string | null,
    context?: Record<string, unknown>,
  ): ContextualFactor[] {
    const contextualFactors: ContextualFactor[] = []

    // Add context-based factors if provided
    if (context) {
      // Process common contextual fields
      if (context.recentEvents) {
        contextualFactors.push({
          type: 'recent_events',
          relevance: 0.8,
          confidence: 0.7,
        })
      }

      if (context.relationshipStatus) {
        contextualFactors.push({
          type: 'relationship_status',
          relevance: 0.6,
          confidence: 0.7,
        })
      }

      if (context.healthStatus) {
        contextualFactors.push({
          type: 'health_status',
          relevance: 0.7,
          confidence: 0.8,
        })
      }

      // Process location
      if (context.location) {
        contextualFactors.push({
          type: 'location',
          relevance: 0.5,
          confidence: 0.8,
        })
      }

      // Process time factors
      if (context.timeOfDay) {
        contextualFactors.push({
          type: 'time_of_day',
          relevance: 0.4,
          confidence: 0.9,
        })
      }

      // Process social environment
      if (context.socialSetting) {
        contextualFactors.push({
          type: 'social_setting',
          relevance: 0.7,
          confidence: 0.6,
        })
      }

      // Process any medication information
      if (context.medication) {
        contextualFactors.push({
          type: 'medication',
          relevance: 0.8,
          confidence: 0.7,
        })
      }

      // Process sleep information
      if (context.sleepQuality) {
        contextualFactors.push({
          type: 'sleep_quality',
          relevance: 0.6,
          confidence: 0.8,
        })
      }

      // Process substance use
      if (context.substanceUse) {
        contextualFactors.push({
          type: 'substance_use',
          relevance: 0.9,
          confidence: 0.7,
        })
      }
    }

    // Extract additional factors from text if available
    if (text) {
      // Time expressions detection
      const timeRegex =
        /\b(morning|afternoon|evening|night|today|yesterday|last night|tomorrow)\b/i
      if (timeRegex.test(text)) {
        contextualFactors.push({
          type: 'temporal_context',
          relevance: 0.5,
          confidence: 0.6,
        })
      }

      // Weather mentions
      const weatherRegex =
        /\b(rain|sunny|storm|cold|hot|weather|temperature)\b/i
      if (weatherRegex.test(text)) {
        contextualFactors.push({
          type: 'environmental_factors',
          relevance: 0.4,
          confidence: 0.5,
        })
      }

      // Social context mentions
      const socialRegex =
        /\b(friend|family|coworker|boss|partner|spouse|alone|together|meeting)\b/i
      if (socialRegex.test(text)) {
        contextualFactors.push({
          type: 'social_context',
          relevance: 0.7,
          confidence: 0.6,
        })
      }
    }

    return contextualFactors
  }

  /**
   * Calculates mental health scores based on emotion analysis
   */
  private calculateMentalHealthScores(
    analysis: EmotionAnalysis,
  ): MentalHealthScores {
    const scores: MentalHealthScores = {
      depression: 0,
      anxiety: 0,
      stress: 0,
      anger: 0,
      socialIsolation: 0,
    }

    // Calculate depression score based on valence and arousal
    if (analysis.dimensions) {
      scores.depression = Math.max(0, (-analysis.dimensions.valence + 1) / 2)
      scores.anxiety = Math.max(
        0,
        (analysis.dimensions.arousal - analysis.dimensions.dominance) / 2,
      )
      scores.stress = Math.max(
        0,
        (analysis.dimensions.arousal + (1 - analysis.dimensions.dominance)) / 2,
      )
    }

    // Factor in detected emotions
    analysis.emotions.forEach((emotion) => {
      const intensity = emotion.intensity * emotion.confidence

      switch (emotion.type.toLowerCase()) {
        case 'sadness':
        case 'hopelessness':
          scores.depression += intensity * 0.8
          break
        case 'fear':
        case 'worry':
          scores.anxiety += intensity * 0.8
          break
        case 'anger':
        case 'frustration':
          scores.anger += intensity * 0.8
          break
        case 'loneliness':
        case 'isolation':
          scores.socialIsolation += intensity * 0.8
          break
      }
    })

    // Factor in risk factors
    if (analysis.riskFactors) {
      analysis.riskFactors.forEach((risk) => {
        if (risk.type.includes('suicidal')) {
          scores.depression = Math.max(scores.depression, risk.severity)
        }
        if (risk.type.includes('panic')) {
          scores.anxiety = Math.max(scores.anxiety, risk.severity)
        }
      })
    }

    // Normalize scores to 0-1 range
    Object.keys(scores).forEach((key) => {
      scores[key] = Math.min(1, Math.max(0, scores[key]))
    })

    return scores
  }

  /**
   * Generates appropriate intervention strategies based on analysis
   */
  public async generateIntervention(
    analysis: EmotionAnalysis,
  ): Promise<InterventionStrategy> {
    const scores = this.calculateMentalHealthScores(analysis)
    const maxScore = Math.max(...Object.values(scores))
    const requiresExpert = maxScore > 0.7 || analysis.requiresAttention

    let type: InterventionStrategy['type'] = 'supportive'
    if (maxScore > 0.7) {
      type = 'immediate'
    } else if (maxScore > 0.4) {
      type = 'preventive'
    }

    // Get intervention content from LLM provider
    const provider = await this.getProvider()
    const content = await provider.generateIntervention(
      {
        sessionId: 'emotion-detection-engine',
        clientId: process.env.CLIENT_ID || 'example-client-id',
        therapistId: 'system',
        startTime: new Date(),
        status: 'active',
        securityLevel: 'standard',
        emotionAnalysisEnabled: true,
      },
      {
        id: createHash('md5').update(new Date().toISOString()).digest('hex'),
        timestamp: new Date(),
        emotions: analysis.emotions,
        overallSentiment: 0,
        riskFactors: analysis.riskFactors || [],
        contextualFactors: [],
        requiresAttention: requiresExpert || false,
      },
    )

    return {
      type,
      content: content.content,
      expertGuidance: requiresExpert,
      suggestedResources: requiresExpert
        ? [
            'Crisis hotline: 1-800-273-8255',
            'Online therapy resources',
            'Local mental health services',
          ]
        : undefined,
    }
  }

  /**
   * Helper method to convert ArrayBuffer to Base64 string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  /**
   * Clear cache and reset metrics
   */
  public clearCache(): void {
    this.responseCache.clear()
    this.cacheHits = 0
    this.cacheMisses = 0
    logger.debug('Emotion detection cache cleared')
  }

  /**
   * Get current cache metrics
   */
  public getCacheMetrics(): {
    size: number
    hitRate: number
    maxSize: number
  } {
    return {
      size: this.responseCache.size,
      hitRate: this.getCacheHitRate(),
      maxSize: this.options.maxCacheSize,
    }
  }

  /**
   * Analyze emotions from speech using the provider
   * @private
   */
  private async analyzeEmotionsFromSpeech(
    audioData: ArrayBuffer,
    _context?: Record<string, unknown>,
  ): Promise<Array<{ type: string; confidence: number; intensity: number }>> {
    const provider = await this.getProvider()
    try {
      const response = await provider.analyzeVoice(audioData, {
        securityOptions: {
          useEncryption: this.options.useSecureProcessing,
          encryptionLevel: 'standard',
          allowThirdParty: false,
        },
      })

      return response.emotions
    } catch (error) {
      logger.error('Error analyzing emotions from speech', { error })
      throw new Error(`Failed to analyze emotions from speech: ${error}`)
    }
  }

  /**
   * Pre-populate the cache with common queries (cache warming)
   * @param queries Array of { text, context } to warm the cache
   */
  public async warmCache(
    queries: Array<{ text: string; context?: Record<string, unknown> }>,
  ): Promise<void> {
    for (const { text, context } of queries) {
      try {
        // Only warm if not already cached
        const cacheKey = this.getCacheKey(text, context)
        if (!this.responseCache.has(cacheKey)) {
          const result = await this.analyzeEmotionsFromText(text, context)
          this.responseCache.set(cacheKey, {
            result,
            timestamp: Date.now(),
            lastAccessed: Date.now(),
          })
        }
      } catch (error) {
        logger.warn('Cache warming failed for query', { text, error })
      }
    }
  }

  /**
   * Dynamically adjust batch size and concurrency based on queue depth and system CPU load
   * Called periodically during batch processing
   */
  private dynamicBatchAndConcurrencyAdjustment(): void {
    const queueDepth = this.batchQueue.length
    const cpuLoad = os.loadavg()[0] / os.cpus().length // 1-min load per core
    // Heuristics: if queue is deep and CPU is under 60%, increase; if shallow or CPU > 80%, decrease
    if (queueDepth > this.currentBatchSize * 2 && cpuLoad < 0.6) {
      this.currentBatchSize = Math.min(
        this.options.maxBatchSize,
        this.currentBatchSize + 1,
      )
      this.options.maxConcurrentRequests = Math.min(
        this.options.maxConcurrentRequests + 1,
        2 * os.cpus().length,
      )
    } else if (
      (queueDepth < this.currentBatchSize || cpuLoad > 0.8) &&
      this.currentBatchSize > this.options.minBatchSize
    ) {
      this.currentBatchSize = Math.max(
        this.options.minBatchSize,
        this.currentBatchSize - 1,
      )
      this.options.maxConcurrentRequests = Math.max(
        this.options.minBatchSize,
        this.options.maxConcurrentRequests - 1,
      )
    }
  }

  /**
   * Expose current batch/concurrency/queue/cpu status for observability
   */
  public getDynamicProcessingStatus() {
    return {
      queueDepth: this.batchQueue.length,
      currentBatchSize: this.currentBatchSize,
      maxConcurrentRequests: this.options.maxConcurrentRequests,
      cpuLoad: os.loadavg()[0] / os.cpus().length,
    }
  }

  /**
   * Sanitize input to prevent prompt injection, XSS, and other attacks
   * Removes dangerous characters, trims excessive length, and blocks common prompt injection patterns
   */
  private sanitizeInput(input: string): string {
    // Use sanitize-html to remove script tags and other dangerous content
    let sanitized = sanitizeHtml(input, {
      allowedTags: [], // Remove all HTML tags
      allowedAttributes: {}, // Remove all attributes
    })
    sanitized = sanitized
      .replace(/\s+/g, ' ') // Normalize excessive whitespace
      .trim()
    // Block common prompt injection patterns
    const lower = sanitized.toLowerCase()
    if (
      lower.includes('ignore previous') ||
      lower.includes('as an ai') ||
      lower.includes('disregard above')
    ) {
      throw new Error('Unsafe input detected: possible prompt injection')
    }
    // Enforce max length
    if (sanitized.length > 5000) {
      throw new Error('Input exceeds maximum allowed length')
    }
    return sanitized
  }
}
