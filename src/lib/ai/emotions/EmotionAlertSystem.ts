import { createLogger } from '../../../utils/logger'
import type { EmotionAnalysis } from './types'

const logger = createLogger({ context: 'EmotionAlertSystem' })

/**
 * Alert level for emotion-based alerts
 */
export enum AlertLevel {
  /**
   * No significant concerns detected
   */
  NONE = 'none',

  /**
   * Some concerning patterns, but no immediate attention required
   */
  LOW = 'low',

  /**
   * Notable emotional patterns that may need attention
   */
  MEDIUM = 'medium',

  /**
   * Serious concerns that require prompt attention
   */
  HIGH = 'high',

  /**
   * Critical situation requiring immediate intervention
   */
  CRITICAL = 'critical',
}

/**
 * Alert types for emotion-based concerns
 */
export enum AlertType {
  /**
   * Severe negative emotions
   */
  SEVERE_NEGATIVE_EMOTIONS = 'severe_negative_emotions',

  /**
   * Extreme emotional volatility
   */
  EMOTIONAL_VOLATILITY = 'emotional_volatility',

  /**
   * Crisis language detected
   */
  CRISIS_LANGUAGE = 'crisis_language',

  /**
   * Concerning emotional pattern
   */
  CONCERNING_PATTERN = 'concerning_pattern',

  /**
   * Significant emotional change
   */
  SIGNIFICANT_CHANGE = 'significant_change',

  /**
   * Emotional flatness or lack of emotion
   */
  EMOTIONAL_FLATNESS = 'emotional_flatness',
}

/**
 * Alert generated based on emotion analysis
 */
export interface EmotionAlert {
  /**
   * Unique ID for the alert
   */
  id: string

  /**
   * User ID
   */
  userId: string

  /**
   * Alert level
   */
  level: AlertLevel

  /**
   * Alert type
   */
  type: AlertType

  /**
   * Title of the alert
   */
  title: string

  /**
   * Detailed description of the alert
   */
  description: string

  /**
   * Analysis ID that triggered the alert
   */
  triggeringAnalysisId: string

  /**
   * When the alert was created
   */
  timestamp: Date

  /**
   * Confidence in the alert (0-1)
   */
  confidence: number

  /**
   * Recommended actions for responding to the alert
   */
  recommendedActions?: string[]

  /**
   * Whether the alert has been acknowledged
   */
  acknowledged: boolean

  /**
   * Who acknowledged the alert
   */
  acknowledgedBy?: string

  /**
   * When the alert was acknowledged
   */
  acknowledgedAt?: Date

  /**
   * Notes added by the acknowledging user
   */
  acknowledgementNotes?: string
}

/**
 * Alert configuration for the emotion alert system
 */
export interface AlertConfig {
  /**
   * Threshold for high severity negative emotions (0-1)
   */
  highSeverityThreshold: number

  /**
   * Number of consecutive analyses to consider for pattern detection
   */
  patternDetectionWindow: number

  /**
   * Minimum confidence to trigger an alert (0-1)
   */
  minimumConfidence: number

  /**
   * Threshold for detecting significant emotional changes (0-1)
   */
  significantChangeThreshold: number

  /**
   * Whether to enable alerts based on crisis language
   */
  enableCrisisLanguageAlerts: boolean
}

/**
 * System for detecting potential crisis situations based on emotion analysis
 * and generating appropriate alerts
 */
export class EmotionAlertSystem {
  private config: AlertConfig

  constructor(config?: Partial<AlertConfig>) {
    // Default configuration
    this.config = {
      highSeverityThreshold: 0.7,
      patternDetectionWindow: 5,
      minimumConfidence: 0.6,
      significantChangeThreshold: 0.5,
      enableCrisisLanguageAlerts: true,
      ...config,
    }

    logger.debug('EmotionAlertSystem initialized', { config: this.config })
  }

