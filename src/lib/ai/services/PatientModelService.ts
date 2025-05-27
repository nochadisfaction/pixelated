/**
 * Patient Cognitive Model Service
 * Manages patient cognitive models for therapist training
 */

import type {
  CognitiveModel,
  PatientResponseContext,
  PatientResponseStyleConfig,
} from '../types/CognitiveModel'

// Import potential database service
import type { KVStore } from '@/lib/db/KVStore'

export interface ModelIdentifier {
  id: string
  name: string
  presentingIssues: string[]
  diagnosisSummary?: string
}

export class PatientModelService {
  private kvStore: KVStore
  private cachedModels: Map<string, CognitiveModel> = new Map()
  private DEFAULT_STYLE_CONFIG: PatientResponseStyleConfig = {
    openness: 5,
    coherence: 7,
    defenseLevel: 5,
    disclosureStyle: 'selective',
    challengeResponses: 'curious',
  }

  constructor(kvStore: KVStore) {
    this.kvStore = kvStore
  }

  /**
   * Get a list of available patient models
   */
  async getAvailableModels(): Promise<ModelIdentifier[]> {
    try {
      return (
        (await this.kvStore.get<ModelIdentifier[]>('patient_models_list')) || []
      )
    } catch (error) {
      console.error('Failed to fetch available patient models:', error)
      return []
    }
  }

  /**
   * Get a specific patient model by ID
   */
  async getModelById(modelId: string): Promise<CognitiveModel | null> {
    // Check cache first
    if (this.cachedModels.has(modelId)) {
      return this.cachedModels.get(modelId)!
    }

    try {
      const model = await this.kvStore.get<CognitiveModel>(
        `patient_model_${modelId}`,
      )

      if (model) {
        // Cache the model for future use
        this.cachedModels.set(modelId, model)
        return model
      }

      return null
    } catch (error) {
      console.error(`Failed to fetch patient model ${modelId}:`, error)
      return null
    }
  }

  /**
   * Save a new patient model
   */
  async saveModel(model: CognitiveModel): Promise<boolean> {
    try {
      // Save the complete model
      await this.kvStore.set(`patient_model_${model.id}`, model)

      // Update the model list
      const modelList = await this.getAvailableModels()

      // Check if this model already exists in the list
      const exists = modelList.some((m) => m.id === model.id)

      if (!exists) {
        // Add to the model list if new
        modelList.push({
          id: model.id,
          name: model.name,
          presentingIssues: model.presentingIssues,
          diagnosisSummary: model.diagnosisInfo?.primaryDiagnosis,
        })

        await this.kvStore.set('patient_models_list', modelList)
      }

      // Update cache
      this.cachedModels.set(model.id, model)

      return true
    } catch (error) {
      console.error('Failed to save patient model:', error)
      return false
    }
  }

  /**
   * Delete a patient model
   */
  async deleteModel(modelId: string): Promise<boolean> {
    try {
      // Remove from KV store
      await this.kvStore.delete(`patient_model_${modelId}`)

      // Update the model list
      const modelList = await this.getAvailableModels()
      const updatedList = modelList.filter((m) => m.id !== modelId)
      await this.kvStore.set('patient_models_list', updatedList)

      // Remove from cache
      this.cachedModels.delete(modelId)

      return true
    } catch (error) {
      console.error(`Failed to delete patient model ${modelId}:`, error)
      return false
    }
  }

