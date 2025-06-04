import type {
  AIMessage,
  AIProvider,
  AIService,
  AIServiceOptions,
} from './models/ai-types'
import { checkRateLimit } from '../../lib/rate-limit'
import { AuditEventType, createAuditLog } from '../audit'
import { getLogger } from '../logging'

const logger = getLogger({ prefix: 'ai-performance' })

/**
 * AI Performance metrics interface for the monitoring class
 */
export interface AIPerformanceMetrics {
  /**
   * Unique identifier for the operation
   */
  operationId: string

  /**
   * Type of AI operation
   */
  operationType: AIOperationType

  /**
   * Processing time in milliseconds
   */
  processingTimeMs: number

  /**
   * Number of input tokens
   */
  inputTokens: number

  /**
   * Number of output tokens
   */
  outputTokens: number

  /**
   * Total tokens used
   */
  totalTokens: number

  /**
   * Cost of the operation (if available)
   */
  cost?: number

  /**
   * Additional metadata for the operation
   */
  metadata?: Record<string, unknown>

  /**
   * Whether the operation was successful
   */
  success: boolean

  /**
   * Error message if the operation failed
   */
  errorMessage?: string

  /**
   * Timestamp when the operation started
   */
  startTime: Date

  /**
   * Timestamp when the operation completed
   */
  endTime: Date
}

/**
 * Types of AI operations
 */
export type AIOperationType =
  | 'emotion-detection'
  | 'pattern-recognition'
  | 'documentation-generation'
  | 'summary-generation'
  | 'recommendation-generation'
  | 'time-series-analysis'
  | 'trend-detection'
  | 'risk-assessment'
  | 'custom'

/**
 * Options for the performance monitoring service
 */
export interface AIPerformanceMonitorOptions {
  /**
   * Whether to log metrics to the console
   */
  logToConsole?: boolean

  /**
   * Whether to create audit logs for performance metrics
   */
  createAuditLogs?: boolean

  /**
   * Latency threshold in ms for slow request warnings
   */
  slowRequestThreshold?: number

  /**
   * Token usage threshold for high token usage warnings
   */
  highTokenUsageThreshold?: number

  /**
   * Custom callback for handling performance metrics
   */
  onMetricsCollected?: (metrics: AIPerformanceMetrics) => void

  /**
   * Custom storage location for metrics
   */
  metricsStorage?: 'memory' | 'redis' | 'database'
}

/**
 * Default performance monitor options
 */
const DEFAULT_OPTIONS: AIPerformanceMonitorOptions = {
  logToConsole: true,
  createAuditLogs: false,
  slowRequestThreshold: 1000, // 1 second
  highTokenUsageThreshold: 1000, // 1000 tokens
  metricsStorage: 'memory',
}

/**
 * AI Performance monitoring service
 */
export class AIPerformanceMonitor {
  private static instance: AIPerformanceMonitor
  private options: AIPerformanceMonitorOptions
  private metrics: Map<string, AIPerformanceMetrics> = new Map()
  private listeners: Array<(metrics: AIPerformanceMetrics) => void> = []

  /**
   * Get the singleton instance
   */
  public static getInstance(
    options?: AIPerformanceMonitorOptions,
  ): AIPerformanceMonitor {
    if (!AIPerformanceMonitor.instance) {
      AIPerformanceMonitor.instance = new AIPerformanceMonitor(options)
    }
    return AIPerformanceMonitor.instance
  }

  /**
   * Private constructor
   */
  private constructor(options?: AIPerformanceMonitorOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
    logger.info('AI Performance monitoring initialized', {
      options: this.options,
    })
  }

