import type { AIMessage, AIService } from '../models/types'
import type { CrisisDetectionResult } from '../types'
import { getDefaultModelForCapability } from '../models/registry'
import {
  riskLevelAssessment,
  type RiskFactor,
} from '../../security/risk-level-assessment'
import { riskAlertSystem } from '../../security/alert-system'
import { getLogger } from '../../logging'

const logger = getLogger({ prefix: 'crisis-detection' })

/**
 * Crisis Detection Service Configuration
 */
export interface CrisisDetectionConfig {
  aiService: AIService
  model?: string
  defaultPrompt?: string
  sensitivityLevel?: 'low' | 'medium' | 'high'
}

/**
 * Default system prompt for crisis detection
 */
const DEFAULT_PROMPT = `You are a mental health assessment assistant specializing in crisis detection. Analyze the message for indicators of crisis, including self-harm, suicidal ideation, harm to others, and severe psychological distress.

The current sensitivity level is set to: MEDIUM

Respond in valid JSON format with:
- isCrisis: boolean indicating if there is a crisis concern
- confidence: number from 0-1 indicating confidence in assessment
- category: optional string categorizing the type of crisis (e.g., "self-harm", "suicide", "abuse")
- severity: "none", "low", "medium", "high", or "severe"
- recommendedAction: optional string with recommended next steps

Be extremely cautious about false negatives - if there's ambiguity, lean toward safety.`

/**
 * Crisis Detection Service
 *
 * Service for detecting crisis indicators in text
 */
export class CrisisDetectionService {
  private aiService: AIService
  private model: string
  private defaultPrompt: string
  private sensitivityLevel: 'low' | 'medium' | 'high'

  /**
   * Constructor
   */
  constructor(config: CrisisDetectionConfig) {
    this.aiService = config.aiService
    this.model =
      config.model || getDefaultModelForCapability('crisis-detection')
    this.defaultPrompt = config.defaultPrompt || DEFAULT_PROMPT
    this.sensitivityLevel = config.sensitivityLevel || 'medium'
  }

  /**
   * Detect crisis in text
   */
  async detectCrisis(
    text: string,
    options?: {
      sensitivityLevel?: 'low' | 'medium' | 'high'
      customPrompt?: string
      userId?: string
      source?: string
    },
  ): Promise<CrisisDetectionResult> {
    const sensitivityLevel = options?.sensitivityLevel || this.sensitivityLevel
    let prompt = options?.customPrompt || this.defaultPrompt

    // Update sensitivity level in prompt if different from default
    if (sensitivityLevel !== this.sensitivityLevel && !options?.customPrompt) {
      prompt = prompt.replace(
        `The current sensitivity level is set to: ${this.sensitivityLevel.toUpperCase()}`,
        `The current sensitivity level is set to: ${sensitivityLevel.toUpperCase()}`,
      )
    }

    const messages: AIMessage[] = [
      { role: 'system', content: prompt, name: '' },
      { role: 'user', content: text, name: '' },
    ]

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
      const result = JSON.parse(jsonStr)

      // Normalize the result
      const isCrisis = Boolean(result?.isCrisis)
      const confidence = Number(result?.confidence) || 0.5
      const category = result?.category || null
      const severity =
        (result?.severity as 'none' | 'low' | 'medium' | 'high' | 'severe') ||
        'none'
      const recommendedAction = result?.recommendedAction || null

      // Create risk factors from the detection result
      const riskFactors: RiskFactor[] = []

      if (isCrisis) {
        riskFactors.push({
          type: category || 'unspecified_crisis',
          severity: this.mapSeverityToScore(severity),
          confidence,
        })
      }

      // Add any specific indicators mentioned
      if (result.indicators) {
        for (const indicator of result.indicators) {
          riskFactors.push({
            type: indicator.type || 'indicator',
            severity: indicator.severity || 0.5,
            confidence: indicator.confidence || confidence,
          })
        }
      }

      // Use the risk level assessment service to determine risk level
      const riskAssessment = riskLevelAssessment.assessRiskLevel(riskFactors)

      // Process through alert system if userId is provided
      if (options?.userId) {
        await riskAlertSystem.processAssessment(
          riskAssessment,
          options.userId,
          options?.source || 'crisis-detection',
          {
            originalText: text,
            aiResponse: result,
            model: this.model,
          },
        )
      }

      // Map risk level to severity for backward compatibility
      const mappedSeverity = this.mapRiskLevelToSeverity(riskAssessment.level)

      return {
        isCrisis,
        confidence,
        category,
        severity: mappedSeverity,
        recommendedAction,
        content: text,
        hasCrisis: isCrisis,
        crisisType: category,
        riskLevel: riskAssessment.level,
        riskScore: riskAssessment.score,
        riskFactors: riskFactors,
        requiresIntervention: riskAssessment.requiresIntervention,
      }
    } catch (error) {
      logger.error('Error parsing crisis detection result:', error)
      throw new Error('Failed to parse crisis detection result')
    }
  }

  /**
   * Detect crisis in a batch of texts
   *
   * @param texts Array of texts to analyze
   * @param options Detection options
   * @returns Array of detection results
   */
  async detectBatch(
    texts: string[],
    options?: {
      sensitivityLevel?: 'low' | 'medium' | 'high'
      userId?: string
      source?: string
    },
  ): Promise<CrisisDetectionResult[]> {
    return Promise.all(texts.map((text) => this.detectCrisis(text, options)))
  }

  /**
   * Map severity string to numeric score
   */
  private mapSeverityToScore(
    severity: 'none' | 'low' | 'medium' | 'high' | 'severe',
  ): number {
    switch (severity) {
      case 'none':
        return 0
      case 'low':
        return 0.3
      case 'medium':
        return 0.6
      case 'high':
        return 0.8
      case 'severe':
        return 1.0
      default:
        return 0.5
    }
  }

  /**
   * Map risk level to severity for backward compatibility
   */
  private mapRiskLevelToSeverity(
    level: 'low' | 'medium' | 'high' | 'critical',
  ): 'none' | 'low' | 'medium' | 'high' | 'severe' {
    switch (level) {
      case 'low':
        return 'low'
      case 'medium':
        return 'medium'
      case 'high':
        return 'high'
      case 'critical':
        return 'severe'
      default:
        return 'none'
    }
  }
}
