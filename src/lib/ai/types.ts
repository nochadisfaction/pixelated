import type { ReadableStream } from 'node:stream/web'
// Re-export types from models
export * from './models/ai-types'

export type AIProvider =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'azure'
  | 'deepseek'
  | 'together'
  | 'local'

export interface AIModel {
  id: string
  name: string
  provider: AIProvider
  maxTokens: number
  contextWindow: number
}

export interface AIModelResponse {
  model: string
  choices: {
    message?: {
      content: string
    }
  }[]
  usage?: {
    totalTokens: number
    promptTokens: number
    completionTokens: number
  }
  error?: string
}

// Message type for AI conversations
export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
  name?: string
}

// AI service configuration
export interface AIServiceConfig {
  model: string
  temperature?: number
  maxResponseTokens?: number
}

// Token usage information
export interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

// AI service response
export interface AIServiceResponse {
  content: string
  usage?: TokenUsage
  model: string
}

/**
 * Response Generation Config
 */
export interface ResponseGenerationConfig {
  aiService: AIService
  model?: string
  temperature?: number
  maxResponseTokens?: number
  systemPrompt?: string
}

/**
 * Response Generation result
 */
export interface ResponseGenerationResult {
  content: string
  usage?: TokenUsage
  aiService?: AIService
  model?: string
  temperature?: number
  maxResponseTokens?: number
  systemPrompt?: string
}

// Sentiment analysis result
export interface SentimentAnalysisResult {
  sentiment: 'positive' | 'negative' | 'neutral'
  score: number
  confidence: number
  content: string
  usage?: TokenUsage
}

// Crisis detection result
export interface CrisisDetectionResult {
  isCrisis: boolean
  severity: 'none' | 'low' | 'medium' | 'high' | 'severe'
  confidence: number
  category?: string
  recommendedAction?: string
  content: string
  usage?: TokenUsage
}

// Intervention analysis result
export interface InterventionAnalysisResult {
  effectiveness: number
  strengths: string[]
  weaknesses: string[]
  suggestions: string[]
  content: string
  usage?: TokenUsage
}

export interface ResponseGenerationOptions {
  temperature?: number
  maxResponseTokens?: number
  instructions?: string
}

/**
 * Sentiment Analysis result
 */
export interface SentimentResult {
  sentiment: 'positive' | 'negative' | 'neutral'
  score: number
  confidence: number
  content: string
  usage?: TokenUsage
}

/**
 * Extended AI Message Type for flexible roles
 */
export interface ExtendedAIMessage {
  role: string
  content: string
  name?: string
}

/**
 * AI Service Options
 */
export interface AIServiceOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  skipCache?: boolean
  togetherApiKey?: string
  userId?: string
  sessionId?: string
}

/**
 * AI Completion Response
 */
export interface AICompletionResponse {
  id: string
  model: string
  created: number
  content: string
  choices: {
    message: {
      role: string
      content: string
      name?: string
    }
    finishReason?: string
  }[]
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

/**
 * AI Stream Chunk
 */
export interface AIStreamChunk {
  id: string
  created: number
  model: string
  content: string
  choices: {
    delta: {
      content: string
    }
    finishReason?: string | null
  }[]
}

/**
 * AI Usage Record
 */
export interface AIUsageRecord {
  timestamp: number
  model: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  id: string
  provider: AIProvider
  cost?: number
}

/**
 * Model information returned by getModelInfo
 */
export interface AIModelInfo {
  id: string
  name: string
  provider: AIProvider
  contextWindow: number
  maxTokens: number
  tokenCostInput?: number
  tokenCostOutput?: number
  features?: string[]
  capabilities?: {
    streaming?: boolean
    json?: boolean
    functionCalling?: boolean
    tools?: boolean
    vision?: boolean
  }
  training?: {
    cutoffDate?: string
  }
  [key: string]: unknown
}

/**
 * AI Service Interface
 */
export interface AIService {
  createChatCompletion: (
    messages: AIMessage[],
    options?: AIServiceOptions,
  ) => Promise<AICompletionResponse>

  createStreamingChatCompletion: (
    messages: AIMessage[],
    options?: AIServiceOptions,
  ) => Promise<ReadableStream<AIStreamChunk>>

  getModelInfo: (model: string) => AIModelInfo

  createChatCompletionWithTracking: (
    messages: AIMessage[],
    options?: AIServiceOptions,
  ) => Promise<AICompletionResponse>

  generateCompletion: (
    messages: AIMessage[],
    options?: AIServiceOptions,
  ) => Promise<AICompletionResponse>

  dispose: () => void
}

/**
 * AI Completion Request
 */
export interface AICompletionRequest {
  messages: AIMessage[]
  model: string
  temperature?: number
  maxTokens?: number
}

/**
 * AI Error
 */
export interface AIError {
  message: string
  type: string
  param: string | null
  code: number
}

export type MentalHealthAnalysis = {
  // Core assessment fields
  emotionalState: string
  cognitivePatternsIdentified: string[]
  therapeuticRecommendations: string[]

  // Risk and protective factors
  riskFactors?: string[]
  strengths?: string[]

  // Additional clinical data
  primaryConcerns?: string[]
  copingMechanisms?: string[]
  behavioralObservations?: string[]

  // Treatment tracking
  sessionProgress?: string
  treatmentGoals?: string[]

  // Metadata
  assessmentTimestamp?: string
  confidenceScore?: number // 0-1 reflecting AI confidence in assessment
}

export type ClinicalNote = {
  id: string
  timestamp: string
  content: string
  tags: string[]
  associatedSession?: string
}

export type TherapeuticScenario = {
  id: string
  title: string
  description: string
  clientBackground: string
  presentingIssues: string[]
  preloadedMessages?: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
}

export interface AIRequest {
  // ... properties of an AI request
  prompt: string
  userId?: string
  sessionId?: string
  metadata?: Record<string, unknown>
  // ... other relevant fields
}

export interface AIResponse {
  // ... properties of an AI response
  text: string
  confidence?: number
  error?: string
  metadata?: Record<string, unknown>
  // ... other relevant fields
}
