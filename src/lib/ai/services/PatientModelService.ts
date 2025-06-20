/**
 * Service for managing patient cognitive models
 */

import { KVStore } from '../../db/KVStore'
import type { CognitiveModel } from '../types/CognitiveModel'

/**
 * Model identifier type
 */
export type ModelIdentifier = {
  id: string
  name: string
}

/**
 * Patient response style configuration
 */
export type PatientResponseStyleConfig = {
  openness: number
  coherence: number
  defenseLevel: number
  disclosureStyle: 'open' | 'selective' | 'guarded'
  challengeResponses: 'defensive' | 'curious' | 'dismissive'
}

/**
 * Response context for generating patient responses
 */
export type ResponseContext = {
  model: CognitiveModel
  conversationHistory: Array<{
    role: 'therapist' | 'patient'
    content: string
  }>
  styleConfig: PatientResponseStyleConfig
  therapeuticFocus?: string[]
  sessionNumber: number
}

/**
 * Service for managing patient cognitive models
 */
export class PatientModelService {
  private kvStore: KVStore

  /**
   * Create a new PatientModelService
   * @param kvStore KVStore instance for storing and retrieving models
   */
  constructor(kvStore: KVStore) {
    this.kvStore = kvStore
  }

  /**
   * Get all available cognitive models
   * @returns Promise<ModelIdentifier[]> List of available models
   */
  async getAvailableModels(): Promise<ModelIdentifier[]> {
    try {
      const keys = await this.kvStore.keys()
      const modelIds = keys.filter((key) => key.startsWith('model_'))

      const models: ModelIdentifier[] = []

      for (const modelId of modelIds) {
        const model = await this.kvStore.get<CognitiveModel>(modelId)
        if (model) {
          models.push({
            id: model.id,
            name: model.name,
          })
        }
      }

      return models
    } catch (error) {
      console.error('Failed to get available models:', error)
      return []
    }
  }

  /**
   * Get a cognitive model by ID
   * @param id Model ID
   * @returns Promise<CognitiveModel | null> The cognitive model or null if not found
   */
  async getModelById(id: string): Promise<CognitiveModel | null> {
    try {
      return await this.kvStore.get<CognitiveModel>(`model_${id}`)
    } catch (error) {
      console.error(`Failed to get model with ID ${id}:`, error)
      return null
    }
  }

  /**
   * Save a cognitive model
   * @param model The cognitive model to save
   * @returns Promise<boolean> True if successful, false otherwise
   */
  async saveModel(model: CognitiveModel): Promise<boolean> {
    try {
      await this.kvStore.set(`model_${model.id}`, model)
      return true
    } catch (error) {
      console.error(`Failed to save model ${model.id}:`, error)
      return false
    }
  }

  /**
   * Delete a cognitive model
   * @param id Model ID
   * @returns Promise<boolean> True if successful, false otherwise
   */
  async deleteModel(id: string): Promise<boolean> {
    try {
      await this.kvStore.delete(`model_${id}`)
      return true
    } catch (error) {
      console.error(`Failed to delete model ${id}:`, error)
      return false
    }
  }

  /**
   * Create a response context for generating patient responses
   * @param modelId Model ID
   * @param conversationHistory Conversation history
   * @param styleConfig Response style configuration
   * @param therapeuticFocus Current therapeutic focus areas
   * @param sessionNumber Current session number
   * @returns Promise<ResponseContext | null> Response context or null if model not found
   */
  async createResponseContext(
    modelId: string,
    conversationHistory: Array<{
      role: 'therapist' | 'patient'
      content: string
    }>,
    styleConfig: PatientResponseStyleConfig,
    therapeuticFocus?: string[],
    sessionNumber: number = 1,
  ): Promise<ResponseContext | null> {
    const model = await this.getModelById(modelId)

    if (!model) {
      return null
    }

    return {
      model,
      conversationHistory,
      styleConfig,
      therapeuticFocus,
      sessionNumber,
    }
  }

  /**
   * Generate a prompt for the patient model
   * @param context Response context
   * @returns string The generated prompt
   */
  generatePatientPrompt(context: ResponseContext): string {
    // This is a simplified implementation
    // In a real system, this would generate a complex prompt based on the model and context
    const {
      model,
      conversationHistory,
      styleConfig,
      therapeuticFocus,
      sessionNumber,
    } = context

    // Build the prompt
    let prompt = `You are roleplaying as ${model.name}, a patient with ${model.diagnosisInfo.primaryDiagnosis}.\n\n`

    // Add personality details
    prompt += `Your core beliefs include: ${model.coreBeliefs.map((b) => b.belief).join(', ')}.\n`
    prompt += `Your emotional patterns include: ${model.emotionalPatterns.map((e) => e.emotion).join(', ')}.\n`

    // Add conversation style based on config
    prompt += `Your openness level is ${styleConfig.openness}/10. `
    prompt += `Your coherence level is ${styleConfig.coherence}/10. `
    prompt += `Your defense level is ${styleConfig.defenseLevel}/10. `
    prompt += `Your disclosure style is ${styleConfig.disclosureStyle}. `
    prompt += `You respond to challenges in a ${styleConfig.challengeResponses} way.\n\n`

    // Add therapeutic focus if provided
    if (therapeuticFocus && therapeuticFocus.length > 0) {
      prompt += `The current therapeutic focus areas are: ${therapeuticFocus.join(', ')}.\n\n`
    }

    // Add session number
    prompt += `This is session number ${sessionNumber}.\n\n`

    // Add conversation history
    prompt += 'Conversation history:\n'
    for (const message of conversationHistory) {
      prompt += `${message.role === 'therapist' ? 'Therapist' : model.name}: ${message.content}\n`
    }

    // Add final instruction
    prompt += `\nRespond as ${model.name}:`

    return prompt
  }
}
