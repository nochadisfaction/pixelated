import type { AIMessage } from '@/lib/ai/models/types'
import type { AuditMetadata } from '@/lib/audit/log'
import type { SessionData } from '../../../lib/auth/session'
import { createAuditLog } from '@/lib/audit/log'
import { handleApiError } from '../../../lib/ai/error-handling'
import { createTogetherAIService } from '../../../lib/ai/services/together'
import { getSession } from '../../../lib/auth/session'
import { validateRequestBody } from '../../../lib/validation/index'
import { CompletionRequestSchema } from '../../../lib/validation/schemas'
import { applyRateLimit } from '../../../lib/api/rate-limit'
import { getLogger } from '../../../lib/logging'

// Initialize logger
const logger = getLogger()

export interface AstroAPIContext {
  request: Request
  params: Record<string, string>
  props: Record<string, unknown>
}

export type APIRoute = (
  context: AstroAPIContext,
) => Promise<Response> | Response

/**
 * API route for AI chat completions
 * Secured by authentication and input validation
 */
export const POST: APIRoute = async ({ request }) => {
  // Define session outside try block to make it accessible in catch block
  let session: SessionData | null = null

  try {
    logger.info('Processing AI completion request')
    // Verify session
    session = await getSession(request)
    if (!session?.user) {
      logger.warn('Unauthorized access attempt to AI completion endpoint')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    }

    // Apply enhanced rate limiting with suspicious activity tracking for AI endpoints
    const rateLimit = await applyRateLimit(request, '/api/ai/completion', {
      limits: {
        admin: 120, // 120 requests per minute for admins
        therapist: 80, // 80 requests per minute for therapists
        user: 40, // 40 requests per minute for regular users
        anonymous: 10, // 10 requests per minute for unauthenticated users
      },
      windowMs: 60 * 1000, // 1 minute window
      trackSuspiciousActivity: true,
    })

    // Check if request is rate limited
    const errorResponse = rateLimit.createErrorResponse()
    if (errorResponse) {
      return errorResponse
    }

    // Validate request body against schema
    const [data, validationError] = await validateRequestBody(
      request,
      CompletionRequestSchema,
    )

    if (validationError) {
      // Create audit log for validation error
      await createAuditLog({
        id: crypto.randomUUID(),
        timestamp: new Date(),
        userId: session?.user?.id || 'anonymous',
        action: 'ai.completion.validation_error',
        resource: { id: 'ai-completion', type: 'ai' },
        metadata: {
          error: validationError.error,
          details: JSON.stringify(validationError.details),
          status: 'error',
        } as AuditMetadata,
      })

      return new Response(JSON.stringify(validationError), {
        status: validationError.status,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    }

    // Check input size to prevent abuse
    const totalInputSize = JSON.stringify(data).length
    const maxAllowedSize = 1024 * 50 // 50KB limit

    if (totalInputSize > maxAllowedSize) {
      return new Response(
        JSON.stringify({
          error: 'Payload too large',
          message: 'The request payload exceeds the maximum allowed size',
        }),
        {
          status: 413,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
    }

    // Create AI service
    const aiService = createTogetherAIService({
      apiKey: import.meta.env.TOGETHER_API_KEY || 'example-api-key',
      togetherApiKey: import.meta.env.TOGETHER_API_KEY,
      togetherBaseUrl: import.meta.env.TOGETHER_BASE_URL,
    })

    // Create audit log for the request
    await createAuditLog({
      id: crypto.randomUUID(),
      timestamp: new Date(),
      userId: session?.user?.id || 'anonymous',
      action: 'ai.completion.request',
      resource: { id: 'ai-completion', type: 'ai' },
      metadata: {
        model: data?.model,
        messageCount: data?.messages?.length,
        inputSize: totalInputSize,
        status: 'success',
      },
    })

    // Format messages to ensure they conform to AIMessage type
    const formattedMessages: AIMessage[] = (data?.messages || []).map(
      (msg) => ({
        role: msg.role || 'user',
        content: msg.content || '',
        // Include name if provided, but ensure it's optional
        ...(msg.name && { name: msg.name }),
      }),
    )

    // Handle streaming response
    if (data?.stream) {
      // Create a readable stream for the response
      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            const stream = await aiService.createStreamingChatCompletion(
              formattedMessages,
              {
                model: data?.model,
                temperature: data?.temperature,
                maxTokens: data?.max_tokens,
              },
            )

            // Handle the async generator stream
            try {
              for await (const chunk of stream) {
                controller.enqueue(
                  new TextEncoder().encode(
                    `data: ${JSON.stringify({
                      choices: [{ delta: { content: chunk.content } }],
                    })}\n\n`,
                  ),
                )
              }

              // Stream completed successfully
              controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))
              controller.close()
            } catch (streamError) {
              console.error('Stream processing error:', streamError)
              controller.error(streamError)

              // Log streaming error
              await createAuditLog({
                id: crypto.randomUUID(),
                timestamp: new Date(),
                userId: session?.user?.id || 'anonymous',
                action: 'ai.completion.stream_error',
                resource: { id: 'ai-completion', type: 'ai' },
                metadata: {
                  error:
                    streamError instanceof Error
                      ? streamError.message
                      : String(streamError),
                  status: 'error',
                },
              })
            }
          } catch (error) {
            console.error('Error creating streaming completion:', error)
            controller.error(error)

            // Create audit log for streaming error
            await createAuditLog({
              id: crypto.randomUUID(),
              timestamp: new Date(),
              userId: session?.user?.id || 'anonymous',
              action: 'ai.completion.stream_error',
              resource: { id: 'ai-completion', type: 'ai' },
              metadata: {
                error: error instanceof Error ? error.message : String(error),
                status: 'error',
              },
            })
          }
        },

        cancel() {
          // Handle stream cancellation
          console.log('Stream cancelled by client')
        },
      })

      return new Response(readableStream as unknown as BodyInit, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          ...Object.fromEntries(rateLimit.headers.entries()),
        },
      })
    }

    // Handle non-streaming response
    const completion = await aiService.createChatCompletion(formattedMessages, {
      model: data?.model,
      temperature: data?.temperature,
      maxTokens: data?.max_tokens,
    })

    // Create audit log for the completion
    await createAuditLog({
      id: crypto.randomUUID(),
      timestamp: new Date(),
      userId: session?.user?.id || 'anonymous',
      action: 'ai.completion.response',
      resource: { id: 'ai-completion', type: 'ai' },
      metadata: {
        model: completion.model,
        contentLength: completion.content.length,
        status: 'success',
      },
    })

    return new Response(JSON.stringify(completion), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        ...Object.fromEntries(rateLimit.headers.entries()),
      },
    })
  } catch (error) {
    logger.error(
      'Error in AI completion API:',
      error instanceof Error
        ? { message: error.message, stack: error.stack }
        : { message: String(error) },
    )
    console.error('Error in AI completion API:', error)

    // Create audit log for the error
    await createAuditLog({
      id: crypto.randomUUID(),
      timestamp: new Date(),
      userId: session?.user?.id || 'anonymous',
      action: 'ai.completion.error',
      resource: { id: 'ai-completion', type: 'ai' },
      metadata: {
        error: error instanceof Error ? error?.message : String(error),
        stack: error instanceof Error ? error?.stack : undefined,
        status: 'error',
      },
    })

    // Use the standardized error handling
    return handleApiError(error)
  }
}
