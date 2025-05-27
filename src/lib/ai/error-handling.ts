import type { ReadableStream } from 'node:stream/web'
import type {
  AICompletionResponse,
  AIMessage,
  AIServiceOptions,
  AIStreamChunk,
  ModelInfo,
} from './models/ai-types'
import { createAuditLog } from '../audit/log'

/**
 * Standard error types for AI service operations
 */
export enum AIErrorType {
  VALIDATION = 'validation_error',
  AUTHENTICATION = 'authentication_error',
  AUTHORIZATION = 'authorization_error',
  RATE_LIMIT = 'rate_limit_error',
  PROVIDER = 'provider_error',
  MODEL = 'model_error',
  INPUT = 'input_error',
  SYSTEM = 'system_error',
  INVALID_RESPONSE = 'invalid_response_error',
  UNKNOWN = 'unknown_error',
}

/**
 * Interface for the AI service
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
  generateStreamingCompletion: (
    messages: AIMessage[],
    options?: AIServiceOptions,
  ) => Promise<ReadableStream<AIStreamChunk>>
  getModelInfo: (model: string) => ModelInfo
}

/**
 * AI Error details type
 */
export interface AIErrorDetails {
  originalError?: string
  stack?: string
  context?: Record<string, unknown>
  [key: string]: unknown
}

/**
 * Context for AI error handling
 */
export interface AIErrorContext extends Record<string, unknown> {
  model?: string
  messageCount?: number
  streaming?: boolean
}

/**
 * Custom error class for AI service errors
 */
export class AIError extends Error {
  type: AIErrorType
  status: number
  details?: AIErrorDetails

  constructor(
    message: string,
    type: AIErrorType = AIErrorType.UNKNOWN,
    status?: number,
    details?: AIErrorDetails,
  ) {
    super(message)
    this.name = 'AIError'
    this.type = type
    this.status = status || errorTypeToStatusCode[type] || 500
    this.details = details
  }
}

/**
 * Maps standard error types to HTTP status codes
 */
const errorTypeToStatusCode: Record<AIErrorType, number> = {
  [AIErrorType.VALIDATION]: 400,
  [AIErrorType.AUTHENTICATION]: 401,
  [AIErrorType.AUTHORIZATION]: 403,
  [AIErrorType.RATE_LIMIT]: 429,
  [AIErrorType.PROVIDER]: 502,
  [AIErrorType.MODEL]: 404,
  [AIErrorType.INPUT]: 400,
  [AIErrorType.SYSTEM]: 500,
  [AIErrorType.INVALID_RESPONSE]: 500,
  [AIErrorType.UNKNOWN]: 500,
}

/**
 * Error codes for AI-related errors
 */
export const AIErrorCodes = {
  // Service errors
  SERVICE_UNAVAILABLE: 'ai.service_unavailable',
  RATE_LIMITED: 'ai.rate_limited',
  TIMEOUT: 'ai.timeout',
  INVALID_RESPONSE: 'ai.invalid_response',

  // Request errors
  INVALID_REQUEST: 'ai.invalid_request',
  INVALID_MODEL: 'ai.invalid_model',
  CONTENT_FILTERED: 'ai.contenttt_filtered',
  TOKEN_LIMIT_EXCEEDED: 'ai.token_limit_exceeded',

  // Authentication errors
  AUTHENTICATION_ERROR: 'ai.authentication_error',
  AUTHORIZATION_ERROR: 'ai.authorization_error',

  // Internal errors
  INTERNAL_ERROR: 'ai.internal_error',
  UNEXPECTED_ERROR: 'ai.unexpected_error',
}

/**
 * Handles errors from AI services and transforms them into standardized AIErrors
 */
