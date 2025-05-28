import type { AIMessage } from '../models/ai-types';

interface TogetherAIServiceLike {
  generateCompletion(
    messages: { role: string; content: string; name: string }[],
    options: Record<string, unknown>
  ): Promise<Record<string, unknown>>;
}

// Create an adapter for the TogetherAIService
export class TogetherAIAdapter {
  private togetherService: unknown

  constructor(togetherService: unknown) {
    this.togetherService = togetherService
  }

  async generateCompletion(messages: AIMessage[], options: Record<string, unknown> = {}) {
    // Map messages to format expected by TogetherAI
    const adaptedMessages = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
      name: msg.name || 'default_name',
    }))
    // Call the service and return result
    const response = await (this.togetherService as TogetherAIServiceLike).generateCompletion(
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
