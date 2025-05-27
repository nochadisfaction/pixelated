import type { AIMessage } from '../../models/ai-types'

export interface CompletionOptions {
  model?: string
  temperature?: number
  max_tokens?: number
  system_prompt?: string
  stream?: boolean
  frequency_penalty?: number
  presence_penalty?: number
  top_p?: number
  top_k?: number
  stop_sequences?: string[]
}

export interface AICompletionResponse {
  id: string
  model: string
  created: number
  content?: string
  message?: { role: string; content: string }
  choices?: { message: { role: string; content: string } }[]
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  provider: string
}

export interface ModelInfo {
  id: string
  name: string
  provider: string
  contextWindow: number
  maxTokens: number
  tokenCostInput?: number
  tokenCostOutput?: number
  features?: string[]
  capabilities?: string[]
}

export interface AIStreamChunk {
  id: string
  model: string
  created: number
  content?: string
  delta?: { content: string }
  choices?: { delta: { content: string } }[]
  isComplete?: boolean
}

export interface AIService {
  generateCompletion: (
    messages: AIMessage[],
    options: CompletionOptions,
  ) => Promise<AICompletionResponse>
  createChatCompletion: (
    messages: AIMessage[],
    options: CompletionOptions,
  ) => Promise<AICompletionResponse>
  createStreamingChatCompletion?: (
    messages: AIMessage[],
    options: CompletionOptions,
  ) => Promise<AsyncGenerator<AIStreamChunk, void, void>>
  getModelInfo?: (modelId: string) => Promise<ModelInfo>
  createChatCompletionWithTracking?: (
    messages: AIMessage[],
    options: CompletionOptions,
  ) => Promise<AICompletionResponse>
  dispose?: () => void
}
