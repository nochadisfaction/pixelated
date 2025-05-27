import type { AIServiceConfig } from './services/ai-service'
// Export error handling utilities
import * as errorHandling from './error-handling'
// Import AIService and AIServiceConfig explicitly
import { AIService } from './services/ai-service'
import { CrisisDetectionService } from './services/crisis-detection'
import { InterventionAnalysisService } from './services/intervention-analysis'
import { ResponseGenerationService } from './services/response-generation'

import { SentimentAnalysisService } from './services/sentiment-analysis'

// Factory function is defined in this file

// Export types
export * from './models/ai-types'

export { type AIServiceOptions } from './models/ai-types'
// Export model registry
export * from './models/registry'
// Export performance optimization utilities
export * from './performance-optimizations'
// Export services
export { AIService, type AIServiceConfig } from './services/ai-service'
// Export performance optimization services
export { AICacheService, type CacheConfig } from './services/cache-service'
export {
  type ConnectionPoolConfig,
  ConnectionPoolManager,
} from './services/connection-pool'

export {
  type CrisisDetectionConfig,
  CrisisDetectionService,
} from './services/crisis-detection'
export * from './services/crisis-detection'
export {
  FallbackService,
  type FallbackServiceConfig,
} from './services/fallback-service'
export {
  type InterventionAnalysisConfig,
  type InterventionAnalysisResult,
  InterventionAnalysisService,
} from './services/intervention-analysis'

export * from './services/intervention-analysis'

export {
  type PromptOptimizerConfig,
  PromptOptimizerService,
} from './services/prompt-optimizer'
export {
  type ResponseGenerationConfig,
  ResponseGenerationService,
} from './services/response-generation'
export * from './services/response-generation'
export {
  type SentimentAnalysisConfig,
  SentimentAnalysisService,
} from './services/sentiment-analysis'
export { errorHandling }

// Export AI services
export * from './services/sentiment-analysis'

// Export Comparative Analytics components
export { ComparativeAnalyticsService } from './services/ComparativeAnalyticsService'
export { createComparativeAnalyticsService } from './services/ComparativeAnalyticsFactory'
export {
  BenchmarkRepositoryImpl,
  createDefaultBenchmarkRepository,
} from './services/ComparativeAnalyticsRepository'
export type {
  AnonymizedBenchmark,
  TechniqueWithEffectiveness,
  EffectivenessInsight,
  BenchmarkRepository,
  ComparativeAnalyticsOptions,
} from './services/ComparativeAnalyticsService'

// Define internal types
interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

/**
 * Create a new AI service with the provided configuration
 */
export function createAIService(config: AIServiceConfig) {
  return new AIService(config)
}

/**
 * Create a sentiment analysis service with the provided AI service
 */
export function createSentimentAnalysisService(
  aiService: AIService,
  model?: string,
  defaultPrompt?: string,
) {
  return new SentimentAnalysisService({
    aiService,
    model,
    defaultPrompt,
  })
}

/**
 * Create a crisis detection service with the provided AI service
 */
export function createCrisisDetectionService(
  aiService: AIService,
  model?: string,
  defaultPrompt?: string,
  sensitivityLevel?: 'low' | 'medium' | 'high',
) {
  return new CrisisDetectionService({
    aiService,
    model,
    defaultPrompt,
    sensitivityLevel,
  })
}

/**
 * Create a response generation service with the provided AI service
 */
export function createResponseGenerationService(
  aiService: AIService,
  model?: string,
  maxResponseTokens?: number,
  temperature?: number,
) {
  return new ResponseGenerationService({
    aiService,
    model,
    maxResponseTokens,
    temperature,
  })
}

/**
 * Create an intervention analysis service with the provided AI service
 */
export function createInterventionAnalysisService(
  aiService: AIService,
  model?: string,
) {
  return new InterventionAnalysisService({
    aiService,
    model,
    systemPrompt: `You are an expert therapist analyzing the effectiveness of interventions. Your responses should be concise and focused on the intervention's impact and areas for improvement.`,
  })
}

/**
 * AI Message Types
 */
export interface AIMessage {
  role: 'user' | 'assistant' | 'system'
  content?: string
  name?: string
}

/**
 * Sentiment Analysis Types
 */
export interface SentimentResult {
  score: number // -1 to 1, where -1 is very negative, 1 is very positive
  label: 'negative' | 'neutral' | 'positive'
  confidence: number // 0 to 1
  emotions?: Record<string, number> // Optional map of emotions to scores (0-1)
  usage?: TokenUsage
  // Allow additional properties with string keys
  [key: string]: string | number | boolean | object | undefined
}

/**
 * Crisis Detection Types
 */
export interface CrisisDetectionResult {
  isCrisis: boolean
  confidence: number // 0 to 1
  category?: string // Optional category of crisis (e.g., "self-harm", "suicide", "abuse")
  severity?: 'low' | 'medium' | 'high'
  recommendedAction?: string
}

/**
 * Response Generation Types
 */
export interface ResponseGenerationResult {
  response: string
  metadata?: {
    tokensUsed?: number
    model?: string
    processingTime?: number
  }
}

/**
 * Intervention Effectiveness Types
 */
export interface InterventionEffectivenessResult {
  score: number // 0 to 1, where 0 is ineffective, 1 is very effective
  confidence: number // 0 to 1
  recommendations?: string[]
  areas?: {
    name: string
    score: number
  }[]
}

/**
 * API Request Types
 */
export interface ChatCompletionRequest {
  model: string
  messages: AIMessage[]
  temperature?: number
  maxTokens?: number
}

export interface SentimentAnalysisRequest {
  model: string
  text: string
}

export interface CrisisDetectionRequest {
  model: string
  text: string
  sensitivityLevel?: 'low' | 'medium' | 'high'
}

export interface ResponseGenerationRequest {
  model: string
  messages: AIMessage[]
  temperature?: number
  maxResponseTokens?: number
  instructions?: string
}

export interface InterventionEffectivenessRequest {
  model: string
  conversation: AIMessage[]
  interventionMessage: string
  userResponse: string
}

// Export all services and utilities
export * from './services/ai-service'

// Singleton instance of AIService
let aiServiceInstance: AIService | null = null

/**
 * Gets or creates a singleton instance of AIService
 * @param config Optional configuration to override defaults
 * @returns AIService instance
 */
export function getAIService(config?: Partial<AIServiceConfig>): AIService {
  if (!aiServiceInstance) {
    // Default configuration
    const defaultConfig: AIServiceConfig = {
      apiKey: process.env.AI_API_KEY || '',
      apiEndpoint: process.env.AI_API_ENDPOINT || '',
      defaultModel: process.env.AI_DEFAULT_MODEL || 'gpt-4o',
      temperature: 0.7,
      maxTokens: 1024,
      useCache: true,
    }

    const mergedConfig = {
      ...defaultConfig,
      ...config,
    } as AIServiceConfig

    aiServiceInstance = new AIService(mergedConfig)
  }

  return aiServiceInstance
}
