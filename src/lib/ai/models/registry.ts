import type { AIModel } from './types'

/**
 * AI Model Registry
 *
 * This registry contains all available AI models with their capabilities and configuration.
 * Currently only supporting TogetherAI models.
 */
const models: AIModel[] = [
  // TogetherAI Models
  {
    id: 'llama-3-8b-instruct',
    name: 'Llama 3 8B Instruct',
    provider: 'together',
    capabilities: ['chat', 'sentiment', 'response'],
    contextWindow: 8192,
    maxTokens: 4096,
    togetherModelId: 'meta-llama/Meta-Llama-3-8B-Instruct',
    costPer1KTokens: {
      input: 0.0002,
      output: 0.0002,
    },
  },
  {
    id: 'llama-3-70b-instruct',
    name: 'Llama 3 70B Instruct',
    provider: 'together',
    capabilities: ['chat', 'sentiment', 'crisis'],
    contextWindow: 8192,
    maxTokens: 4096,
    togetherModelId: 'meta-llama/Meta-Llama-3-70B-Instruct',
    costPer1KTokens: {
      input: 0.0009,
      output: 0.0009,
    },
  },
  {
    id: 'llama-3-1-8b-instruct',
    name: 'Llama 3.1 8B Instruct',
    provider: 'together',
    capabilities: ['chat', 'sentiment', 'response'],
    contextWindow: 128000,
    maxTokens: 4096,
    togetherModelId: 'meta-llama/Meta-Llama-3.1-8B-Instruct',
    costPer1KTokens: {
      input: 0.0002,
      output: 0.0002,
    },
  },
  {
    id: 'llama-3-1-8b-instruct-turbo',
    name: 'Llama 3.1 8B Instruct Turbo',
    provider: 'together',
    capabilities: ['chat', 'sentiment', 'response'],
    contextWindow: 128000,
    maxTokens: 4096,
    togetherModelId: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
    costPer1KTokens: {
      input: 0.0002,
      output: 0.0002,
    },
  },
  {
    id: 'llama-3-1-70b-instruct',
    name: 'Llama 3.1 70B Instruct',
    provider: 'together',
    capabilities: ['chat', 'sentiment', 'crisis', 'intervention'],
    contextWindow: 128000,
    maxTokens: 4096,
    togetherModelId: 'meta-llama/Meta-Llama-3.1-70B-Instruct',
    costPer1KTokens: {
      input: 0.0009,
      output: 0.0009,
    },
  },
  {
    id: 'llama-3-1-405b-instruct',
    name: 'Llama 3.1 405B Instruct',
    provider: 'together',
    capabilities: ['chat', 'sentiment', 'crisis', 'intervention'],
    contextWindow: 128000,
    maxTokens: 4096,
    togetherModelId: 'meta-llama/Meta-Llama-3.1-405B-Instruct',
    costPer1KTokens: {
      input: 0.0018,
      output: 0.0018,
    },
  },
  {
    id: 'mistral-7b-instruct',
    name: 'Mistral 7B Instruct',
    provider: 'together',
    capabilities: ['chat', 'response'],
    contextWindow: 8192,
    maxTokens: 4096,
    togetherModelId: 'mistralai/Mistral-7B-Instruct-v0.2',
    costPer1KTokens: {
      input: 0.0002,
      output: 0.0002,
    },
  },
  {
    id: 'mixtral-8x7b-instruct',
    name: 'Mixtral 8x7B Instruct',
    provider: 'together',
    capabilities: ['chat', 'sentiment', 'response'],
    contextWindow: 32768,
    maxTokens: 4096,
    togetherModelId: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
    costPer1KTokens: {
      input: 0.0006,
      output: 0.0006,
    },
  },
  {
    id: 'mistral-large',
    name: 'Mistral Large',
    provider: 'together',
    capabilities: ['chat', 'sentiment', 'crisis', 'intervention'],
    contextWindow: 32768,
    maxTokens: 4096,
    togetherModelId: 'mistralai/Mistral-Large-2-07B',
    costPer1KTokens: {
      input: 0.0015,
      output: 0.0015,
    },
  },
  {
    id: 'claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'together',
    capabilities: ['chat', 'sentiment', 'crisis', 'intervention'],
    contextWindow: 200000,
    maxTokens: 4096,
    togetherModelId: 'anthropic/claude-3-5-sonnet-20240620',
    costPer1KTokens: {
      input: 0.003,
      output: 0.015,
    },
  },
  {
    id: 'nebius-llama-3-1-70b-instruct',
    name: 'Nebius Llama 3.1 70B Instruct',
    provider: 'nebius',
    capabilities: ['chat', 'sentiment', 'crisis', 'intervention'],
    contextWindow: 128000,
    maxTokens: 4096,
    nebiusModelId: 'meta-llama/Meta-Llama-3.1-70B-Instruct-fast',
    costPer1KTokens: {
      input: 0.0009,
      output: 0.0009,
    },
  },
]

/**
 * Get a model by ID
 */
export function getModelById(id: string): AIModel | undefined {
  return models.find((model) => model.id === id)
}

/**
 * Get all models
 */
export function getAllModels(): AIModel[] {
  return [...models]
}

/**
 * Get models by provider
 */
export function getModelsByProvider(provider: 'together'): AIModel[] {
  return models.filter((model) => model.provider === provider)
}

/**
 * Get models by capability
 */
export function getModelsByCapability(
  capability: 'chat' | 'sentiment' | 'crisis' | 'response' | 'intervention',
): AIModel[] {
  return models.filter((model) => model.capabilities.includes(capability))
}

/**
 * Get default model for a capability
 */
export function getDefaultModelForCapability(
  capability: 'chat' | 'sentiment' | 'crisis' | 'response' | 'intervention',
): AIModel {
  // First try to find a model with the specific capability
  const capableModels = getModelsByCapability(capability)

  if (capableModels.length > 0) {
    // Return the most capable model (assuming it's ordered by capability in the registry)
    return capableModels[capableModels.length - 1]
  }

  // Fallback to a general chat model
  const chatModels = getModelsByCapability('chat')
  if (chatModels.length > 0) {
    return chatModels[chatModels.length - 1]
  }

  // Ultimate fallback
  return models[0]
}
