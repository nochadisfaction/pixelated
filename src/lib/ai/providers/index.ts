import type { AIService as LegacyAIService } from '../models/ai-types'
import type { AIService } from '../models/types'
import type { AIStreamChunk } from '../models/ai-types'
import { createAIService } from '../factory'

/**
 * Get an AI service by provider name
 * @param provider Provider name (e.g., 'anthropic', 'openai')
 * @returns AIService instance or null if provider is not supported
 */
export function getAIServiceByProvider(provider: string): AIService | null {
  try {
    // Get API key based on provider
    let apiKey = ''
    let aiProvider: 'together' | 'nebius' = 'together'

    switch (provider.toLowerCase()) {
      case 'anthropic':
        apiKey = import.meta.env.ANTHROPIC_API_KEY || ''
        break
      case 'openai':
        apiKey = import.meta.env.OPENAI_API_KEY || ''
        break
      case 'together':
        apiKey = import.meta.env.TOGETHER_API_KEY || ''
        aiProvider = 'together'
        break
      case 'nebius':
        apiKey = import.meta.env.NEBIUS_API_KEY || ''
        aiProvider = 'nebius'
        break
      default:
        console.warn(`Unsupported AI provider: ${provider}`)
        return null
    }

    if (!apiKey) {
      console.error(`API key not found for provider: ${provider}`)
      return null
    }

    // Create legacy service
    const legacyService = createAIService({
      provider: aiProvider,
      apiKey,
      enableAdvancedOptimization: true,
    }) as LegacyAIService

    // Adapt legacy service to match the API required by CrisisDetectionService
    const adaptedService: AIService = {
      ...legacyService,
      // Add missing createChatStream method
      createChatStream: async (messages, options) => {
        const streamGen = await legacyService.createStreamingChatCompletion(
          messages,
          options,
        )

        // Convert AsyncGenerator to ReadableStream
        return new ReadableStream<AIStreamChunk>({
          async start(controller) {
            try {
              for await (const chunk of streamGen) {
                controller.enqueue(chunk)
              }
              controller.close()
            } catch (error) {
              controller.error(error)
            }
          },
        })
      },
    }

    return adaptedService
  } catch (error) {
    console.error(`Error creating AI service for provider ${provider}:`, error)
    return null
  }
}