  /**
   * Create a patient response context for the current conversation
   */
  async createResponseContext(
    modelId: string,
    conversationHistory: Array<{
      role: 'therapist' | 'patient'
      content: string
    }>,
    customStyleConfig?: Partial<PatientResponseStyleConfig>,
    currentTherapeuticFocus?: string[],
    sessionNumber: number = 1,
  ): Promise<PatientResponseContext | null> {
    const model = await this.getModelById(modelId)

    if (!model) {
      return null
    }

    // Detect trigger themes from the conversation
    const triggerThemes = this.detectTriggerThemes(model, conversationHistory)

    // Merge default style with any custom settings
    const styleConfig = {
      ...this.DEFAULT_STYLE_CONFIG,
      ...customStyleConfig,
    }

    // Get active beliefs and emotional responses based on the conversation
    const activeBeliefs = this.getActiveBeliefs(model, triggerThemes)
    const likelyEmotions = this.getLikelyEmotionalResponses(
      model,
      triggerThemes,
    )
    const likelyDistortions = this.getLikelyDistortions(model, triggerThemes)

    // Get last therapist message
    const lastTherapistMessage =
      conversationHistory.filter((msg) => msg.role === 'therapist').pop()
        ?.content || ''

    return {
      modelId: model.id,
      patientName: model.name,
      presentingIssues: model.presentingIssues,
      primaryDiagnosis: model.diagnosisInfo?.primaryDiagnosis || '',
      sessionNumber,
      conversationHistory,
      lastTherapistMessage,
      activeBeliefs,
      likelyEmotions: likelyEmotions.map((e) => ({
        emotion: e.emotion,
        intensity: e.intensity,
      })),
      likelyDistortions,
      responseStyle: styleConfig,
      therapeuticFocus: currentTherapeuticFocus,
      nonverbalCues: {
        facialExpression: 'neutral',
        bodyLanguage: 'relaxed',
        voiceTone: 'normal',
        eyeContact: true,
      },
    }
  }

  /**
   * Detect themes in the conversation that might trigger the patient's cognitive patterns
   */
  private detectTriggerThemes(
    model: CognitiveModel,
    conversationHistory: Array<{
      role: 'therapist' | 'patient'
      content: string
    }>,
  ): string[] {
    // Extract all therapist utterances from recent history
    const recentTherapistUtterances = conversationHistory
      .slice(-5) // Consider only the last 5 exchanges for recency
      .filter((msg) => msg.role === 'therapist')
      .map((msg) => msg.content)

    if (recentTherapistUtterances.length === 0) {
      return []
    }

    const combinedText = recentTherapistUtterances.join(' ').toLowerCase()

    // Collect potential trigger themes from various model components
    const potentialTriggers: Set<string> = new Set()

    // Check for triggers from emotional patterns
    model.emotionalPatterns.forEach((pattern) => {
      pattern.triggers.forEach((trigger) => {
        if (combinedText.includes(trigger.toLowerCase())) {
          potentialTriggers.add(trigger)
        }
      })
    })

    // Check for triggers from distortion patterns
    model.distortionPatterns.forEach((pattern) => {
      pattern.triggerThemes.forEach((theme) => {
        if (combinedText.includes(theme.toLowerCase())) {
          potentialTriggers.add(theme)
        }
      })
    })

    // Check for triggers from behavioral patterns
    model.behavioralPatterns.forEach((pattern) => {
      if (combinedText.includes(pattern.trigger.toLowerCase())) {
        potentialTriggers.add(pattern.trigger)
      }
    })

    // Check for relationship themes
    model.relationshipPatterns.forEach((pattern) => {
      if (combinedText.includes(pattern.type.toLowerCase())) {
        potentialTriggers.add(pattern.type)
      }
    })

    return Array.from(potentialTriggers)
  }

