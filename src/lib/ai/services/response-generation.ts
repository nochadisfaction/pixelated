import type { ReadableStream } from 'node:stream/web'
import type {
  AICompletionResponse,
  AIMessage,
  AIService,
  AIServiceResponse,
  AIStreamChunk,
} from '~/lib/ai/models/ai-types'
import { getLogger } from '../../logging'

// Initialize logger for PHI audit logging
const logger = getLogger({ prefix: 'phi-audit' })

/**
 * Response Generation Result interface
 */
export interface ResponseGenerationResult {
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  content: string
  metadata?: {
    model?: string
    tokensUsed?: number
  }
  aiService?: AIService
  model?: string
  temperature?: number
  maxResponseTokens?: number
  systemPrompt?: string
}

/**
 * Response Generation Service Configuration
 */
export interface ResponseGenerationConfig {
  aiService: AIService
  model?: string
  temperature?: number
  maxResponseTokens?: number
  systemPrompt?: string
}

/**
 * Type guard to check if response is AICompletionResponse
 */
function isAICompletionResponse(
  response: AICompletionResponse | ReadableStream<AIStreamChunk>,
): response is AICompletionResponse {
  return 'choices' in response
}

/**
 * Response Generation Service Implementation
 */
export class ResponseGenerationService {
  private aiService: AIService
  private model: string
  private temperature: number
  private maxResponseTokens: number
  private systemPrompt: string

  constructor(config: ResponseGenerationConfig) {
    this.aiService = config.aiService
    this.model = config.model || 'mistralai/Mixtral-8x7B-Instruct-v0.2'
    this.temperature = config.temperature || 0.7
    this.maxResponseTokens = config.maxResponseTokens || 1024
    this.systemPrompt =
      config.systemPrompt ||
      `You are a supportive and empathetic assistant. Your responses should:
      - Supportive without being judgmental
      - Empathetic and understanding
      - Clear and concise
      - Helpful and informative

      Avoid:
      - Giving medical or legal advice
      - Using clichés or platitudes

      Focus on validating the user's feelings and providing supportive, thoughtful responses.`

    // Log initialization for audit trail
    logger.info('ResponseGenerationService initialized', {
      component: 'ResponseGenerationService',
      model: this.model,
      action: 'initialize',
    })
  }

  /**
   * Generate a response from messages
   */
  async generateResponseFromMessages(
    messages: AIMessage[],
    instructions?: string,
  ): Promise<AIServiceResponse> {
    // Add system instructions if provided
    const messagesWithInstructions = [...messages]
    if (instructions) {
      messagesWithInstructions.unshift({
        role: 'system',
        content: instructions,
        name: '',
      })
    }

    // Audit log for generating response from messages
    logger.info('Generating response from messages', {
      messageCount: messages.length,
      hasInstructions: !!instructions,
      model: this.model,
      action: 'generate_response_from_messages',
    })

    const response = await this.aiService.createChatCompletion(
      messagesWithInstructions,
      {
        model: this.model,
        temperature: this.temperature,
        maxTokens: this.maxResponseTokens,
      },
    )

    if (!isAICompletionResponse(response)) {
      logger.error(
        'Response generation failed - expected completion but got stream',
        {
          action: 'generate_response_failed',
        },
      )
      throw new Error('Expected completion response but got stream')
    }

    // Ensure we have a valid response
    if (!response.choices?.[0]?.message?.content) {
      logger.error(
        'Response generation failed - invalid response missing content',
        {
          action: 'generate_response_failed',
        },
      )
      throw new Error('Invalid response: missing content')
    }

    // Use type assertion after validation
    const { content } = response.choices[0].message
    const model = response.model || this.model

    // Create usage object with safe defaults
    const usage = {
      promptTokens: Number(response.usage?.promptTokens) || 0,
      completionTokens: Number(response.usage?.completionTokens) || 0,
      totalTokens: Number(response.usage?.totalTokens) || 0,
    }

    // Audit log for successful response generation
    logger.info('Response generated successfully', {
      model,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
      action: 'generate_response_success',
    })

    return {
      content,
      model,
      usage,
    }
  }

  /**
   * Generate a response from current message and previous messages
   */
  async generateResponse(
    currentMessage: string,
    previousMessages: AIMessage[] = [],
    instructions?: string,
  ): Promise<AIServiceResponse> {
    // Format messages
    const messages = [...previousMessages]

    // Add system instructions if provided
    if (instructions) {
      messages.unshift({
        role: 'system',
        content: instructions,
        name: '',
      })
    }

    // Add current message
    messages.push({
      role: 'user',
      content: currentMessage,
      name: '',
    })

    // Audit log for generating response
    logger.info('Generating response to message', {
      previousMessageCount: previousMessages.length,
      hasInstructions: !!instructions,
      model: this.model,
      action: 'generate_response',
    })

    return this.generateResponseFromMessages(messages)
  }

