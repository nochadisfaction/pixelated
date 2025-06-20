import type {
  AIMessage,
  AIServiceOptions,
  AICompletion,
  AIUsage,
} from '../models/ai-types'
import { appLogger } from '../../logging'

export interface TogetherAIConfig {
  togetherApiKey: string
  togetherBaseUrl?: string
  apiKey: string
}

export interface TogetherAIService {
  generateCompletion(
    messages: AIMessage[],
    options?: AIServiceOptions,
  ): Promise<AICompletion | { content: string; usage?: AIUsage }>
  createChatCompletion(
    messages: AIMessage[],
    options?: AIServiceOptions,
  ): Promise<AICompletion>
  createStreamingChatCompletion(
    messages: AIMessage[],
    options?: AIServiceOptions,
  ): Promise<AsyncGenerator<any, void, void>>
  dispose(): void
}

export function createTogetherAIService(
  config: TogetherAIConfig,
): TogetherAIService {
  const baseUrl = config.togetherBaseUrl || 'https://api.together.xyz'
  const apiKey = config.togetherApiKey

  return {
    async generateCompletion(
      messages: AIMessage[],
      options?: AIServiceOptions,
    ): Promise<AICompletion | { content: string; usage?: AIUsage }> {
      try {
        if (!apiKey) {
          throw new Error('Together AI API key is not configured')
        }

        const requestBody = {
          model: options?.model || 'mistralai/Mixtral-8x7B-Instruct-v0.2',
          messages,
          temperature: options?.temperature || 0.7,
          max_tokens: options?.maxTokens || 1024,
          stream: false,
        }

        const response = await fetch(`${baseUrl}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify(requestBody),
        })

        if (!response.ok) {
          throw new Error(
            `Together AI API error: ${response.status} ${response.statusText}`,
          )
        }

        const data = await response.json()

        // Return in expected format
        return {
          id: data.id || `together-${Date.now()}`,
          created: data.created || Date.now(),
          model: data.model || requestBody.model,
          choices: data.choices || [
            {
              message: {
                role: 'assistant',
                content: data.choices?.[0]?.message?.content || '',
                name: 'assistant',
              },
              finishReason: 'stop',
            },
          ],
          usage: {
            promptTokens: data.usage?.prompt_tokens || 0,
            completionTokens: data.usage?.completion_tokens || 0,
            totalTokens: data.usage?.total_tokens || 0,
          },
          provider: 'together',
          content: data.choices?.[0]?.message?.content || '',
        }
      } catch (error: any) {
        appLogger.error('Error in Together AI completion:', {
          error:
            error instanceof Error
              ? { message: error.message, stack: error.stack }
              : error,
        })
        throw new Error(
          `Together AI service error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        )
      }
    },

    async createChatCompletion(
      messages: AIMessage[],
      options?: AIServiceOptions,
    ): Promise<AICompletion> {
      const result = await this.generateCompletion(messages, options)

      // Ensure we return an AICompletion object
      if ('id' in result) {
        return result as AICompletion
      }

      // Convert basic response to AICompletion format
      return {
        id: `together-${Date.now()}`,
        created: Date.now(),
        model: options?.model || 'mistralai/Mixtral-8x7B-Instruct-v0.2',
        choices: [
          {
            message: {
              role: 'assistant',
              content: result.content,
            },
            finishReason: 'stop',
          },
        ],
        usage: result.usage || {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        },
        provider: 'together',
        content: result.content,
      }
    },

    async createStreamingChatCompletion(
      messages: AIMessage[],
      options?: AIServiceOptions,
    ): Promise<AsyncGenerator<any, void, void>> {
      // For now, return a simple generator that yields the completion
      const completion = await this.createChatCompletion(messages, options)

      const streamGenerator = async function* () {
        const { content } = completion
        const chunkSize = 10

        for (let i = 0; i < content.length; i += chunkSize) {
          const chunk = content.slice(i, i + chunkSize)
          yield {
            id: completion.id,
            model: completion.model,
            created: completion.created,
            content: chunk,
            done: i + chunkSize >= content.length,
            finishReason: i + chunkSize >= content.length ? 'stop' : undefined,
          }

          // Add small delay to simulate streaming
          await new Promise((resolve) => setTimeout(resolve, 50))
        }
      }

      return streamGenerator()
    },

    dispose(): void {
      // Clean up any resources if needed
      appLogger.debug('Together AI service disposed')
    },
  }
}
