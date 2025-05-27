import type { FHEService } from '../../fhe'
import type { AIResponse, AIServiceOptions, Message } from '../AIService'
import type {
  EmotionAnalysis,
  TherapyAIOptions,
  TherapyAIProvider,
  TherapyAIResponse,
  TherapySession,
} from '../interfaces/therapy'
import { createLogger } from '../../../utils/logger'
import type {
  EmotionData,
  RiskFactor,
  EmotionType,
  EmotionIntensity,
  ContextualFactor,
  Emotion,
} from '../emotions/types'
import type { MentalHealthScores } from '../emotions/EmotionDetectionEngine'

const logger = createLogger({ context: 'EmotionLlamaProvider' })

function getIntensityLevel(intensity: number): EmotionIntensity {
  if (intensity < 0.25) {
    return 'low'
  }
  if (intensity < 0.5) {
    return 'moderate'
  }
  if (intensity < 0.75) {
    return 'high'
  }
  return 'extreme'
}

interface LlamaApiEmotion {
  type: string
  confidence: number
  intensity: number
}

interface LlamaApiRiskFactor {
  type: string
  severity: number
  confidence: number
}

interface LlamaApiContextualFactor {
  type: string
  relevance: number
  confidence?: number
}

interface LlamaEmotionAnalysisResponse {
  emotions: LlamaApiEmotion[]
  overall_sentiment: number
  risk_factors?: LlamaApiRiskFactor[]
  contextual_factors?: LlamaApiContextualFactor[]
  requires_attention?: boolean
}

interface LlamaApiEmergencyStep {
  action: string
  reason: string
}

interface LlamaEmergencyHandlingResponse {
  emergency_response: string
  critical_factors: RiskFactor[]
  immediate_actions: string[]
  emergency_steps: LlamaApiEmergencyStep[]
}

interface InterventionRequest {
  scores: MentalHealthScores
  type: 'immediate' | 'preventive' | 'supportive'
  requiresExpert: boolean
  emotions: EmotionData[]
  riskFactors?: RiskFactor[]
}

interface SecurityOptions {
  useEncryption: boolean
  encryptionLevel?: 'standard' | 'fhe'
  allowThirdParty?: boolean
}

/**
 * EmotionLlamaProvider implements the TherapyAIProvider interface
 * for analyzing emotions using the EmotionLlama API
 */
export class EmotionLlamaProvider implements TherapyAIProvider {
  private fheService: FHEService
  private baseUrl: string
  private apiKey: string

  constructor(baseUrl: string, apiKey: string, fheService: FHEService) {
    this.baseUrl = baseUrl
    this.apiKey = apiKey
    this.fheService = fheService
    logger.debug('EmotionLlamaProvider initialized', {
      baseUrlLength: baseUrl.length,
      hasApiKey: !!apiKey,
      hasFheService: !!fheService,
    })
  }

  /**
   * Get the base URL for API requests
   * @returns Base URL string
   */
  public getBaseUrl(): string {
    return this.baseUrl
  }

  /**
   * Get the API key for authentication
   * @returns API key string
   */
  public getApiKey(): string {
    return this.apiKey
  }

