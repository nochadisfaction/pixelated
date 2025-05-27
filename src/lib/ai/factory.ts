import { AIService } from './services/ai-service'
import type { AIServiceConfig } from './services/ai-service'

/**
 * Create a new AI service instance with the given configuration
 * @param config AI service configuration
 * @returns AIService instance
 */
export function createAIService(config: AIServiceConfig): AIService {
  return new AIService(config)
}
