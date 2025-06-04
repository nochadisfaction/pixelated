import type {
  AICompletionResponse,
  AIMessage,
  AIModel,
  AIProvider,
  AIService,
  AIServiceOptions,
  AIServiceResponse,
  AIStreamChunk,
  AIUsageRecord,
} from '../models/ai-types'

// Nebius API configuration
interface NebiusAIConfig {
  apiKey: string
  baseUrl?: string
  onUsage?: (usage: AIUsageRecord) => Promise<void>
}

// Nebius service interface
export interface NebiusAIService extends Omit<AIService, 'generateCompletion'> {
  generateCompletion: (
    messages: AIMessage[],
    options?: {
      model?: string
      temperature?: number
      maxTokens?: number
      stop?: string[]
    },
  ) => Promise<AIServiceResponse>
}

/**
 * Create a Nebius AI service
 * @param config The Nebius configuration
 * @returns A Nebius AI service
 */
export function createNebiusAIService(config: NebiusAIConfig): NebiusAIService {
  const baseUrl = config.baseUrl || 'https://api.nebius.ai/v1'
  const { apiKey } = config

  if (!apiKey) {
    throw new Error('Nebius API key is required')
  }

  const generateCompletion = async (
    messages: AIMessage[],
    options: AIServiceOptions = {},
  ): Promise<AICompletionResponse> => {
    try {
      const {
        model = 'nebius/default-model',
        temperature = 0.7,
        maxTokens = 1000,
      } = options

      // Format messages for Nebius API
      const formattedMessages = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        name: msg.name || 'default_name',
      }))

      // Make API request
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: formattedMessages,
          temperature,
          max_tokens: maxTokens,
        }),
      })

      if (!response?.ok) {
        const error = await response?.json()
        throw new Error(
          `Nebius API error: ${error.error?.message || response.statusText}`,
        )
      }

      const data = await response?.json()

      // Return formatted response
      return {
        id: data?.id || `nebius_${Date.now()}`,
        model: data?.model || model,
        created: Date.now(),
        content: data?.choices[0].message.content,
        choices: [
          {
            message: {
              role: 'assistant',
              content: data?.choices[0].message.content,
              name: 'assistant',
            },
            finishReason: data?.choices[0].finish_reason || 'stop',
          },
        ],
        usage: {
          promptTokens: data?.usage?.prompt_tokens || 0,
          completionTokens: data?.usage?.completion_tokens || 0,
          totalTokens: data?.usage?.total_tokens || 0,
        },
        provider: 'nebius' as AIProvider,
      }
    } catch (error) {
      console.error('Error generating completion:', error)
      throw error
    }
  }

  // Define the service object to return
  return {
    // Required methods for AIService interface
    generateCompletion: async (
      messages: AIMessage[],
      options?: {
        model?: string
        temperature?: number
        maxTokens?: number
        stop?: string[]
      },
    ): Promise<AIServiceResponse> => {
      const response = await generateCompletion(messages, options)
      return {
        content: response?.content,
        model: response?.model,
        usage: response?.usage
          ? {
              promptTokens: response?.usage.promptTokens || 0,
              completionTokens: response?.usage.completionTokens || 0,
              totalTokens: response?.usage.totalTokens || 0,
            }
          : undefined,
      }
    },
    createChatCompletion: async (
      messages: AIMessage[],
      options?: AIServiceOptions,
    ): Promise<AICompletionResponse> => {
      return generateCompletion(messages, options)
    },

    createStreamingChatCompletion: async (
      messages: AIMessage[],
      options?: AIServiceOptions,
    ): Promise<AsyncGenerator<AIStreamChunk, void, void>> => {
      try {
        const {
          model = 'nebius/default-model',
          temperature = 0.7,
          maxTokens = 1000,
        } = options || {}

        // Format messages for Nebius API
        const formattedMessages = messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
          name: msg.name || 'default_name',
        }))

        // Make API request with stream option
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: formattedMessages,
            temperature,
            max_tokens: maxTokens,
            stream: true,
          }),
        })

        if (!response?.ok) {
          const error = await response?.json()
          throw new Error(
            `Nebius API error: ${error.error?.message || response.statusText}`,
          )
        }

        if (!response.body) {
          throw new Error('Response body is null')
        }

        // Create a ReadableStream from the response
        const reader = response.body.getReader()
        const decoder = new TextDecoder()

        // Return an async generator that yields chunks
        const streamToGenerator = async function* (): AsyncGenerator<
          AIStreamChunk,
          void,
          void
        > {
          let buffer = ''
          try {
            while (true) {
              const { done, value } = await reader.read()

              if (done) {
                return
              }

              buffer += decoder.decode(value, { stream: true })
              const lines = buffer.split('\n')
              buffer = lines.pop() || ''
              const payloads = lines
                .filter((line) => line.trim() !== '')
                .map((line) => line.replace(/^data: /, '').trim())

              // Process all non-empty data lines
              for (const line of payloads) {
                if (line === '[DONE]') {
                  return
                }

                try {
                  const data = JSON.parse(line)
                  const content = data.choices[0]?.delta?.content || ''

                  yield {
                    id: data.id || `nebius_${Date.now()}`,
                    model: data.model || model,
                    created: Date.now(),
                    content,
                    done: false,
                  } as AIStreamChunk
                } catch (err) {
                  console.error('Error parsing streaming response:', err)
                }
              }
            }
          } catch (err) {
            console.error('Error reading stream:', err)
            reader.releaseLock()
            throw err
          }
        }

        return streamToGenerator()
      } catch (error) {
        console.error('Error in streaming chat completion:', error)

        // Return a minimally valid generator that immediately completes
        const emptyGenerator = async function* (): AsyncGenerator<
          AIStreamChunk,
          void,
          void
        > {
          yield {
            id: `nebius_error_${Date.now()}`,
            model: options?.model || 'nebius/default-model',
            created: Date.now(),
            content: '',
            done: true,
          } as AIStreamChunk
        }

        return emptyGenerator()
      }
    },

    getModelInfo: (model: string): AIModel => {
      return {
        id: model,
        name: model,
        provider: 'nebius' as AIProvider,
        capabilities: ['chat'],
        contextWindow: 8192,
        maxTokens: 8192,
      }
    },

    createChatCompletionWithTracking: async (
      messages: AIMessage[],
      options?: AIServiceOptions,
    ): Promise<AICompletionResponse> => {
      const response = await generateCompletion(messages, options)
      if (config.onUsage && response?.usage) {
        await config.onUsage({
          timestamp: Date.now(),
          model: response?.model,
          promptTokens: response?.usage.promptTokens || 0,
          completionTokens: response?.usage.completionTokens || 0,
          totalTokens: response?.usage.totalTokens || 0,
          id: response?.id,
          provider: 'nebius' as AIProvider,
        })
      }
      return response
    },
    dispose: () => {
      // Dispose resources if needed
    },
  }
}