  /**
   * Start tracking an operation
   * @param operationType Type of operation
   * @param metadata Additional metadata
   * @returns Operation ID
   */
  public startOperation(
    operationType: AIOperationType,
    metadata?: Record<string, unknown>,
  ): string {
    const operationId = `${operationType}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

    this.metrics.set(operationId, {
      operationId,
      operationType,
      processingTimeMs: 0,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      metadata,
      success: false,
      startTime: new Date(),
      endTime: new Date(), // Will be updated on completion
    })

    return operationId
  }

  /**
   * End tracking an operation
   * @param operationId Operation ID
   * @param result Operation result
   */
  public endOperation(
    operationId: string,
    result: {
      success: boolean
      inputTokens: number
      outputTokens: number
      errorMessage?: string
      cost?: number
      additionalMetadata?: Record<string, unknown>
    },
  ): AIPerformanceMetrics {
    const operation = this.metrics.get(operationId)

    if (!operation) {
      logger.warn('Attempted to end non-existent operation', { operationId })
      throw new Error(`Operation ${operationId} not found`)
    }

    const endTime = new Date()
    const processingTimeMs = endTime.getTime() - operation.startTime.getTime()

    const updatedMetrics: AIPerformanceMetrics = {
      ...operation,
      processingTimeMs,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      totalTokens: result.inputTokens + result.outputTokens,
      success: result.success,
      errorMessage: result.errorMessage,
      cost: result.cost,
      metadata: {
        ...operation.metadata,
        ...result.additionalMetadata,
      },
      endTime,
    }

    this.metrics.set(operationId, updatedMetrics)

    // Log metrics
    this.logMetrics(updatedMetrics)

    // Emit metrics to listeners
    this.notifyListeners(updatedMetrics)

    return updatedMetrics
  }

  /**
   * Register a listener for metrics
   * @param listener Metrics listener
   * @returns Function to unregister the listener
   */
  public addListener(
    listener: (metrics: AIPerformanceMetrics) => void,
  ): () => void {
    this.listeners.push(listener)
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  /**
   * Get metrics for a specific operation
   * @param operationId Operation ID
   * @returns Performance metrics
   */
  public getMetrics(operationId: string): AIPerformanceMetrics | undefined {
    return this.metrics.get(operationId)
  }

  /**
   * Get all metrics
   * @returns All performance metrics
   */
  public getAllMetrics(): AIPerformanceMetrics[] {
    return Array.from(this.metrics.values())
  }

  /**
   * Get metrics for a specific type of operation
   * @param operationType Operation type
   * @returns Metrics for the specified operation type
   */
  public getMetricsByType(
    operationType: AIOperationType,
  ): AIPerformanceMetrics[] {
    return this.getAllMetrics().filter((m) => m.operationType === operationType)
  }

  /**
   * Calculate average processing time for a type of operation
   * @param operationType Operation type
   * @returns Average processing time in milliseconds
   */
  public getAverageProcessingTime(operationType: AIOperationType): number {
    const metrics = this.getMetricsByType(operationType)

    if (metrics.length === 0) {
      return 0
    }

    const totalTime = metrics.reduce(
      (sum, metric) => sum + metric.processingTimeMs,
      0,
    )
    return totalTime / metrics.length
  }

  /**
   * Calculate average token usage for a type of operation
   * @param operationType Operation type
   * @returns Average token usage
   */
  public getAverageTokenUsage(operationType: AIOperationType): {
    inputTokens: number
    outputTokens: number
    totalTokens: number
  } {
    const metrics = this.getMetricsByType(operationType)

    if (metrics.length === 0) {
      return { inputTokens: 0, outputTokens: 0, totalTokens: 0 }
    }

    const totalInputTokens = metrics.reduce(
      (sum, metric) => sum + metric.inputTokens,
      0,
    )
    const totalOutputTokens = metrics.reduce(
      (sum, metric) => sum + metric.outputTokens,
      0,
    )
    const totalTokens = metrics.reduce(
      (sum, metric) => sum + metric.totalTokens,
      0,
    )

    return {
      inputTokens: totalInputTokens / metrics.length,
      outputTokens: totalOutputTokens / metrics.length,
      totalTokens: totalTokens / metrics.length,
    }
  }

  /**
   * Clear all metrics
   */
  public clearMetrics(): void {
    this.metrics.clear()
    logger.info('AI Performance metrics cleared')
  }

  /**
   * Log metrics based on configuration
   * @param metrics Performance metrics
   */
  private logMetrics(metrics: AIPerformanceMetrics): void {
    // Check for performance warnings
    this.checkForPerformanceIssues(metrics)

    // Log to console if enabled
    if (this.options.logToConsole) {
      logger.info('AI Operation performance metrics', {
        operationId: metrics.operationId,
        operationType: metrics.operationType,
        processingTime: `${metrics.processingTimeMs}ms`,
        tokens: {
          input: metrics.inputTokens,
          output: metrics.outputTokens,
          total: metrics.totalTokens,
        },
        success: metrics.success,
        ...(metrics.errorMessage && { error: metrics.errorMessage }),
        ...(metrics.cost && { cost: metrics.cost }),
      })
    }

    // Call custom metrics handler if provided
    if (this.options.onMetricsCollected) {
      try {
        this.options.onMetricsCollected(metrics)
      } catch (error) {
        logger.error('Error in custom metrics handler', { error })
      }
    }
  }

  /**
   * Check for performance issues in the metrics
   * @param metrics Performance metrics
   */
  private checkForPerformanceIssues(metrics: AIPerformanceMetrics): void {
    const { slowRequestThreshold, highTokenUsageThreshold } = this.options

    // Check for slow processing
    if (
      slowRequestThreshold &&
      metrics.processingTimeMs > slowRequestThreshold
    ) {
      logger.warn('Slow AI processing detected', {
        operationId: metrics.operationId,
        operationType: metrics.operationType,
        processingTime: `${metrics.processingTimeMs}ms`,
        threshold: `${slowRequestThreshold}ms`,
      })
    }

    // Check for high token usage
    if (
      highTokenUsageThreshold &&
      metrics.totalTokens > highTokenUsageThreshold
    ) {
      logger.warn('High token usage detected', {
        operationId: metrics.operationId,
        operationType: metrics.operationType,
        totalTokens: metrics.totalTokens,
        threshold: highTokenUsageThreshold,
      })
    }
  }

  /**
   * Notify all listeners of new metrics
   * @param metrics Performance metrics
   */
  private notifyListeners(metrics: AIPerformanceMetrics): void {
    this.listeners.forEach((listener) => {
      try {
        listener(metrics)
      } catch (error) {
        logger.error('Error in metrics listener', { error })
      }
    })
  }
}

/**
 * Performance monitoring decorator for class methods
 * @param operationType Type of operation
 * @param options Additional options
 */
export function monitorPerformance(
  operationType: AIOperationType,
  options?: {
    getInputTokens?: (args: unknown[]) => number
    getOutputTokens?: (result: unknown) => number
    getMetadata?: (args: unknown[]) => Record<string, unknown>
  },
) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: unknown[]) {
      const monitor = AIPerformanceMonitor.getInstance()
      const metadata = options?.getMetadata ? options.getMetadata(args) : {}

      // Get operation ID
      const operationId = monitor.startOperation(operationType, metadata)

      try {
        // Execute the original method
        const result = await originalMethod.apply(this, args)

        // Get token counts
        const inputTokens = options?.getInputTokens
          ? options.getInputTokens(args)
          : 0
        const outputTokens = options?.getOutputTokens
          ? options.getOutputTokens(result)
          : 0

        // Record successful operation
        monitor.endOperation(operationId, {
          success: true,
          inputTokens,
          outputTokens,
          additionalMetadata: { result: typeof result },
        })

        return result
      } catch (error) {
        // Record failed operation
        monitor.endOperation(operationId, {
          success: false,
          inputTokens: options?.getInputTokens
            ? options.getInputTokens(args)
            : 0,
          outputTokens: 0,
          errorMessage: error instanceof Error ? error.message : String(error),
          additionalMetadata: {
            errorType: error instanceof Error ? error.name : 'Unknown',
          },
        })

        throw error
      }
    }

    return descriptor
  }
}

// Export a singleton instance
export const aiPerformanceMonitor = AIPerformanceMonitor.getInstance()

/**
 * Interface for performance metrics used in the optimized service
 */
export interface PerformanceMetrics {
  /**
   * The model or operation being tracked
   */
  model: string

  /**
   * Latency in milliseconds
   */
  latency: number

  /**
   * Whether the operation was successful
   */
  success: boolean

  /**
   * Whether the result was retrieved from cache
   */
  cached: boolean

  /**
   * Whether optimizations were applied
   */
  optimized: boolean

  /**
   * Unique identifier for the request
   */
  requestId: string

  /**
   * Start time of the operation
   */
  startTime: number

  /**
   * End time of the operation
   */
  endTime: number

  /**
   * Additional metadata about the operation
   */
  metadata?: Record<string, unknown>

  /**
   * User ID associated with the operation
   */
  userId?: string

  /**
   * Number of input tokens (optional)
   */
  inputTokens?: number

  /**
   * Number of output tokens (optional)
   */
  outputTokens?: number

  /**
   * Total tokens used (optional)
   */
  totalTokens?: number

  /**
   * Error code if the operation failed (optional)
   */
  errorCode?: string
}

/**
 * Options for the performance monitoring service for the optimized service
 */
export interface PerformanceMonitorOptions {
  /**
   * Whether to log metrics to the console
   */
  logToConsole?: boolean

  /**
   * Whether to create audit logs for performance metrics
   */
  createAuditLogs?: boolean

  /**
   * Latency threshold in ms for slow request warnings
   */
  slowRequestThreshold?: number

  /**
   * Token usage threshold for high token usage warnings
   */
  highTokenUsageThreshold?: number

  /**
   * Custom callback for handling performance metrics
   */
  onMetricsCollected?: (metrics: PerformanceMetrics) => void
}

/**
 * Cache configuration options
 */
export interface CacheOptions {
  /**
   * Whether to enable caching
   */
  enabled?: boolean

  /**
   * Time-to-live for cache entries in milliseconds
   */
  ttl?: number

  /**
   * Maximum number of entries to store in the cache
   */
  maxEntries?: number

  /**
   * Function to generate a cache key from messages and options
   */
  keyGenerator?: (messages: AIMessage[], options?: AIServiceOptions) => string
}

/**
 * Cache entry structure
 */
interface CacheEntry<T> {
  value: T
  expiresAt: number
}

/**
 * Simple in-memory LRU cache implementation
 */
class AIResponseCache<T> {
  private cache = new Map<string, CacheEntry<T>>()
  private readonly options: Required<CacheOptions>

  constructor(options: CacheOptions = {}) {
    this.options = {
      enabled: options.enabled ?? true,
      ttl: options.ttl ?? 5 * 60 * 1000, // 5 minutes default
      maxEntries: options.maxEntries ?? 100,
      keyGenerator: options.keyGenerator ?? this.defaultKeyGenerator,
    }
  }

  /**
   * Default function to generate cache keys
   */
  private defaultKeyGenerator(
    messages: AIMessage[],
    options?: AIServiceOptions,
  ): string {
    const messagesStr = JSON.stringify(messages)
    const optionsStr = options
      ? JSON.stringify({
          model: options.model,
          temperature: options.temperature,
          maxTokens: options.maxTokens,
        })
      : ''

    return `${messagesStr}:${optionsStr}`
  }

  /**
   * Get a value from the cache
   */
  get(messages: AIMessage[], options?: AIServiceOptions): T | undefined {
    if (!this.options.enabled) {
      return undefined
    }

    const key = this.options.keyGenerator(messages, options)
    const entry = this.cache.get(key)

    if (!entry) {
      return undefined
    }

    // Check if the entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return undefined
    }

    // Move the entry to the end of the map to implement LRU behavior
    this.cache.delete(key)
    this.cache.set(key, entry)

    return entry.value
  }

  /**
   * Set a value in the cache
   */
  set(
    messages: AIMessage[],
    options: AIServiceOptions | undefined,
    value: T,
  ): void {
    if (!this.options.enabled) {
      return
    }

    const key = this.options.keyGenerator(messages, options)

    // Enforce max entries limit (LRU eviction)
    if (this.cache.size >= this.options.maxEntries) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) {
        this.cache.delete(oldestKey)
      }
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.options.ttl,
    })
  }

  /**
   * Clear the cache
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get the current size of the cache
   */
  size(): number {
    return this.cache.size
  }
}

/**
 * Extended AIError interface that includes code property
 */
interface ExtendedAIError extends Error {
  code?: string
  name: string
}

/**
 * Creates a performance-optimized AI service wrapper
 */
export function createOptimizedAIService(
  aiService: AIService,
  performanceOptions: PerformanceMonitorOptions = {},
  cacheOptions: CacheOptions = {},
  enableRateLimit = false,
  maxRequestsPerMinute = 10,
): AIService {
  // Initialize the response cache
  const responseCache = new AIResponseCache<
    Awaited<ReturnType<AIService['createChatCompletion']>>
  >(cacheOptions)

  // Default performance options
  const options: PerformanceMonitorOptions = {
    logToConsole: performanceOptions.logToConsole ?? true,
    createAuditLogs: performanceOptions.createAuditLogs ?? true,
    slowRequestThreshold: performanceOptions.slowRequestThreshold ?? 3000, // 3 seconds
    highTokenUsageThreshold: performanceOptions.highTokenUsageThreshold ?? 1000,
    onMetricsCollected:
      performanceOptions.onMetricsCollected ??
      ((_metricsData: PerformanceMetrics) => {
        /* No default action */
      }),
  }

  /**
   * Collects and processes performance metrics
   */
  const collectMetrics = async (metrics: PerformanceMetrics): Promise<void> => {
    // Log to console if enabled
    if (options.logToConsole) {
      console.log('[AI Performance]', {
        model: metrics.model,
        latency: `${metrics.latency}ms`,
        tokens: metrics.totalTokens,
        success: metrics.success,
        cached: metrics.cached,
        optimized: metrics.optimized,
      })
    }

    // Create audit log if enabled
    if (options.createAuditLogs) {
      await createAuditLog(
        AuditEventType.AI_OPERATION,
        'ai.response',
        metrics.userId || 'system',
        'ai',
        {
          requestId: metrics.requestId,
          model: metrics.model,
          latency: metrics.latency,
          inputTokens: metrics.inputTokens,
          outputTokens: metrics.outputTokens,
          totalTokens: metrics.totalTokens,
          errorCode: metrics.errorCode,
          cached: metrics.cached,
          optimized: metrics.optimized,
        },
      )
    }

    // Check for slow requests
    if (
      options.slowRequestThreshold &&
      metrics.latency > options.slowRequestThreshold
    ) {
      console.warn(
        `[AI Performance Warning] Slow request detected (${metrics.latency}ms) for model ${metrics.model}`,
      )
    }

    // Check for high token usage
    if (
      options.highTokenUsageThreshold &&
      metrics.totalTokens &&
      metrics.totalTokens > options.highTokenUsageThreshold
    ) {
      console.warn(
        `[AI Performance Warning] High token usage detected (${metrics.totalTokens} tokens) for model ${metrics.model}`,
      )
    }

    // Call custom metrics handler if provided
    if (options.onMetricsCollected) {
      options.onMetricsCollected(metrics)
    }
  }

  // Generate a unique request ID
  const generateRequestId = (): string => {
    return `req_${Math.random().toString(36).substring(2, 15)}`
  }

  return {
    createChatCompletion: async (messages, serviceOptions) => {
      // Check cache first
      const cachedResponse = responseCache.get(messages, serviceOptions)
      if (cachedResponse) {
        return cachedResponse
      }

      const startTime = Date.now()
      let success = false
      let errorCode: string | undefined
      let cached = false

      try {
        // Apply rate limiting if enabled
        if (enableRateLimit && serviceOptions?.userId) {
          const rateLimited = checkRateLimit(
            serviceOptions.userId,
            maxRequestsPerMinute,
          )
          if (rateLimited) {
            errorCode = 'RATE_LIMITED'
            throw new Error('Rate limit exceeded')
          }
        }

        // Check cache first
        const cachedResponse = responseCache.get(messages, serviceOptions)
        if (cachedResponse) {
          cached = true

          const endTime = Date.now()
          await collectMetrics({
            requestId: generateRequestId(),
            model: cachedResponse.model || serviceOptions?.model || 'unknown',
            startTime,
            endTime,
            latency: endTime - startTime,
            inputTokens: cachedResponse.usage?.promptTokens,
            outputTokens: cachedResponse.usage?.completionTokens,
            totalTokens: cachedResponse.usage?.totalTokens,
            success: true,
            cached: true,
            optimized: false,
          })

          return cachedResponse
        }

        // Make the actual request
        const response = await aiService.createChatCompletion(
          messages,
          serviceOptions,
        )
        success = true

        // Cache the successful response
        responseCache.set(messages, serviceOptions, response)

        // Collect metrics
        const endTime = Date.now()
        await collectMetrics({
          requestId: generateRequestId(),
          model: response?.model || serviceOptions?.model || 'unknown',
          startTime,
          endTime,
          latency: endTime - startTime,
          inputTokens: response?.usage?.promptTokens,
          outputTokens: response?.usage?.completionTokens,
          totalTokens: response?.usage?.totalTokens,
          success,
          cached,
          optimized: false,
        })

        return response
      } catch (error) {
        // Collect error metrics
        const endTime = Date.now()
        errorCode =
          error instanceof Error
            ? error?.name === 'AIError'
              ? (error as ExtendedAIError).code
              : error?.name
            : 'unknown'

        await collectMetrics({
          requestId: generateRequestId(),
          model: serviceOptions?.model || 'unknown',
          startTime,
          endTime,
          latency: endTime - startTime,
          success: false,
          errorCode,
          cached: false,
          optimized: false,
        })

        throw error
      }
    },

    createStreamingChatCompletion: async (messages, serviceOptions) => {
      // Note: We don't cache streaming responses as they're meant for real-time use

      const startTime = Date.now()
      let success = false
      let errorCode: string | undefined

      try {
        // Make the actual request
        const response = await aiService.createStreamingChatCompletion(
          messages,
          serviceOptions,
        )
        success = true

        // Collect metrics after the stream is created
        // Note: We don't have token usage for streaming responses
        const endTime = Date.now()
        await collectMetrics({
          requestId: generateRequestId(),
          model: serviceOptions?.model || 'unknown',
          startTime,
          endTime,
          latency: endTime - startTime,
          success,
          cached: false, // Streaming responses are not cached
          optimized: false, // Streaming responses are not typically optimized in this context
        })

        return response
      } catch (error) {
        // Collect error metrics
        const endTime = Date.now()
        errorCode =
          error instanceof Error
            ? error.name === 'AIError'
              ? (error as ExtendedAIError).code
              : error.name
            : 'unknown'

        await collectMetrics({
          requestId: generateRequestId(),
          model: serviceOptions?.model || 'unknown',
          startTime,
          endTime,
          latency: endTime - startTime,
          success: false,
          errorCode,
          cached: false,
          optimized: false,
        })

        throw error
      }
    },

    getModelInfo: (model) => {
      return aiService.getModelInfo(model)
    },

    createChatCompletionWithTracking: async (messages, serviceOptions) => {
      return aiService.createChatCompletionWithTracking(
        messages,
        serviceOptions,
      )
    },

    generateCompletion: async (
      messages: AIMessage[],
      serviceOptions?: AIServiceOptions,
      provider?: AIProvider,
    ) => {
      return aiService.generateCompletion(
        messages,
        serviceOptions || {},
        provider as AIProvider,
      )
    },

    dispose: () => {
      aiService.dispose()
      responseCache.clear()
    },
  }
}

/**
 * Utility to estimate token count for a message
 * This is a rough estimate and not exact
 */
export function estimateTokenCount(text: string): number {
  // A very rough estimate: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4)
}

/**
 * Utility to estimate token count for a set of messages
 */
export function estimateMessagesTokenCount(messages: AIMessage[]): number {
  // Base tokens for the messages format
  let tokenCount = 3 // Every response is primed with <|start|>assistant<|message|>

  for (const message of messages) {
    // Add tokens for message role and content
    tokenCount += 4 // Each message has a role and content field with formatting
    tokenCount += estimateTokenCount(message.content)
  }

  return tokenCount
}

/**
 * Truncates messages to fit within a token limit
 * Preserves the most recent messages and system messages
 */
export function truncateMessages(
  messages: AIMessage[],
  maxTokens = 4000,
  reserveTokens = 1000,
): AIMessage[] {
  // If we don't have enough messages to worry about, return as is
  if (messages.length <= 2) {
    return messages
  }

  // Estimate current token count
  const estimatedTokens = estimateMessagesTokenCount(messages)

  // If we're under the limit, return as is
  if (estimatedTokens <= maxTokens - reserveTokens) {
    return messages
  }

  // Separate system messages from other messages
  const systemMessages = messages.filter((m) => m.role === 'system')
  const nonSystemMessages = messages.filter((m) => m.role !== 'system')

  // Calculate tokens used by system messages
  const systemTokens = estimateMessagesTokenCount(systemMessages)

  // Calculate how many tokens we have left for non-system messages
  const availableTokens = maxTokens - systemTokens - reserveTokens

  // If we don't have enough tokens for any non-system messages, just return system messages
  if (availableTokens <= 0) {
    return systemMessages
  }

  // Start with the most recent message and work backwards
  const truncatedMessages: AIMessage[] = []
  let usedTokens = 0

  for (let i = nonSystemMessages.length - 1; i >= 0; i--) {
    const message = nonSystemMessages[i]
    const messageTokens = estimateTokenCount(message.content) + 4 // +4 for message formatting

    if (usedTokens + messageTokens <= availableTokens) {
      truncatedMessages.unshift(message)
      usedTokens += messageTokens
    } else {
      // If this is the first message and we can't fit it completely,
      // truncate its content to fit within the limit
      if (i === nonSystemMessages.length - 1) {
        const availableForContent = availableTokens - 4 // -4 for message formatting
        if (availableForContent > 0) {
          // Truncate the content to fit within the limit
          const truncatedContent = message.content.slice(
            0,
            availableForContent * 4,
          )
          truncatedMessages.unshift({
            ...message,
            content: truncatedContent,
          })
        }
      }
      break
    }
  }

  // Combine system messages with truncated non-system messages
  return [...systemMessages, ...truncatedMessages]
}
