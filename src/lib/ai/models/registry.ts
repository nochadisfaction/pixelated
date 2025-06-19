export interface AIModel {
  id: string
  name: string
  provider: string
  capabilities: Array<'chat' | 'sentiment' | 'crisis' | 'response' | 'intervention'>
}

// Stub implementation - replace with actual model registry
const models: AIModel[] = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    capabilities: ['chat', 'sentiment', 'crisis', 'response']
  },
  {
    id: 'claude-3-sonnet',
    name: 'Claude 3 Sonnet',
    provider: 'anthropic',
    capabilities: ['chat', 'sentiment', 'response']
  },
  {
    id: 'together-llama',
    name: 'Llama via Together',
    provider: 'together',
    capabilities: ['chat', 'intervention']
  }
]

export function getAllModels(): AIModel[] {
  return models
}

export function getModelsByProvider(provider: string): AIModel[] {
  return models.filter(model => model.provider === provider)
}

export function getModelsByCapability(
  capability: 'chat' | 'sentiment' | 'crisis' | 'response' | 'intervention'
): AIModel[] {
  return models.filter(model => model.capabilities.includes(capability))
} 