  /**
   * Analyzes an emotion analysis to detect potential crisis situations
   *
   * @param analysis Current emotion analysis
   * @param userId User ID
   * @param previousAnalyses Optional previous analyses for pattern detection
   * @returns Alert if crisis detected, null otherwise
   */
  public detectCrisis(
    analysis: EmotionAnalysis,
    userId: string,
    previousAnalyses?: EmotionAnalysis[],
  ): EmotionAlert | null {
    try {
      logger.debug('Detecting potential crisis', {
        userId,
        timestamp: analysis.timestamp,
        hasPreviousAnalyses: !!previousAnalyses?.length,
      })

      // Check for requiresAttention flag
      if (analysis.requiresAttention) {
        // Check if there are high severity risk factors
        const highSeverityRiskFactors = analysis.riskFactors?.filter(
          (risk) =>
            risk.severity >= this.config.highSeverityThreshold &&
            risk.confidence >= this.config.minimumConfidence,
        )

        if (highSeverityRiskFactors?.length) {
          // Generate alert for high severity risk factors
          return this.createAlert(
            userId,
            analysis,
            highSeverityRiskFactors[0].type.includes('crisis')
              ? AlertType.CRISIS_LANGUAGE
              : AlertType.SEVERE_NEGATIVE_EMOTIONS,
            highSeverityRiskFactors[0].type.includes('crisis')
              ? AlertLevel.HIGH
              : AlertLevel.MEDIUM,
          )
        }
      }

      // Check for severe negative emotions
      const severeNegativeEmotions = analysis.emotions.filter(
        (emotion) =>
          ['sadness', 'fear', 'anger'].includes(emotion.type) &&
          emotion.intensity >= this.config.highSeverityThreshold &&
          emotion.confidence >= this.config.minimumConfidence,
      )

      if (severeNegativeEmotions.length >= 2) {
        // Multiple severe negative emotions detected
        return this.createAlert(
          userId,
          analysis,
          AlertType.SEVERE_NEGATIVE_EMOTIONS,
          AlertLevel.MEDIUM,
        )
      }

      // Check for emotional patterns if previous analyses available
      if (previousAnalyses?.length) {
        const recentAnalyses = [analysis, ...previousAnalyses]
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(0, this.config.patternDetectionWindow)

        // Check for emotional volatility
        const volatilityAlert = this.detectEmotionalVolatility(
          userId,
          recentAnalyses,
        )
        if (volatilityAlert) {
          return volatilityAlert
        }

        // Check for significant emotional changes
        const changeAlert = this.detectSignificantChange(
          userId,
          analysis,
          previousAnalyses[0],
        )
        if (changeAlert) {
          return changeAlert
        }

        // Check for emotional flatness
        const flatnessAlert = this.detectEmotionalFlatness(
          userId,
          recentAnalyses,
        )
        if (flatnessAlert) {
          return flatnessAlert
        }
      }

      // No crisis detected
      return null
    } catch (error) {
      logger.error('Error detecting crisis', { error, userId })
      throw error
    }
  }

  /**
   * Acknowledges an alert, marking it as handled
   *
   * @param alert The alert to acknowledge
   * @param acknowledgedBy ID of the user acknowledging the alert
   * @param notes Optional notes about the acknowledgement
   * @returns Updated alert
   */
  public acknowledgeAlert(
    alert: EmotionAlert,
    acknowledgedBy: string,
    notes?: string,
  ): EmotionAlert {
    return {
      ...alert,
      acknowledged: true,
      acknowledgedBy,
      acknowledgedAt: new Date(),
      acknowledgementNotes: notes,
    }
  }

  /**
   * Detects emotional volatility based on recent analyses
   */
  private detectEmotionalVolatility(
    userId: string,
    recentAnalyses: EmotionAnalysis[],
  ): EmotionAlert | null {
    if (recentAnalyses.length < 3) {
      return null
    }

    // Calculate sentiment changes between consecutive analyses
    const sentimentChanges: number[] = []
    for (let i = 0; i < recentAnalyses.length - 1; i++) {
      sentimentChanges.push(
        Math.abs(
          recentAnalyses[i].overallSentiment -
            recentAnalyses[i + 1].overallSentiment,
        ),
      )
    }

    // Calculate average change
    const averageChange =
      sentimentChanges.reduce((sum, change) => sum + change, 0) /
      sentimentChanges.length

    // Check if average change exceeds threshold
    if (averageChange >= this.config.significantChangeThreshold) {
      return this.createAlert(
        userId,
        recentAnalyses[0],
        AlertType.EMOTIONAL_VOLATILITY,
        averageChange >= this.config.highSeverityThreshold
          ? AlertLevel.HIGH
          : AlertLevel.MEDIUM,
      )
    }

    return null
  }

  /**
   * Detects significant emotional changes between analyses
   */
  private detectSignificantChange(
    userId: string,
    currentAnalysis: EmotionAnalysis,
    previousAnalysis: EmotionAnalysis,
  ): EmotionAlert | null {
    if (!previousAnalysis) {
      return null
    }

    // Calculate absolute sentiment change
    const sentimentChange = Math.abs(
      currentAnalysis.overallSentiment - previousAnalysis.overallSentiment,
    )

    // Check if change exceeds threshold
    if (sentimentChange >= this.config.significantChangeThreshold) {
      // Determine direction of change
      const isNegativeChange =
        currentAnalysis.overallSentiment < previousAnalysis.overallSentiment

      return this.createAlert(
        userId,
        currentAnalysis,
        AlertType.SIGNIFICANT_CHANGE,
        isNegativeChange && sentimentChange >= this.config.highSeverityThreshold
          ? AlertLevel.HIGH
          : AlertLevel.MEDIUM,
        isNegativeChange
          ? `Significant negative emotional shift detected (${sentimentChange.toFixed(2)})`
          : `Significant positive emotional shift detected (${sentimentChange.toFixed(2)})`,
      )
    }

    return null
  }