export function handleAIServiceError(
  error: unknown,
  context?: Record<string, unknown>,
): AIError {
  // If it's already an AIError, just return i
  if (error instanceof AIError) {
    return error
  }

  // Convert to Error if it's not already
  const originalError =
    error instanceof Error ? error : new Error(String(error))

  // Default error
  let aiError = new AIError(
    'An unexpected error occurred with the AI service',
    AIErrorType.SYSTEM,
    500,
    {
      originalError: originalError.message,
      stack: originalError.stack,
      context,
    },
  )

  // Handle AI provider specific errors
  if (originalError.message.includes('Request timed out')) {
    aiError = new AIError(
      'The AI service request timed out',
      AIErrorType.SYSTEM,
      504,
      {
        originalError: originalError.message,
        stack: originalError.stack,
        context,
      },
    )
  } else if (originalError.message.includes('Rate limit')) {
    aiError = new AIError(
      'The AI service rate limit has been exceeded',
      AIErrorType.RATE_LIMIT,
      429,
      {
        originalError: originalError.message,
        stack: originalError.stack,
        context,
      },
    )
  } else if (originalError.message.includes('content filter')) {
    aiError = new AIError(
      'The content was filtered by the AI service safety system',
      AIErrorType.VALIDATION,
      400,
      {
        originalError: originalError.message,
        stack: originalError.stack,
        context,
      },
    )
  } else if (originalError.message.includes('token limit')) {
    aiError = new AIError(
      'The token limit was exceeded for this request',
      AIErrorType.INPUT,
      400,
      {
        originalError: originalError.message,
        stack: originalError.stack,
        context,
      },
    )
  } else if (originalError.message.includes('authentication')) {
    aiError = new AIError(
      'Authentication failed with the AI service',
      AIErrorType.AUTHENTICATION,
      401,
      {
        originalError: originalError.message,
        stack: originalError.stack,
        context,
      },
    )
  } else if (
    originalError.message.includes('not available') ||
    originalError.message.includes('unavailable')
  ) {
    aiError = new AIError(
      'The AI service is currently unavailable',
      AIErrorType.PROVIDER,
      503,
      {
        originalError: originalError.message,
        stack: originalError.stack,
        context,
      },
    )
  } else if (originalError.message.includes('invalid model')) {
    aiError = new AIError(
      'The specified AI model is invalid or not available',
      AIErrorType.MODEL,
      400,
      {
        originalError: originalError.message,
        stack: originalError.stack,
        context,
      },
    )
  }

  // Log the error
  console.error('[AI Error]', {
    type: aiError.type,
    message: aiError.message,
    originalError: aiError.details?.originalError,
    stack: aiError.details?.stack,
    context,
  })

  return aiError
}

/**
 * Creates a wrapped version of an AI service with error handling
 */
export function createErrorHandlingAIService(aiService: AIService): AIService {
  return {
    createChatCompletion: async (
      messages: AIMessage[],
      options?: AIServiceOptions,
    ) => {
      try {
        return await aiService.createChatCompletion(messages, options)
      } catch (error) {
        const context = {
          model: options?.model,
          messageCount: messages.length,
        }

        // Create audit log for the error
        await createAuditLog(
          typeof error === 'object' && error !== null && 'id' in error
            ? String(error.id)
            : 'system',
          'ai_error',
          typeof error === 'object' && error !== null && 'id' in error
            ? String(error.id)
            : 'unknown',
          {
            message: 'An unexpected error occurred with the AI service',
            originalError:
              error instanceof Error ? error.message : String(error),
            metadata: {
              ...context,
            },
          },
        )

        handleStreamError(error, context)

        if (error instanceof Error) {
          throw handleAIServiceError(error, context)
        }
        throw new Error('Unknown error occurred')
      }
    },

    createStreamingChatCompletion: async (
      messages: AIMessage[],
      options?: AIServiceOptions,
    ) => {
      try {
        return await aiService.createStreamingChatCompletion(messages, options)
      } catch (error) {
        const context = {
          model: options?.model,
          messageCount: messages.length,
          streaming: true,
        }

        // Create audit log for the error
        await createAuditLog(
          typeof error === 'object' && error !== null && 'id' in error
            ? String(error.id)
            : 'system',
          'ai_error',
          typeof error === 'object' && error !== null && 'id' in error
            ? String(error.id)
            : 'unknown',
          {
            message: 'An unexpected error occurred with the AI service',
            originalError:
              error instanceof Error ? error.message : String(error),
            metadata: {
              ...context,
            },
          },
        )

        handleStreamError(error, context)

        if (error instanceof Error) {
          throw handleAIServiceError(error, context)
        }
        throw new Error('Unknown error occurred')
      }
    },

    generateStreamingCompletion: async (
      messages: AIMessage[],
      options?: AIServiceOptions,
    ) => {
      try {
        return await aiService.generateStreamingCompletion(messages, options)
      } catch (error) {
        const context = {
          model: options?.model,
          messageCount: messages.length,
          streaming: true,
        }

        // Create audit log for the error
        await createAuditLog(
          typeof error === 'object' && error !== null && 'id' in error
            ? String(error.id)
            : 'system',
          'ai_error',
          typeof error === 'object' && error !== null && 'id' in error
            ? String(error.id)
            : 'unknown',
          {
            message: 'An unexpected error occurred with the AI service',
            originalError:
              error instanceof Error ? error.message : String(error),
            metadata: {
              ...context,
            },
          },
        )

        handleStreamError(error, context)

        if (error instanceof Error) {
          throw handleAIServiceError(error, context)
        }
        throw new Error('Unknown error occurred')
      }
    },

    getModelInfo: (model: string) => {
      try {
        return aiService.getModelInfo(model)
      } catch (error) {
        const context = { model }
        if (error instanceof Error) {
          throw handleAIServiceError(error, context)
        }
        throw new Error('Unknown error occurred')
      }
    },
  }
}

