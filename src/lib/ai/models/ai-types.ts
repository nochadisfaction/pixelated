// This file is deprecated and should be removed.
// Please use models/types.ts instead.
// This file is only kept temporarily for backward compatibility

/**
 * AI Provider types
 */
export type AIProvider =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'azure'
  | 'deepseek'
  | 'together'
  | 'local'

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

/**
 * AI Message types
 */
export interface AIMessage {
  role: 'system' | 'user' | 'assistant' | 'function'
  content: string
  name?: string
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
 * AI Completion Response
 */
export interface AICompletionResponse {
  provider: AIProvider
  id: string
  model: string
  created: number
  content: string
  choices?: {
    message?: AIMessage
    finishReason?: string
  }[]
  usage?: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
  }
}

/**
 * AI Stream Chunk
 */
export interface AIStreamChunk {
  id: string
  model: string
  created: number
  content: string
  choices?: {
    delta?: {
      role?: string
      content?: string
    }
    finishReason?: string | null
  }[]
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
 * AI Service Options
 */
export interface AIServiceOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
  userId?: string
  sessionId?: string
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
  ) => Promise<AsyncGenerator<AIStreamChunk, void, void>>
  getModelInfo: (model: string) => AIModel | null
  createChatCompletionWithTracking: (
    messages: AIMessage[],
    options?: AIServiceOptions,
  ) => Promise<AICompletionResponse>
  generateCompletion: (
    messages: AIMessage[],
    options: AIServiceOptions,
    provider: AIProvider,
  ) => Promise<AICompletionResponse | ReadableStream<AIStreamChunk>>
  dispose: () => void
}

/**
 * AI Service Response
 */
export interface AIServiceResponse {
  content: string
  model: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export interface ModelInfo {
  name: string
  provider: string
  type: string
  contextWindow: number
  maxTokens: number
  capabilities: string[]
  pricing?: {
    input: number
    output: number
  }
  parameters?: Record<string, unknown>
}