  /**
   * Generate a response to a conversation
   */
  async generateResponseToConversation(
    messages: AIMessage[],
    options?: {
      temperature?: number
      maxResponseTokens?: number
      systemPrompt?: string
    },
  ): Promise<ResponseGenerationResult> {
    const temperature = options?.temperature ?? this.temperature
    const maxTokens = options?.maxResponseTokens ?? this.maxResponseTokens
    const systemPrompt = options?.systemPrompt ?? this.systemPrompt

    // Audit log for generating response to conversation
    logger.info('Generating response to conversation', {
      messageCount: messages.length,
      model: this.model,
      temperature,
      maxTokens,
      action: 'generate_response_to_conversation',
    })

    // Ensure the first message is a system message with our prompt
    const messagesWithSystem = [...messages]
    if (
      messagesWithSystem.length === 0 ||
      messagesWithSystem[0].role !== 'system'
    ) {
      messagesWithSystem.unshift({
        role: 'system',
        content: systemPrompt,
        name: '',
      })
    } else {
      messagesWithSystem[0] = {
        role: 'system',
        content: systemPrompt,
        name: '',
      }
    }

    const response = await this.aiService.createChatCompletion(
      messagesWithSystem,
      {
        model: this.model,
        temperature,
        maxTokens,
      },
    )

    if (!isAICompletionResponse(response)) {
      logger.error(
        'Response generation failed - expected completion but got stream',
        {
          action: 'generate_response_to_conversation_failed',
        },
      )
      throw new Error('Expected completion response but got stream')
    }

    // Ensure we have a valid response
    if (!response.choices?.[0]?.message?.content) {
      logger.error(
        'Response generation failed - invalid response missing content',
        {
          action: 'generate_response_to_conversation_failed',
        },
      )
      throw new Error('Invalid response: missing content')
    }

    const { content } = response.choices[0].message
    const tokensUsed =
      (response.usage?.promptTokens || 0) +
      (response.usage?.completionTokens || 0)

    // Audit log for successful response generation
    logger.info('Response to conversation generated successfully', {
      model: response.model || this.model,
      tokensUsed,
      action: 'generate_response_to_conversation_success',
    })

    return {
      content,
      usage: {
        promptTokens: response.usage?.promptTokens || 0,
        completionTokens: response.usage?.completionTokens || 0,
        totalTokens: response.usage?.totalTokens || 0,
      },
      metadata: {
        model: response.model || this.model,
        tokensUsed,
      },
      aiService: this.aiService,
      model: this.model,
      temperature,
      maxResponseTokens: this.maxResponseTokens,
      systemPrompt,
    }
  }

  /**
   * Generate a response with specific instructions
   */
  async generateResponseWithInstructions(
    messages: AIMessage[],
    instructions: string,
    options?: {
      temperature?: number
      maxResponseTokens?: number
    },
  ): Promise<ResponseGenerationResult> {
    // Combine system prompt with instructions
    const systemPrompt = `${this.systemPrompt}\n\n${instructions}`

    // Audit log for generating response with instructions
    logger.info('Generating response with specific instructions', {
      messageCount: messages.length,
      model: this.model,
      action: 'generate_response_with_instructions',
    })

    return this.generateResponseToConversation(messages, {
      ...options,
      systemPrompt,
    })
  }

  /**
   * Generate a streaming response
   */
  async generateStreamingResponse(
    messages: AIMessage[],
    onChunk: (chunk: string) => void,
    options?: {
      temperature?: number
      maxResponseTokens?: number
      systemPrompt?: string
    },
  ): Promise<ResponseGenerationResult> {
    const temperature = options?.temperature ?? this.temperature
    const maxTokens = options?.maxResponseTokens ?? this.maxResponseTokens
    const systemPrompt = options?.systemPrompt ?? this.systemPrompt

    // Audit log for generating streaming response
    logger.info('Generating streaming response', {
      messageCount: messages.length,
      model: this.model,
      temperature,
      maxTokens,
      action: 'generate_streaming_response',
    })

    // Ensure the first message is a system message with our prompt
    const messagesWithSystem = [...messages]
    if (
      messagesWithSystem.length === 0 ||
      messagesWithSystem[0].role !== 'system'
    ) {
      messagesWithSystem.unshift({
        role: 'system',
        content: systemPrompt,
        name: '',
      })
    }

    const responseStream = await this.aiService.createChatCompletionStream(
      messagesWithSystem,
      {
        model: this.model,
        temperature,
        maxTokens,
      },
    )

    if (isAICompletionResponse(responseStream)) {
      logger.error(
        'Response generation failed - expected stream but got completion',
        {
          action: 'generate_streaming_response_failed',
        },
      )
      throw new Error('Expected stream response but got completion')
    }

    // Process stream and invoke callback with each chunk
    let combinedContent = ''
    let usageInfo = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    }
    let modelName = this.model

    try {
      const reader = responseStream.getReader()

      let done = false
      while (!done) {
        const { value, done: readerDone } = await reader.read()
        done = readerDone

        if (value) {
          const chunk = value as AIStreamChunk
          if (chunk.choices?.[0]?.delta?.content) {
            const { content } = chunk.choices[0].delta
            combinedContent += content
            onChunk(content)
          }

          // Update usage if available
          if (chunk.usage) {
            usageInfo = {
              promptTokens: chunk.usage.promptTokens || 0,
              completionTokens: chunk.usage.completionTokens || 0,
              totalTokens: chunk.usage.totalTokens || 0,
            }
          }

          // Update model if available
          if (chunk.model) {
            modelName = chunk.model
          }
        }
      }

      // Audit log for successful streaming response generation
      logger.info('Streaming response generated successfully', {
        model: modelName,
        contentLength: combinedContent.length,
        tokensUsed: usageInfo.totalTokens,
        action: 'generate_streaming_response_success',
      })
    } catch (error) {
      logger.error('Error generating streaming response', {
        error: error instanceof Error ? error.message : String(error),
        action: 'generate_streaming_response_error',
      })
      throw error
    }

    return {
      content: combinedContent,
      usage: usageInfo,
      metadata: {
        model: modelName,
        tokensUsed: usageInfo.totalTokens,
      },
      aiService: this.aiService,
      model: modelName,
      temperature,
      maxResponseTokens: maxTokens,
      systemPrompt,
    }
  }
}