/**
 * Safely parses JSON from AI responses, handling common issues
 */
export function safeJsonParse<T>(jsonString: string): T {
  try {
    // Try to parse the JSON directly
    return JSON.parse(jsonString) as T
  } catch (error) {
    // If direct parsing fails, try to extract JSON from markdown code blocks
    const jsonRegex = /```(?:json)?\s*([\s\S]*?)\s*```/
    const match = jsonString.match(jsonRegex)

    if (match && match[1]) {
      try {
        return JSON.parse(match[1]) as T
      } catch (innerError) {
        throw new AIError(
          'Failed to parse JSON from AI response',
          AIErrorType.INVALID_RESPONSE,
          500,
          {
            response: jsonString,
            originalError:
              innerError instanceof Error
                ? innerError.message
                : String(innerError),
          },
        )
      }
    }

    // If no JSON code block found, throw the original error
    throw new AIError(
      'Failed to parse JSON from AI response',
      AIErrorType.INVALID_RESPONSE,
      500,
      {
        response: jsonString,
        originalError: error instanceof Error ? error.message : String(error),
      },
    )
  }
}

/**
 * Validates that a parsed JSON object has the expected structure
 */
export function validateJsonResponse<T>(
  data: unknown,
  validator: (data: unknown) => data is T,
  errorMessage = 'Invalid response structure from AI service',
): T {
  if (!validator(data)) {
    throw new AIError(errorMessage, AIErrorType.INVALID_RESPONSE, 500, {
      data,
    })
  }
  return data
}

/**
 * Retries an async function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number
    initialDelay?: number
    maxDelay?: number
    factor?: number
    retryableErrors?: string[]
  } = {},
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 500,
    maxDelay = 10000,
    factor = 2,
    retryableErrors = [
      AIErrorCodes.SERVICE_UNAVAILABLE,
      AIErrorCodes.RATE_LIMITED,
      AIErrorCodes.TIMEOUT,
    ],
  } = options

  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries + 1; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Check if we should retry based on the error code
      const shouldRetry =
        attempt < maxRetries &&
        error instanceof AIError &&
        retryableErrors.includes(error?.type.toString())

      if (!shouldRetry) {
        throw error
      }

      // Calculate delay with exponential backoff and jitter
      const delay = Math.min(
        initialDelay * factor ** attempt + Math.random() * 100,
        maxDelay,
      )

      console.warn(
        `AI service request failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`,
        {
          error: lastError.message,
          attempt: attempt + 1,
          maxRetries,
        },
      )

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  // This should never happen due to the throw in the loop, but TypeScript needs i
  throw lastError
}

/**
 * Handles API errors and returns appropriate HTTP responses
 */
export function handleApiError(error: unknown): Response {
  // Handle AIError instances
  if (error instanceof AIError) {
    return new Response(
      JSON.stringify({
        error: error?.type,
        message: error?.message,
        details: error?.details,
      }),
      {
        status: error?.status,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  }

  // Handle rate limit errors from middleware
  interface RateLimitError {
    type: string
    retryAfter: number
  }

  if (
    error &&
    typeof error === 'object' &&
    'type' in error &&
    error?.type === 'rate_limit_exceeded'
  ) {
    const rateLimitError = error as RateLimitError
    return new Response(
      JSON.stringify({
        error: AIErrorType.RATE_LIMIT,
        message: 'Rate limit exceeded',
        details: {
          retryAfter: rateLimitError.retryAfter,
        },
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(rateLimitError.retryAfter || 60),
        },
      },
    )
  }

  // Handle TypeError and network-related errors
  if (error instanceof TypeError) {
    return new Response(
      JSON.stringify({
        error: AIErrorType.SYSTEM,
        message: 'Network or system error',
        details: error?.message,
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  }

  // Handle generic errors
  return new Response(
    JSON.stringify({
      error: AIErrorType.UNKNOWN,
      message:
        error instanceof Error ? error?.message : 'An unknown error occurred',
    }),
    {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    },
  )
}

/**
 * Creates a standardized AI error
 */
export function createAIError(
  message: string,
  type: AIErrorType = AIErrorType.UNKNOWN,
  details?: AIErrorDetails,
): AIError {
  const status = errorTypeToStatusCode[type] || 500
  return new AIError(message, type, status, details)
}

/**
 * Handles errors from AI streams
 */
export function handleStreamError(
  error: unknown,
  context: AIErrorContext = {},
): never {
  if (error instanceof Error) {
    throw handleAIServiceError(error, context)
  }
  throw new Error('Unknown error occurred')
}