  /**
   * Generate a prompt for the LLM to simulate the patient based on the cognitive model
   */
  generatePatientPrompt(context: PatientResponseContext): string {
    const {
      patientName,
      presentingIssues,
      primaryDiagnosis,
      activeBeliefs,
      likelyEmotions,
      likelyDistortions,
      responseStyle,
    } = context

    // Get the model from cache using modelId
    const model = this.cachedModels.get(context.modelId)

    if (!model) {
      throw new Error(`Model with ID ${context.modelId} not found in cache`)
    }

    // Format the demographic and background information
    const demographicInfo = `
Name: ${patientName}
Age: ${model.demographicInfo.age}
Gender: ${model.demographicInfo.gender}
Occupation: ${model.demographicInfo.occupation}
Family Status: ${model.demographicInfo.familyStatus}
${model.demographicInfo.culturalFactors ? `Cultural Factors: ${model.demographicInfo.culturalFactors.join(', ')}` : ''}
`

    // Format presenting issues and diagnosis
    const clinicalInfo = `
Presenting Issues: ${presentingIssues.join(', ')}
Diagnosis: ${primaryDiagnosis || 'None specified'}
${
  model.diagnosisInfo
    ? `Duration of Symptoms: ${model.diagnosisInfo.durationOfSymptoms}
Severity: ${model.diagnosisInfo.severity}`
    : ''
}
`

    // Format cognitive components that are active in this context
    const activeBeliefsList = activeBeliefs
      .map((belief) => `- "${belief.belief}" (Strength: ${belief.strength}/10)`)
      .join('\n')

    const emotionsList = likelyEmotions
      .map(
        (emotion) =>
          `- ${emotion.emotion} (Intensity: ${emotion.intensity}/10)`,
      )
      .join('\n')

    const distortionsList = likelyDistortions
      .map(
        (distortion) =>
          `- ${distortion.type} (Frequency: ${distortion.frequency}). Examples: ${distortion.examples.join('; ')}`,
      )
      .join('\n')

    // Format response style guidance
    const responseStyleText = `
Response Style Configuration:
- Openness: ${responseStyle.openness}/10
- Coherence: ${responseStyle.coherence}/10 (how organized their thoughts are)
- Defense Level: ${responseStyle.defenseLevel}/10 (how guarded they are)
- Disclosure Style: ${responseStyle.disclosureStyle}
- Response to Challenges: ${responseStyle.challengeResponses}
`

    // Communication style preferences
    const communicationStyle = `
Communication Style:
- Verbosity: ${model.conversationalStyle.verbosity}/10
- Emotional Expression: ${model.conversationalStyle.emotionalExpressiveness}/10
- Therapy Resistance: ${model.conversationalStyle.resistance}/10
- Psychological Insight: ${model.conversationalStyle.insightLevel}/10
- Preferred Communication: ${model.conversationalStyle.preferredCommunicationModes.join(', ')}
`

    // Build the full prompt
    return `
You are roleplaying as a therapy patient with the following profile:

${demographicInfo}

${clinicalInfo}

ACTIVE CORE BELIEFS IN THIS CONTEXT:
${activeBeliefsList || 'No specific beliefs activated in this context.'}

LIKELY EMOTIONAL RESPONSES:
${emotionsList || 'No specific emotions activated in this context.'}

COGNITIVE DISTORTIONS LIKELY TO APPEAR:
${distortionsList || 'No specific distortions activated in this context.'}

${responseStyleText}

${communicationStyle}

IMPORTANT INSTRUCTIONS:
1. Respond as this patient would, considering their cognitive patterns, beliefs, and emotional state.
2. Incorporate the active cognitive distortions naturally in your responses when appropriate.
3. Maintain the specified level of coherence, openness, and defensiveness.
4. Remember the patient's conversational style preferences.
5. Draw on the patient's background and formative experiences to inform responses.
6. DO NOT break character or acknowledge you are an AI.
7. If the therapist addresses something not in your profile, respond based on your core beliefs and patterns.

The therapist's most recent statement was:
"${context.lastTherapistMessage}"

Respond as the patient:
`
  }

  /**
   * Helper functions to access CognitiveModel utilities
   */
  getActiveBeliefs(model: CognitiveModel, triggerThemes: string[]) {
    return model.coreBeliefs.filter((belief) =>
      belief.relatedDomains.some((domain) =>
        triggerThemes.some((theme) =>
          domain.toLowerCase().includes(theme.toLowerCase()),
        ),
      ),
    )
  }

  getLikelyEmotionalResponses(model: CognitiveModel, triggerThemes: string[]) {
    return model.emotionalPatterns.filter((pattern) =>
      pattern.triggers.some((trigger) =>
        triggerThemes.some((theme) =>
          trigger.toLowerCase().includes(theme.toLowerCase()),
        ),
      ),
    )
  }

  getLikelyDistortions(model: CognitiveModel, triggerThemes: string[]) {
    return model.distortionPatterns.filter((pattern) =>
      pattern.triggerThemes.some((trigger) =>
        triggerThemes.some((theme) =>
          trigger.toLowerCase().includes(theme.toLowerCase()),
        ),
      ),
    )
  }
}