  /**
   * Detects emotional flatness (lack of emotional variation)
   */
  private detectEmotionalFlatness(
    userId: string,
    recentAnalyses: EmotionAnalysis[],
  ): EmotionAlert | null {
    if (recentAnalyses.length < 3) {
      return null
    }

    // Calculate standard deviation of sentiment
    const sentiments = recentAnalyses.map((a) => a.overallSentiment)
    const meanSentiment =
      sentiments.reduce((sum, s) => sum + s, 0) / sentiments.length
    const squaredDiffs = sentiments.map((s) => Math.pow(s - meanSentiment, 2))
    const variance =
      squaredDiffs.reduce((sum, diff) => sum + diff, 0) / squaredDiffs.length
    const stdDev = Math.sqrt(variance)

    // Check for flatness (low standard deviation)
    if (stdDev < 0.1 && Math.abs(meanSentiment) < 0.3) {
      return this.createAlert(
        userId,
        recentAnalyses[0],
        AlertType.EMOTIONAL_FLATNESS,
        AlertLevel.MEDIUM,
        `Emotional flatness detected over ${recentAnalyses.length} analyses`,
      )
    }

    return null
  }

  /**
   * Creates an alert based on detected issues
   */
  private createAlert(
    userId: string,
    analysis: EmotionAnalysis,
    type: AlertType,
    level: AlertLevel,
    customTitle?: string,
  ): EmotionAlert {
    // Generate unique ID
    const id = `alert-${userId}-${Date.now()}-${Math.floor(Math.random() * 1000)}`

    // Determine title and description based on alert type
    let title: string
    let description: string
    let recommendedActions: string[] = []

    switch (type) {
      case AlertType.SEVERE_NEGATIVE_EMOTIONS:
        title = customTitle || 'High intensity negative emotions detected'
        description =
          'Multiple high-intensity negative emotions detected in the analysis, which may indicate emotional distress.'
        recommendedActions = [
          'Check in with the client to assess their current emotional state',
          'Review recent session notes for context',
          'Consider discussing coping strategies',
        ]
        break

      case AlertType.EMOTIONAL_VOLATILITY:
        title = customTitle || 'Emotional volatility detected'
        description =
          'Significant emotional fluctuations detected across recent analyses, which may indicate emotional instability.'
        recommendedActions = [
          'Review emotional patterns in recent sessions',
          'Assess potential triggers for emotional changes',
          'Consider discussing emotion regulation strategies',
        ]
        break

      case AlertType.CRISIS_LANGUAGE:
        title = customTitle || 'Potentially concerning language detected'
        description =
          'Language patterns associated with crisis situations detected in the content.'
        recommendedActions = [
          'Assess risk level following crisis protocol',
          'Document the concern and your response',
          'Consider direct discussion about safety if appropriate',
        ]
        break

      case AlertType.SIGNIFICANT_CHANGE:
        title = customTitle || 'Significant emotional change detected'
        description =
          'A notable shift in emotional state was detected compared to the previous analysis.'
        recommendedActions = [
          'Explore recent events that may have contributed to the change',
          'Assess whether the change is situational or persistent',
          'Document the change in your session notes',
        ]
        break

      case AlertType.EMOTIONAL_FLATNESS:
        title = customTitle || 'Emotional flatness detected'
        description =
          'Consistent lack of emotional variation detected across multiple analyses, which may indicate emotional numbing or suppression.'
        recommendedActions = [
          'Assess potential signs of depression or dissociation',
          'Consider exploring emotional awareness exercises',
          'Review medication effects if applicable',
        ]
        break

      default:
        title = customTitle || 'Emotion alert'
        description = 'An emotion-related concern was detected in the analysis.'
        break
    }

    // Calculate confidence based on emotion data
    const confidence =
      type === AlertType.CRISIS_LANGUAGE &&
      analysis.riskFactors?.some((r) => r.type.includes('crisis'))
        ? analysis.riskFactors.find((r) => r.type.includes('crisis'))
            ?.confidence || 0.7
        : 0.7 // Default confidence

    return {
      id,
      userId,
      level,
      type,
      title,
      description,
      triggeringAnalysisId: String(analysis.timestamp.getTime()), // Using timestamp as ID here
      timestamp: new Date(),
      confidence,
      recommendedActions,
      acknowledged: false,
    }
  }
}
