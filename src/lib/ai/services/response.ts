import type { AIMessage } from '../models/ai-types'

// Create an adapter for the TogetherAIService
export class TogetherAIAdapter {
  private togetherService: any

  constructor(togetherService: any) {
    this.togetherService = togetherService
  }

  async generateCompletion(messages: AIMessage[], options: any = {}) {
    // Map messages to format expected by TogetherAI
    const adaptedMessages = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
      name: msg.name || 'default_name',
    }))
    // Call the service and return result
    const response = await this.togetherService.generateCompletion(
      adaptedMessages,
      options,
    )
    // Add provider field required by AIServiceResponse
    return {
      ...response,
      provider: 'together',
    }
  }
}
