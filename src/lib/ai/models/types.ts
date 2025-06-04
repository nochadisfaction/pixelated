// This file is deprecated and should be removed.
// Please use models/types.ts instead.
// This file is only kept temporarily for backward compatibility

// Re-export from models/types.ts to maintain compatibility
export * from './types.js'

/**
 * AI Provider types
 */
export enum AIProvider {
  OpenAI = 'openai',
  Anthropic = 'anthropic',
  Together = 'together',
  Nebius = 'nebius',
}

/**
 * AI Model types
 */
export interface AIModel {
  id: string
  name: string
  provider: AIProvider
  capabilities: (
    | 'chat'
    | 'sentiment'
    | 'crisis'
    | 'response'
    | 'intervention'
  )[]
  contextWindow: number
  maxTokens: number
  togetherModelId?: string
  costPer1KTokens?: {
    input: number
    output: number
  }
}

export enum AIModelType {
  Chat = 'chat',
  Completion = 'completion',
}

export enum AICapability {
  Chat = 'chat',
  Completion = 'completion',
  Sentiment = 'sentiment',
  Crisis = 'crisis',
  Response = 'response',
  Intervention = 'intervention',
}

export type ModelCapability =
  | 'chat'
  | 'completion'
  | 'embedding'
  | 'function-calling'
  | 'vision'
  | 'streaming'

/**
 * Message types
 */
export type AIRole = 'system' | 'user' | 'assistant' | 'function'

export interface AIMessage {
  role: AIRole
  content: string
  name?: string
  functionCall?: {
    name: string
    arguments: string
  }
}

/**
 * Request types
 */
export interface AICompletionRequest {
  model: string
  messages: AIMessage[]
  temperature?: number
  maxTokens?: number
  functions?: AIFunction[]
  functionCall?: 'auto' | 'none' | { name: string }
}

export interface AIFunction {
  name: string
  description?: string
  parameters: {
    type: 'object'
    properties: Record<
      string,
      {
        type: string
        description?: string
        enum?: string[]
      }
    >
    required?: string[]
  }
}

/**
 * Response types
 */
export interface AICompletionResponse {
  id: string
  model: string
  provider: AIProvider
  created: number
  content: string
  choices: {
    message?: AIMessage
    finishReason?: string
  }[]
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  functionCall?: {
    name: string
    arguments: string
  }
}

/**
 * Streaming response types
 */
export interface AIStreamChunk {
  id: string
  model: string
  provider: string
  isComplete: boolean
  choices: {
    message: AIMessage
    finishReason?: string
  }[]
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

/**
 * Error types
 */
export interface AIError {
  message: string
  type:
    | 'rate_limit'
    | 'invalid_request'
    | 'authentication'
    | 'server'
    | 'timeout'
    | 'unknown'
  provider: AIProvider
  status?: number
  retryAfter?: number
}

/**
 * Sentiment analysis types
 */
export interface SentimentResult {
  score: number // -1 to 1, where -1 is very negative, 1 is very positive
  label: 'negative' | 'neutral' | 'positive'
  confidence: number // 0 to 1
  emotions?: Record<string, number> // Optional map of emotions to scores (0-1)
}

/**
 * Crisis detection types
 */
export interface CrisisDetectionResult {
  isCrisis: boolean
  confidence: number // 0 to 1
  category?: string // Optional category of crisis (e.g., "self-harm", "suicide", "abuse")
  severity?: 'none' | 'low' | 'medium' | 'high' | 'severe'
  recommendedAction?: string
}

/**
 * Usage tracking types
 */
export interface AIUsageRecord {
  id: string
  userId: string
  model: string
  provider: AIProvider
  promptTokens: number
  completionTokens: number
  totalTokens: number
  estimatedCost: number
  timestamp: number
  conversationId?: string
  messageId?: string
  latencyMs?: number
  processingTimeMs?: number
}

/**
 * Response Generation Types
 */
export interface ResponseGenerationResult {
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  content: string
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

/**
 * Service Response Types
 */
export interface AIServiceResponse {
  content: string
  model: string
  provider: AIProvider
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
    processingTimeMs: number
  }
}

/**
 * Sentiment Analysis Types
 */
export interface SentimentAnalysisResult {
  score: number
  label: 'negative' | 'neutral' | 'positive'
  confidence: number
  emotions?: Record<string, number>
}

/**
 * Model information returned by getModelInfo
 */
export interface ModelInfo {
  id: string
  name: string
  provider: AIProvider
  type: AIModelType
  contextWindow: number
  maxTokens: number
  capabilities: AICapability[]
  pricing: {
    input: number
    output: number
    unit: 'token' | 'char'
    currency: 'USD'
  }
  parameters: {
    temperature: number
    topP: number
    frequencyPenalty: number
    presencePenalty: number
  }
}

/**
 * AI Service Types
 */
export interface AIService {
  getModelInfo: (model: string) => ModelInfo
  createChatCompletion: (
    messages: AIMessage[],
    options?: AIStreamOptions,
  ) => Promise<AICompletionResponse>
  createChatStream: (
    messages: AIMessage[],
    options?: AIStreamOptions,
  ) => ReadableStream<AIStreamChunk>
}

/**
 * AI Service Options
 */
export interface AIServiceOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
  userId?: string
}

export interface AIStreamOptions {
  temperature?: number
  maxTokens?: number
  stopSequences?: string[]
  model?: string
}
