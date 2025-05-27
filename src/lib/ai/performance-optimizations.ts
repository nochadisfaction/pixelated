import type {
  AICompletionResponse,
  AIMessage,
  AIModel,
  AIProvider,
  AIService,
  AIServiceOptions,
} from './models/ai-types'
import { estimateMessagesTokenCount, truncateMessages } from './performance'

/**
 * Advanced caching options
 */
export interface AdvancedCacheOptions {
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

  /**
   * Whether to use Redis for distributed caching
   */
  useRedis?: boolean

  /**
   * Redis connection string (required if useRedis is true)
   */
  redisUrl?: string

  /**
   * Redis key prefix
   */
  redisKeyPrefix?: string

  /**
   * Whether to use tiered caching (memory + Redis)
   */
  useTieredCaching?: boolean

  /**
   * Memory cache TTL for tiered caching (shorter than Redis TTL)
   */
  memoryTtl?: number
}

/**
 * Request batching options
 */
export interface RequestBatchingOptions {
  /**
   * Whether to enable request batching
   */
  enabled?: boolean

  /**
   * Maximum batch size
   */
  maxBatchSize?: number

  /**
   * Maximum wait time for batching in milliseconds
   */
  maxWaitTime?: number
}

/**
 * Token optimization options
 */
export interface TokenOptimizationOptions {
  /**
   * Whether to enable token optimization
   */
  enabled?: boolean

  /**
   * Maximum tokens to use for context
   */
  maxContextTokens?: number

  /**
   * Tokens to reserve for response
   */
  reserveTokens?: number

  /**
   * Whether to use semantic message compression
   */
  useSemanticCompression?: boolean

  /**
   * Whether to prioritize system messages
   */
  prioritizeSystemMessages?: boolean

  /**
   * Whether to prioritize recent messages
   */
  prioritizeRecentMessages?: boolean
}

/**
 * Advanced performance options
 */
export interface AdvancedPerformanceOptions {
  /**
   * Advanced caching options
   */
  caching?: AdvancedCacheOptions

  /**
   * Request batching options
   */
  batching?: RequestBatchingOptions

  /**
   * Token optimization options
   */
  tokenOptimization?: TokenOptimizationOptions

  /**
   * Whether to enable adaptive model selection
   */
  enableAdaptiveModelSelection?: boolean

  /**
   * Whether to enable request prioritization
   */
  enableRequestPrioritization?: boolean

  /**
   * Whether to enable performance analytics
   */
  enablePerformanceAnalytics?: boolean

  // Caching options
  enableCache?: boolean
  cacheTTL?: number // Time to live in seconds

  // Rate limiting options
  enableRateLimit?: boolean
  maxRequestsPerMinute?: number

  // Token optimization options
  maxContextLength?: number

  // Batching options
  enableBatching?: boolean
  batchWindow?: number // Time window in ms to batch requests
  maxBatchSize?: number

  // Fallback options
  enableFallback?: boolean
  fallbackModels?: string[]

  // Tracking options
  enableDetailedTracking?: boolean
}

/**
 * Semantic message compression for token optimization
 */
function compressMessages(
  messages: AIMessage[],
  maxTokens: number,
): AIMessage[] {
  return truncateMessages(messages, maxTokens)
}

/**
 * Creates an advanced performance-optimized AI service
 */
export function createAdvancedOptimizedAIService(
  aiService: AIService,
  options: AdvancedPerformanceOptions = {},
): AIService {
  const {
    enabled: tokenOptimizationEnabled = true,
    maxContextTokens = 4000,
    reserveTokens = 1000,
    useSemanticCompression = false,
  } = options.tokenOptimization ?? {}

  /**
   * Optimize messages for token usage
   */
  function optimizeMessages(messages: AIMessage[]): {
    messages: AIMessage[]
    optimized: boolean
  } {
    if (!tokenOptimizationEnabled) {
      return { messages, optimized: false }
    }

    // Estimate token count
    const estimatedTokens = estimateMessagesTokenCount(messages)

    // If we're under the limit, return as is
    if (estimatedTokens <= maxContextTokens - reserveTokens) {
      return { messages, optimized: false }
    }

    // Use semantic compression if enabled, otherwise use truncation
    const optimizedMessages = useSemanticCompression
      ? compressMessages(messages, maxContextTokens - reserveTokens)
      : truncateMessages(messages, maxContextTokens, reserveTokens)

    return { messages: optimizedMessages, optimized: true }
  }

  /**
   * Select the optimal model based on the request
   */
  function selectOptimalModel(requestedModel: string): string {
    if (!options.enableAdaptiveModelSelection) {
      return requestedModel
    }

    // This is a placeholder for a more sophisticated implementation
    return requestedModel
  }

  /**
   * Prepares the request by optimizing tokens and selecting the optimal model
   */
  function prepareRequest(
    messages: AIMessage[],
    options?: AIServiceOptions,
  ): {
    optimizedMessages: AIMessage[]
    model: string
  } {
    const { messages: optimizedMessages } = optimizeMessages(messages)
    const model = selectOptimalModel(options?.model || 'default-model')
    return { optimizedMessages, model }
  }

  return {
    createChatCompletion: async (
      messages: AIMessage[],
      options?: AIServiceOptions,
    ): Promise<AICompletionResponse> => {
      const { optimizedMessages, model } = prepareRequest(messages, options)
      return aiService.createChatCompletion(optimizedMessages, {
        ...options,
        model,
        temperature: options?.temperature ?? 1.0,
      })
    },

    createStreamingChatCompletion: async (
      messages: AIMessage[],
      options?: AIServiceOptions,
    ) => {
      const { optimizedMessages, model } = prepareRequest(messages, options)
      return aiService.createStreamingChatCompletion(optimizedMessages, {
        ...options,
        model,
        temperature: options?.temperature ?? 1.0,
      })
    },

    getModelInfo: (model: string): AIModel | null => {
      return aiService.getModelInfo(model)
    },

    createChatCompletionWithTracking: async (
      messages: AIMessage[],
      options?: AIServiceOptions,
    ): Promise<AICompletionResponse> => {
      const { optimizedMessages, model } = prepareRequest(messages, options)
      return aiService.createChatCompletionWithTracking(optimizedMessages, {
        ...options,
        model,
        temperature: options?.temperature ?? 1.0,
      })
    },

    generateCompletion: async (
      messages: AIMessage[],
      options: AIServiceOptions,
      provider: AIProvider,
    ) => {
      const { optimizedMessages, model } = prepareRequest(messages, options)
      return aiService.generateCompletion(
        optimizedMessages,
        {
          ...options,
          model,
          temperature: options?.temperature ?? 1.0,
        },
        provider,
      )
    },

    dispose: () => {
      aiService.dispose()
    },
  }
}

// Example PHI audit logging - uncomment and customize as needed
// logger.info('Accessing PHI data', {
//   userId: 'user-id-here',
//   action: 'read',
//   dataType: 'patient-record',
//   recordId: 'record-id-here'
// });
