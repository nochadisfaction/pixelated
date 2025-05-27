import type {
  AIMessage,
  AIService,
  InterventionEffectivenessResult,
} from '../models/types'
import { getDefaultModelForCapability } from '../models/registry'
import { ContextFactors } from './ContextualAwarenessService'

/**
 * Intervention Analysis Service Configuration
 */
export interface InterventionAnalysisConfig {
  aiService: AIService
  model?: string
  systemPrompt?: string
}

/**
 * Intervention Analysis Result
 */
export type InterventionAnalysisResult = InterventionEffectivenessResult

/**
 * Interface for parsed JSON result
 */
interface ParsedResult {
  score?: number | string
  confidence?: number | string
  areas?: {
    name?: string
    score?: number | string
  }[]
  recommendations?: (string | unknown)[]
}

/**
 * Interface for area item in parsed result
 */
interface AreaItem {
  name?: string
  score?: number | string
}

/**
 * Intervention Analysis Service Implementation
 */
export class InterventionAnalysisService {
  private aiService: AIService
  private model: string
  private systemPrompt: string

  constructor(config: InterventionAnalysisConfig) {
    this.aiService = config.aiService
    this.model =
      config.model ||
      getDefaultModelForCapability('intervention')?.id ||
      'mistralai/Mixtral-8x7B-Instruct-v0.2'

    this.systemPrompt =
      config.systemPrompt ||
      `You are an expert therapist analyzing the effectiveness of interventions. Your responses should be concise and focused on the intervention's impact and areas for improvement.

      Analyze the following aspects:
      - Relevance: How well the intervention addresses the user's specific concerns
      - Tone: Whether the tone was appropriate for the situation
      - Clarity: How clear and understandable the intervention was
      - Impact: The apparent effect on the user's emotional state or perspective
      - Engagement: How well the user engaged with the intervention

      Return the result as a JSON object with the following structure:
        "score": number, // 0 to 1, where 0 is ineffective and 1 is very effective
        "confidence": number, // 0 to 1
        "areas": [
          {
            "name": string, // e.g., "relevance", "tone", "clarity", "impact", "engagement"
            "score": number // 0 to 1
          }
        ],
        "recommendations": string[] // List of recommendations for improvement
      }`
  }

  /**
   * Analyze the effectiveness of an intervention
   */
  async analyzeIntervention(
    conversation: AIMessage[],
    interventionMessage: string,
    userResponse: string,
    options?: {
      customPrompt?: string
      context?: ContextFactors
    },
  ): Promise<InterventionAnalysisResult> {
    const prompt = options?.customPrompt || this.systemPrompt

    // Format the conversation for analysis
    const conversationText = conversation
      .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n\n')

    // If context is provided, format it for the prompt
    let contextText = ''
    if (options?.context) {
      const {
        session,
        chatSession,
        recentEmotionState,
        recentInterventions,
        userPreferences,
        mentalHealthAnalysis,
      } = options.context
      contextText = `\nCONTEXTUAL FACTORS:\nSession: ${JSON.stringify(session)}\nChatSession: ${JSON.stringify(chatSession)}\nRecent Emotion State: ${JSON.stringify(recentEmotionState)}\nRecent Interventions: ${JSON.stringify(recentInterventions)}\nUser Preferences: ${JSON.stringify(userPreferences)}\nMental Health Analysis: ${JSON.stringify(mentalHealthAnalysis)}\n`
    }

    const analysisPrompt = `
      CONVERSATION HISTORY:
      ${conversationText}

      INTERVENTION:
      ${interventionMessage}

      USER RESPONSE:
      ${userResponse}
      ${contextText}
      Please analyze the effectiveness of this intervention, considering all provided context.
    `

    // Use the AIMessage interface from models/types which requires content and name
    const messages = [
      { role: 'system', content: prompt, name: '' },
      { role: 'user', content: analysisPrompt, name: '' },
    ] as AIMessage[]

    const response = await this.aiService.createChatCompletion(messages, {
      model: this.model,
    })

    try {
      // Extract JSON from response
      const content = response?.choices?.[0]?.message?.content || ''
      const jsonMatch =
        content.match(/```json\n([\s\S]*?)\n```/) ||
        content.match(/```\n([\s\S]*?)\n```/) ||
        content.match(/\{[\s\S]*?\}/)

      const jsonStr = jsonMatch ? jsonMatch[0] : content
      const result = JSON.parse(jsonStr) as ParsedResult

      // Validate and normalize the result
      return {
        score: Number(result?.score),
        confidence: Number(result?.confidence),
        areas: Array.isArray(result?.areas)
          ? result?.areas.map((area: AreaItem) => {
              return {
                name: String(area.name),
                score: Number(area.score),
              }
            })
          : [],
        recommendations: Array.isArray(result?.recommendations)
          ? result?.recommendations.map((rec: unknown) => String(rec))
          : [],
      }
    } catch {
      throw new Error('Failed to parse intervention analysis result')
    }
  }

  /**
   * Analyze multiple interventions
   */
  async analyzeBatch(
    interventions: {
      conversation: AIMessage[]
      interventionMessage: string
      userResponse: string
    }[],
  ): Promise<InterventionAnalysisResult[]> {
    return Promise.all(
      interventions.map((item) =>
        this.analyzeIntervention(
          item.conversation,
          item.interventionMessage,
          item.userResponse,
        ),
      ),
    )
  }
}