  /**
   * Implements the generateText method required by TherapyAIProvider interface
   * @param prompt The text prompt to generate from
   * @returns Generated text content
   */
  async generateText(prompt: string): Promise<string> {
    try {
      // Encrypt prompt for enhanced security
      const encryptedPrompt = await this.fheService.encryptText(prompt)

      const response = await fetch(`${this.baseUrl}/v1/text/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          prompt: encryptedPrompt,
          max_tokens: 1000,
          temperature: 0.7,
          secure_processing: true,
        }),
      })

      if (!response.ok) {
        throw new Error(`Text generation failed: ${response.statusText}`)
      }

      const result = await response.json()

      // Decrypt the response if it's encrypted
      if (result.encrypted) {
        return await this.fheService.decryptText(result.text)
      }

      return result.text
    } catch (error) {
      logger.error('Text generation failed:', error)
      throw error
    }
  }

  async createChatCompletion(
    messages: Message[],
    options?: AIServiceOptions,
  ): Promise<AIResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          messages,
          model: options?.model || 'emotion-llama-2',
          temperature: options?.temperature || 0.7,
          max_tokens: options?.maxTokens || 1000,
        }),
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`)
      }

      const data = await response.json()
      return {
        content: data.choices[0].message.content,
        usage: {
          totalTokens: data.usage.total_tokens,
        },
      }
    } catch (error) {
      logger.error('Chat completion failed:', error)
      throw error
    }
  }

  /**
   * Analyzes emotions in text using the EmotionLlama API
   * @param text Text to analyze
   * @param options Options for the analysis
   * @returns Emotion analysis results
   */
  async analyzeEmotions(
    text: string,
    options?: TherapyAIOptions,
  ): Promise<EmotionAnalysis> {
    try {
      const securityOptions: SecurityOptions = {
        useEncryption: options?.securityOptions?.useEncryption || false,
        encryptionLevel:
          options?.securityOptions?.encryptionLevel || 'standard',
        allowThirdParty: options?.securityOptions?.allowThirdParty || false,
      }

      const processedText = securityOptions.useEncryption
        ? await this.fheService.encryptText(text)
        : text

      const response = await fetch(`${this.baseUrl}/v1/emotions/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          text: processedText,
          security_level: securityOptions.encryptionLevel || 'standard',
          allow_third_party: securityOptions.allowThirdParty,
          session_context: options?.sessionContext || {},
        }),
      })

      if (!response.ok) {
        throw new Error(`Emotion analysis failed: ${response.statusText}`)
      }

      const data: LlamaEmotionAnalysisResponse = await response.json()
      const analysisTimestamp = new Date()

      return {
        id: crypto.randomUUID(),
        timestamp: analysisTimestamp,
        emotions: data.emotions.map(
          (e: LlamaApiEmotion): Emotion => ({
            type: e.type as EmotionType,
            confidence: e.confidence,
            intensity: e.intensity,
            intensityLevel: getIntensityLevel(e.intensity),
            timestamp: analysisTimestamp,
          }),
        ),
        overallSentiment: data.overall_sentiment,
        riskFactors:
          data.risk_factors?.map(
            (r: LlamaApiRiskFactor): RiskFactor => ({
              type: r.type,
              severity: r.severity,
              confidence: r.confidence,
            }),
          ) || [],
        contextualFactors:
          data.contextual_factors?.map(
            (c: LlamaApiContextualFactor): ContextualFactor => ({
              type: c.type,
              relevance: c.relevance,
              confidence: c.confidence,
            }),
          ) || [],
        requiresAttention: data.requires_attention || false,
      }
    } catch (error) {
      logger.error('Emotion analysis failed:', error)
      throw error
    }
  }

  /**
   * Implements voice analysis (required by TherapyAIProvider interface)
   */
  async analyzeVoice(
    audioData: ArrayBuffer,
    options?: TherapyAIOptions,
  ): Promise<EmotionAnalysis> {
    try {
      // Convert ArrayBuffer to Base64 for API transport
      const base64Audio = this.arrayBufferToBase64(audioData)

      const securityOptions: SecurityOptions = {
        useEncryption: options?.securityOptions?.useEncryption || false,
        encryptionLevel:
          options?.securityOptions?.encryptionLevel || 'standard',
        allowThirdParty: options?.securityOptions?.allowThirdParty || false,
      }

      const response = await fetch(
        `${this.baseUrl}/v1/emotions/analyze-voice`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            audio_data: base64Audio,
            security_level: securityOptions.encryptionLevel || 'standard',
            allow_third_party: securityOptions.allowThirdParty,
            session_context: options?.sessionContext || {},
          }),
        },
      )

      if (!response.ok) {
        throw new Error(`Voice analysis failed: ${response.statusText}`)
      }

      const data: LlamaEmotionAnalysisResponse = await response.json()
      const analysisTimestamp = new Date()

      return {
        id: crypto.randomUUID(),
        timestamp: analysisTimestamp,
        emotions: data.emotions.map(
          (e: LlamaApiEmotion): Emotion => ({
            type: e.type as EmotionType,
            confidence: e.confidence,
            intensity: e.intensity,
            intensityLevel: getIntensityLevel(e.intensity),
            timestamp: analysisTimestamp,
          }),
        ),
        overallSentiment: data.overall_sentiment,
        riskFactors:
          data.risk_factors?.map(
            (r: LlamaApiRiskFactor): RiskFactor => ({
              type: r.type,
              severity: r.severity,
              confidence: r.confidence,
            }),
          ) || [],
        contextualFactors:
          data.contextual_factors?.map(
            (c: LlamaApiContextualFactor): ContextualFactor => ({
              type: c.type,
              relevance: c.relevance,
              confidence: c.confidence,
            }),
          ) || [],
        requiresAttention: data.requires_attention || false,
      }
    } catch (error) {
      logger.error('Voice analysis failed:', error)
      throw error
    }
  }

  /**
   * Helper method to convert ArrayBuffer to Base64
   * @param buffer ArrayBuffer to convert
   * @returns Base64 string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const binary = String.fromCharCode.apply(
      null,
      Array.from(new Uint8Array(buffer)),
    )
    return btoa(binary)
  }

  async generateIntervention(
    context: TherapySession,
    analysis: EmotionAnalysis,
    prompt?: string,
  ): Promise<TherapyAIResponse> {
    try {
      logger.debug('Generating intervention', {
        sessionId: context.sessionId,
        hasPrompt: !!prompt,
      })

      const request: InterventionRequest = {
        scores: {
          anxiety:
            analysis.emotions.find((e) => e.type === 'anxiety')?.intensity || 0,
          depression:
            analysis.emotions.find((e) => e.type === 'depression')?.intensity ||
            0,
          stress:
            analysis.emotions.find((e) => e.type === 'stress')?.intensity || 0,
          anger:
            analysis.emotions.find((e) => e.type === 'anger')?.intensity || 0,
          socialIsolation:
            analysis.emotions.find((e) => e.type === 'loneliness')?.intensity ||
            0,
        },
        type: this.determineInterventionType(analysis),
        requiresExpert: analysis.requiresAttention || false,
        emotions: analysis.emotions,
        riskFactors: analysis.riskFactors,
      }

      const finalPrompt = prompt || this.buildInterventionPrompt(request)

      const encryptedPrompt = await this.fheService.encryptText(finalPrompt)

      const response = await fetch(`${this.baseUrl}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          prompt: encryptedPrompt,
          max_tokens: 500,
          temperature: 0.7,
          secure_processing: true,
        }),
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`)
      }

      const result = await response.json()

      const decryptedResponse = await this.fheService.decryptText(result.text)

      return {
        content: decryptedResponse,
        suggestedInterventions: [
          {
            type: request.type,
            priority: request.requiresExpert ? 1 : 2,
            description: decryptedResponse,
            evidence: 'Based on emotional analysis and risk factors',
          },
        ],
      }
    } catch (error) {
      logger.error('Error generating intervention', { error })
      return this.getFallbackResponse(context, analysis)
    }
  }

  private determineInterventionType(
    analysis: EmotionAnalysis,
  ): 'immediate' | 'preventive' | 'supportive' {
    if (analysis.requiresAttention) {
      return 'immediate'
    }
    const highIntensityEmotions = analysis.emotions.filter(
      (e) => e.intensity > 0.7,
    )
    return highIntensityEmotions.length > 0 ? 'preventive' : 'supportive'
  }

  private buildInterventionPrompt(request: InterventionRequest): string {
    const { scores, type, requiresExpert, emotions, riskFactors } = request

    let prompt = 'Generate a therapeutic response that is:'

    if (requiresExpert) {
      prompt += '\n- Professional and clinically appropriate'
      prompt += '\n- Acknowledges the need for professional support'
      prompt += '\n- Provides immediate safety guidance if needed'
    } else {
      prompt += '\n- Empathetic and supportive'
      prompt += '\n- Focused on coping strategies'
      prompt += '\n- Encourages self-care and resilience'
    }

    prompt += '\n\nCurrent emotional state:'
    emotions.forEach((emotion) => {
      prompt += `\n- ${emotion.type} (intensity: ${emotion.intensity})`
    })

    prompt += '\n\nMental health indicators:'
    Object.entries(scores).forEach(([key, value]) => {
      prompt += `\n- ${key}: ${value}`
    })

    if (riskFactors?.length) {
      prompt += '\n\nRisk factors:'
      riskFactors.forEach((risk) => {
        prompt += `\n- ${risk.type} (severity: ${risk.severity})`
      })
    }

    switch (type) {
      case 'immediate':
        prompt += '\n\nProvide immediate support and crisis resources.'
        break
      case 'preventive':
        prompt += '\n\nFocus on prevention and early intervention strategies.'
        break
      case 'supportive':
        prompt += '\n\nOffer general emotional support and validation.'
        break
    }

    return prompt
  }

  private getFallbackResponse(
    context: TherapySession,
    analysis: EmotionAnalysis,
  ): TherapyAIResponse {
    const type = this.determineInterventionType(analysis)
    let content = ''

    switch (type) {
      case 'immediate':
        content =
          "I understand you're going through a difficult time. Your safety is the top priority. Please reach out to a mental health professional or crisis hotline for immediate support. The National Crisis Hotline (988) is available 24/7."
        break
      case 'preventive':
        content =
          'I notice you might be experiencing some challenges. Consider talking to someone you trust or a mental health professional. Taking care of your mental health is just as important as physical health.'
        break
      case 'supportive':
        content =
          "Thank you for sharing. It's okay to feel this way, and you're not alone. Remember to be kind to yourself and take things one step at a time."
        break
    }

    return {
      content,
      suggestedInterventions: [
        {
          type,
          priority: analysis.requiresAttention ? 1 : 2,
          description: content,
          evidence: 'Fallback response based on emotional state',
        },
      ],
    }
  }

  async assessRisk(
    session: TherapySession,
    recentAnalyses: EmotionAnalysis[],
  ): Promise<TherapyAIResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/risk/assess`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          session,
          recent_analyses: recentAnalyses,
        }),
      })

      if (!response.ok) {
        throw new Error(`Risk assessment failed: ${response.statusText}`)
      }

      const data = await response.json()
      return {
        content: data.assessment_summary,
        riskAssessment: {
          level: data.risk_level,
          factors: data.risk_factors,
          recommendedActions: data.recommended_actions,
        },
        nextSteps: data.next_steps,
      }
    } catch (error) {
      logger.error('Risk assessment failed:', error)
      throw error
    }
  }

  async handleEmergency(
    session: TherapySession,
    trigger: EmotionAnalysis,
  ): Promise<TherapyAIResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/emergency/handle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          session,
          trigger_analysis: trigger,
        }),
      })

      if (!response.ok) {
        throw new Error(`Emergency handling failed: ${response.statusText}`)
      }

      const data: LlamaEmergencyHandlingResponse = await response.json()
      return {
        content: data.emergency_response,
        riskAssessment: {
          level: 'critical',
          factors: data.critical_factors.map((f) => f.type),
          recommendedActions: data.immediate_actions,
        },
        nextSteps: data.emergency_steps.map((step: LlamaApiEmergencyStep) => ({
          type: 'emergency',
          content: step.action,
          reasoning: step.reason,
        })),
      }
    } catch (error) {
      logger.error('Emergency handling failed:', error)
      throw error
    }
  }
}
