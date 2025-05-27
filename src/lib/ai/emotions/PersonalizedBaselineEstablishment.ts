import { createLogger } from '../../../utils/logger'
import type { EmotionAnalysis, EmotionType } from './types'

const logger = createLogger({ context: 'PersonalizedBaselineEstablishment' })

/**
 * Parameters for personalizing the emotional baseline
 */
export interface BaselinePersonalizationParams {
  /**
   * Demographic information
   */
  demographics?: {
    /**
     * Age of the individual
     */
    age?: number

    /**
     * Gender of the individual
     */
    gender?: string

    /**
     * Cultural background
     */
    culture?: string

    /**
     * Primary language
     */
    language?: string
  }

  /**
   * Personal factors
   */
  personalFactors?: {
    /**
     * Known mental health conditions
     */
    mentalHealthConditions?: string[]

    /**
     * Communication style (e.g., 'expressive', 'reserved')
     */
    communicationStyle?: string

    /**
     * Emotional expressiveness level (0-1)
     */
    emotionalExpressiveness?: number
  }

  /**
   * Environmental context
   */
  environmentalContext?: {
    /**
     * Session setting (e.g., 'clinical', 'home', 'public')
     */
    setting?: string

    /**
     * Time of day
     */
    timeOfDay?: string

    /**
     * Recent significant events
     */
    recentEvents?: string[]
  }
}

/**
 * Emotional baseline model for an individual
 */
export interface EmotionalBaseline {
  /**
   * Unique identifier for the baseline
   */
  id: string

  /**
   * User or client ID
   */
  userId: string

  /**
   * When the baseline was created or last updated
   */
  updatedAt: Date

  /**
   * Typical emotional state for this individual
   */
  typicalEmotionalState: {
    /**
     * Baseline for each emotion type
     */
    emotionBaselines: {
      type: EmotionType
      averageIntensity: number
      standardDeviation: number
    }[]

    /**
     * Typical overall sentiment
     */
    averageSentiment: number
    sentimentStandardDeviation: number
  }

  /**
   * Adjustment factors based on personalization
   */
  adjustmentFactors: {
    /**
     * Demographic adjustments
     */
    demographicAdjustments?: Record<string, number>

    /**
     * Personal factor adjustments
     */
    personalFactorAdjustments?: Record<string, number>

    /**
     * Environmental adjustments
     */
    environmentalAdjustments?: Record<string, number>
  }

  /**
   * Confidence in the baseline model (0-1)
   */
  confidenceScore: number

  /**
   * Number of data points used to establish the baseline
   */
  dataPointCount: number
}

/**
 * Extends EmotionAnalysis with overallSentiment
 */
interface ExtendedEmotionAnalysis extends EmotionAnalysis {
  overallSentiment: number
}

/**
 * Implements personalized emotional baseline establishment by modeling
 * individual-specific emotional patterns and applying contextual normalization
 */
export class PersonalizedBaselineEstablishment {
  /**
   * Creates a new emotional baseline for an individual
   *
   * @param userId User or client ID
   * @param emotionAnalyses Array of previous emotion analyses for establishing baseline
   * @param personalizationParams Optional parameters for personalization
   * @returns Personalized emotional baseline
   */
  public createEmotionalBaseline(
    userId: string,
    emotionAnalyses: EmotionAnalysis[],
    personalizationParams?: BaselinePersonalizationParams,
  ): EmotionalBaseline {
    try {
      logger.debug('Creating emotional baseline', {
        userId,
        analysesCount: emotionAnalyses.length,
        hasPersonalizationParams: !!personalizationParams,
      })

      // Require at least 3 data points for baseline establishment
      if (emotionAnalyses.length < 3) {
        logger.warn('Insufficient data for baseline establishment', {
          userId,
          analysesCount: emotionAnalyses.length,
        })
        throw new Error(
          'At least 3 emotion analysis data points are required for baseline establishment',
        )
      }

      // Calculate typical emotional state
      const typicalEmotionalState =
        this.calculateTypicalEmotionalState(emotionAnalyses)

      // Calculate adjustment factors
      const adjustmentFactors = this.calculateAdjustmentFactors(
        personalizationParams,
      )

      // Create the baseline model
      const baseline: EmotionalBaseline = {
        id: `baseline-${userId}-${Date.now()}`,
        userId,
        updatedAt: new Date(),
        typicalEmotionalState,
        adjustmentFactors,
        confidenceScore: this.calculateConfidenceScore(
          emotionAnalyses,
          personalizationParams,
        ),
        dataPointCount: emotionAnalyses.length,
      }

      return baseline
    } catch (error) {
      logger.error('Error creating emotional baseline', { error, userId })
      throw error
    }
  }

  /**
   * Normalizes an emotion analysis result against the individual's emotional baseline
   *
   * @param analysis The raw emotion analysis to normalize
   * @param baseline The individual's emotional baseline
   * @param currentContext Optional current context for additional adjustments
   * @returns Normalized emotion analysis
   */
  public normalizeEmotionAnalysis(
    analysis: EmotionAnalysis,
    baseline: EmotionalBaseline,
    currentContext?: BaselinePersonalizationParams['environmentalContext'],
  ): EmotionAnalysis {
    try {
      logger.debug('Normalizing emotion analysis against baseline', {
        userId: baseline.userId,
        analysisTimestamp: analysis.timestamp,
      })

      // Clone the original analysis to avoid modifying it
      const normalizedAnalysis = JSON.parse(
        JSON.stringify(analysis),
      ) as EmotionAnalysis & {
        overallSentiment?: number
      }

      // Calculate overall sentiment if it doesn't exist
      if (!('overallSentiment' in normalizedAnalysis)) {
        // Derive sentiment from emotions - positive emotions contribute to positive sentiment
        const positiveEmotions = [
          'joy',
          'trust',
          'contentment',
          'excitement',
          'calmness',
        ]
        const negativeEmotions = [
          'sadness',
          'anger',
          'fear',
          'disgust',
          'anxiety',
        ]

        let sentimentScore = 0
        let totalWeight = 0

        analysis.emotions.forEach((emotion) => {
          const weight = emotion.intensity * (emotion.confidence || 1)
          totalWeight += weight

          if (positiveEmotions.includes(emotion.type as EmotionType)) {
            sentimentScore += weight
          } else if (negativeEmotions.includes(emotion.type as EmotionType)) {
            sentimentScore -= weight
          }
        })

        normalizedAnalysis.overallSentiment =
          totalWeight > 0 ? sentimentScore / totalWeight : 0
      }

      // Normalize each emotion against the baseline
      normalizedAnalysis.emotions = analysis.emotions.map((emotion) => {
        const baselineEmotion =
          baseline.typicalEmotionalState.emotionBaselines.find(
            (e) => e.type === emotion.type,
          )

        if (baselineEmotion) {
          // If emotion is within 1 standard deviation of baseline, adjust intensity
          const deviationFromBaseline =
            (emotion.intensity - baselineEmotion.averageIntensity) /
            baselineEmotion.standardDeviation

          // Apply normalization
          return {
            ...emotion,
            // Adjust intensity based on how much it deviates from baseline
            // This places the emotion in context of the individual's typical expression
            intensity: Math.max(
              0,
              Math.min(
                1,
                // If intensity is close to baseline, reduce it slightly
                // If intensity is far from baseline, emphasize the difference
                deviationFromBaseline > 1 || deviationFromBaseline < -1
                  ? emotion.intensity * 1.2
                  : emotion.intensity * 0.9,
              ),
            ),
          }
        }

        // If no baseline exists for this emotion type, return unchanged
        return emotion
      })

      // Adjust overall sentiment if needed
      if (
        typeof normalizedAnalysis.overallSentiment === 'number' &&
        Math.abs(
          normalizedAnalysis.overallSentiment -
            baseline.typicalEmotionalState.averageSentiment,
        ) < baseline.typicalEmotionalState.sentimentStandardDeviation
      ) {
        // If sentiment is within typical range, reduce its significance slightly
        normalizedAnalysis.overallSentiment =
          (normalizedAnalysis.overallSentiment +
            baseline.typicalEmotionalState.averageSentiment) /
          2
      }

      // Apply environmental context adjustments if available
      if (currentContext) {
        this.applyContextualAdjustments(
          normalizedAnalysis as ExtendedEmotionAnalysis,
          baseline,
          currentContext,
        )
      }

      return normalizedAnalysis as EmotionAnalysis
    } catch (error) {
      logger.error('Error normalizing emotion analysis', {
        error,
        userId: baseline.userId,
      })
      throw error
    }
  }

  /**
   * Updates an existing emotional baseline with new emotion analysis data
   *
   * @param baseline The existing baseline to update
   * @param newAnalyses New emotion analyses to incorporate
   * @param personalizationParams Optional updated personalization parameters
   * @returns Updated emotional baseline
   */
  public updateEmotionalBaseline(
    baseline: EmotionalBaseline,
    newAnalyses: EmotionAnalysis[],
    personalizationParams?: BaselinePersonalizationParams,
  ): EmotionalBaseline {
    try {
      logger.debug('Updating emotional baseline', {
        userId: baseline.userId,
        newAnalysesCount: newAnalyses.length,
      })

      if (newAnalyses.length === 0) {
        logger.debug('No new analyses to incorporate')
        return baseline
      }

      // Calculate weighted influence of new data
      // More weight to new data if baseline has few data points
      const existingWeight = Math.min(
        0.8,
        baseline.dataPointCount /
          (baseline.dataPointCount + newAnalyses.length),
      )
      const newDataWeight = 1 - existingWeight

      // Calculate typical emotional state for new data
      const newTypicalState = this.calculateTypicalEmotionalState(newAnalyses)

      // Combine existing and new emotional states
      const combinedEmotionBaselines = this.combineEmotionBaselines(
        baseline.typicalEmotionalState.emotionBaselines,
        newTypicalState.emotionBaselines,
        existingWeight,
        newDataWeight,
      )

      // Update adjustment factors if needed
      const adjustmentFactors = personalizationParams
        ? this.calculateAdjustmentFactors(personalizationParams)
        : baseline.adjustmentFactors

      // Create updated baseline
      const updatedBaseline: EmotionalBaseline = {
        ...baseline,
        updatedAt: new Date(),
        typicalEmotionalState: {
          emotionBaselines: combinedEmotionBaselines,
          averageSentiment:
            baseline.typicalEmotionalState.averageSentiment * existingWeight +
            newTypicalState.averageSentiment * newDataWeight,
          sentimentStandardDeviation:
            baseline.typicalEmotionalState.sentimentStandardDeviation *
              existingWeight +
            newTypicalState.sentimentStandardDeviation * newDataWeight,
        },
        adjustmentFactors,
        confidenceScore: this.calculateConfidenceScore(
          newAnalyses,
          personalizationParams,
          baseline.confidenceScore,
          baseline.dataPointCount,
        ),
        dataPointCount: baseline.dataPointCount + newAnalyses.length,
      }

      return updatedBaseline
    } catch (error) {
      logger.error('Error updating emotional baseline', {
        error,
        userId: baseline.userId,
      })
      throw error
    }
  }

  /**
   * Calculates the typical emotional state based on a set of emotion analyses
   */
  private calculateTypicalEmotionalState(
    analyses: EmotionAnalysis[],
  ): EmotionalBaseline['typicalEmotionalState'] {
    // Track emotions across all analyses
    const emotionData: Record<string, number[]> = {
      joy: [],
      sadness: [],
      anger: [],
      fear: [],
      disgust: [],
      surprise: [],
      trust: [],
      anticipation: [],
    }

    // Track sentiments across all analyses
    const sentiments: number[] = []

    // Collect data points
    analyses.forEach((analysis) => {
      // Calculate sentiment if not present
      const analysisWithSentiment = analysis as EmotionAnalysis & {
        overallSentiment?: number
      }

      if (!('overallSentiment' in analysisWithSentiment)) {
        const positiveEmotions = [
          'joy',
          'trust',
          'contentment',
          'excitement',
          'calmness',
        ]
        const negativeEmotions = [
          'sadness',
          'anger',
          'fear',
          'disgust',
          'anxiety',
        ]

        let sentimentScore = 0
        let totalWeight = 0

        analysis.emotions.forEach((emotion) => {
          const weight = emotion.intensity * (emotion.confidence || 1)
          totalWeight += weight

          if (positiveEmotions.includes(emotion.type as EmotionType)) {
            sentimentScore += weight
          } else if (negativeEmotions.includes(emotion.type as EmotionType)) {
            sentimentScore -= weight
          }
        })

        analysisWithSentiment.overallSentiment =
          totalWeight > 0 ? sentimentScore / totalWeight : 0
      }

      if (typeof analysisWithSentiment.overallSentiment === 'number') {
        sentiments.push(analysisWithSentiment.overallSentiment)
      }

      analysis.emotions.forEach((emotion) => {
        const emotionType = emotion.type as string
        if (!emotionData[emotionType]) {
          emotionData[emotionType] = []
        }
        emotionData[emotionType].push(emotion.intensity)
      })
    })

    // Calculate baselines for each emotion
    const emotionBaselines = Object.entries(emotionData)
      .filter(([_, intensities]) => intensities.length > 0)
      .map(([type, intensities]) => {
        const averageIntensity =
          intensities.reduce((sum, i) => sum + i, 0) / intensities.length

        // Calculate standard deviation
        const squaredDifferences = intensities.map((i) =>
          Math.pow(i - averageIntensity, 2),
        )
        const variance =
          squaredDifferences.reduce((sum, d) => sum + d, 0) / intensities.length
        const standardDeviation = Math.sqrt(variance)

        return {
          type: type as EmotionType,
          averageIntensity,
          standardDeviation: Math.max(0.1, standardDeviation), // Minimum SD to avoid division by zero
        }
      })

    // Calculate overall sentiment statistics
    const averageSentiment =
      sentiments.reduce((sum, s) => sum + s, 0) / sentiments.length
    const sentimentSquaredDifferences = sentiments.map((s) =>
      Math.pow(s - averageSentiment, 2),
    )
    const sentimentVariance =
      sentimentSquaredDifferences.reduce((sum, d) => sum + d, 0) /
      sentiments.length
    const sentimentStandardDeviation = Math.sqrt(sentimentVariance)

    return {
      emotionBaselines,
      averageSentiment,
      sentimentStandardDeviation: Math.max(0.1, sentimentStandardDeviation),
    }
  }

  /**
   * Calculates adjustment factors based on personalization parameters
   */
  private calculateAdjustmentFactors(
    params?: BaselinePersonalizationParams,
  ): EmotionalBaseline['adjustmentFactors'] {
    const adjustmentFactors: EmotionalBaseline['adjustmentFactors'] = {}

    if (!params) {
      return adjustmentFactors
    }

    // Demographic adjustments
    if (params.demographics) {
      const demographicAdjustments: Record<string, number> = {}

      // Cultural adjustments for emotional expression
      if (params.demographics.culture) {
        // Simplified example - in reality would use research-based factors
        switch (params.demographics.culture.toLowerCase()) {
          case 'east asian':
            demographicAdjustments.emotionalExpression = 0.8 // Tend to be more reserved in expression
            break
          case 'latin american':
            demographicAdjustments.emotionalExpression = 1.2 // Tend to be more expressive
            break
          default:
            demographicAdjustments.emotionalExpression = 1.0 // Neutral
        }
      }

      // Age-related adjustments
      if (params.demographics.age) {
        // Example adjustment factors based on age
        if (params.demographics.age < 18) {
          demographicAdjustments.emotionalVolatility = 1.2 // Higher emotional volatility in youth
        } else if (params.demographics.age > 65) {
          demographicAdjustments.emotionalPositivity = 1.1 // Some research suggests older adults focus more on positive emotions
        }
      }

      adjustmentFactors.demographicAdjustments = demographicAdjustments
    }

    // Personal factor adjustments
    if (params.personalFactors) {
      const personalFactorAdjustments: Record<string, number> = {}

      // Communication style adjustments
      if (params.personalFactors.communicationStyle) {
        switch (params.personalFactors.communicationStyle.toLowerCase()) {
          case 'expressive':
            personalFactorAdjustments.emotionalIntensity = 1.2
            break
          case 'reserved':
            personalFactorAdjustments.emotionalIntensity = 0.8
            break
          default:
            personalFactorAdjustments.emotionalIntensity = 1.0
        }
      }

      // Mental health condition adjustments
      if (params.personalFactors.mentalHealthConditions?.length) {
        // Basic adjustment example - would require more sophisticated model in production
        if (
          params.personalFactors.mentalHealthConditions.includes('depression')
        ) {
          personalFactorAdjustments.negativeEmotionBias = 1.3
          personalFactorAdjustments.positiveEmotionBias = 0.7
        }

        if (params.personalFactors.mentalHealthConditions.includes('anxiety')) {
          personalFactorAdjustments.fearIntensity = 1.3
        }
      }

      // Emotional expressiveness adjustment
      if (params.personalFactors.emotionalExpressiveness !== undefined) {
        personalFactorAdjustments.generalExpressionAdjustment =
          0.5 + params.personalFactors.emotionalExpressiveness * 1.0
      }

      adjustmentFactors.personalFactorAdjustments = personalFactorAdjustments
    }

    // Environmental adjustments
    if (params.environmentalContext) {
      const environmentalAdjustments: Record<string, number> = {}

      // Setting adjustments
      if (params.environmentalContext.setting) {
        switch (params.environmentalContext.setting.toLowerCase()) {
          case 'clinical':
            environmentalAdjustments.formalityFactor = 1.2
            environmentalAdjustments.restraintFactor = 1.1
            break
          case 'home':
            environmentalAdjustments.comfortFactor = 1.2
            environmentalAdjustments.opennessFactor = 1.1
            break
          case 'public':
            environmentalAdjustments.restraintFactor = 1.3
            break
          default:
          // No adjustment for unknown settings
        }
      }

      // Recent events adjustments
      if (params.environmentalContext.recentEvents?.length) {
        // Count significant event types
        const hasCrisis = params.environmentalContext.recentEvents.some(
          (e) =>
            e.includes('crisis') || e.includes('trauma') || e.includes('loss'),
        )

        const hasPositiveEvent = params.environmentalContext.recentEvents.some(
          (e) =>
            e.includes('success') ||
            e.includes('achievement') ||
            e.includes('positive'),
        )

        if (hasCrisis) {
          environmentalAdjustments.emotionalVulnerability = 1.3
        }

        if (hasPositiveEvent) {
          environmentalAdjustments.positiveEmotionBoost = 1.2
        }
      }

      adjustmentFactors.environmentalAdjustments = environmentalAdjustments
    }

    return adjustmentFactors
  }

  /**
   * Applies contextual adjustments to the normalized emotion analysis
   */
  private applyContextualAdjustments(
    analysis: ExtendedEmotionAnalysis,
    baseline: EmotionalBaseline,
    currentContext: NonNullable<
      BaselinePersonalizationParams['environmentalContext']
    >,
  ): void {
    // Apply setting-specific adjustments
    if (
      currentContext.setting &&
      baseline.adjustmentFactors.environmentalAdjustments
    ) {
      const adjustments = baseline.adjustmentFactors.environmentalAdjustments

      // Adjust emotions based on setting
      if (
        currentContext.setting.toLowerCase() === 'clinical' &&
        adjustments.restraintFactor
      ) {
        // In clinical settings, people may hold back emotional expression
        analysis.emotions.forEach((emotion) => {
          if (['anger', 'joy', 'excitement'].includes(emotion.type as string)) {
            emotion.intensity /= adjustments.restraintFactor
          }
        })
      }
    }

    // Apply recent events adjustments
    if (
      currentContext.recentEvents?.length &&
      baseline.adjustmentFactors.environmentalAdjustments
    ) {
      const adjustments = baseline.adjustmentFactors.environmentalAdjustments

      // Check for crisis events that might influence emotional state
      const hasCrisis = currentContext.recentEvents.some(
        (e) =>
          e.includes('crisis') || e.includes('trauma') || e.includes('loss'),
      )

      if (hasCrisis && adjustments.emotionalVulnerability) {
        // Increase the significance of negative emotions if person recently experienced crisis
        analysis.emotions.forEach((emotion) => {
          if (['sadness', 'fear', 'anger'].includes(emotion.type as string)) {
            emotion.intensity *= adjustments.emotionalVulnerability
            emotion.intensity = Math.min(1, emotion.intensity) // Cap at 1.0
          }
        })
      }
    }
  }

  /**
   * Combines two sets of emotion baselines with weighting
   */
  private combineEmotionBaselines(
    existing: EmotionalBaseline['typicalEmotionalState']['emotionBaselines'],
    newBaselines: EmotionalBaseline['typicalEmotionalState']['emotionBaselines'],
    existingWeight: number,
    newWeight: number,
  ): EmotionalBaseline['typicalEmotionalState']['emotionBaselines'] {
    // Convert arrays to maps for easier processing
    const existingMap = new Map(
      existing.map((e) => [
        e.type,
        {
          averageIntensity: e.averageIntensity,
          standardDeviation: e.standardDeviation,
        },
      ]),
    )

    const newMap = new Map(
      newBaselines.map((e) => [
        e.type,
        {
          averageIntensity: e.averageIntensity,
          standardDeviation: e.standardDeviation,
        },
      ]),
    )

    // Combine all emotion types from both sets
    const allEmotionTypes = new Set([...existingMap.keys(), ...newMap.keys()])

    // Calculate weighted combination for each emotion type
    const combined: EmotionalBaseline['typicalEmotionalState']['emotionBaselines'] =
      []

    allEmotionTypes.forEach((type) => {
      const existingValues = existingMap.get(type)
      const newValues = newMap.get(type)

      if (existingValues && newValues) {
        // Weighted average for both values
        combined.push({
          type,
          averageIntensity:
            existingValues.averageIntensity * existingWeight +
            newValues.averageIntensity * newWeight,
          standardDeviation:
            existingValues.standardDeviation * existingWeight +
            newValues.standardDeviation * newWeight,
        })
      } else if (existingValues) {
        // Keep existing values with reduced weight
        combined.push({
          type,
          averageIntensity: existingValues.averageIntensity,
          standardDeviation: existingValues.standardDeviation,
        })
      } else if (newValues) {
        // Use new values
        combined.push({
          type,
          averageIntensity: newValues.averageIntensity,
          standardDeviation: newValues.standardDeviation,
        })
      }
    })

    return combined
  }

  /**
   * Calculates confidence score for the baseline
   */
  private calculateConfidenceScore(
    analyses: EmotionAnalysis[],
    params?: BaselinePersonalizationParams,
    existingConfidence?: number,
    existingDataPoints?: number,
  ): number {
    // Base confidence depends on number of data points
    let baseConfidence = Math.min(0.9, analyses.length * 0.1)

    // Adjust if updating existing baseline
    if (existingConfidence !== undefined && existingDataPoints) {
      const totalDataPoints = existingDataPoints + analyses.length
      baseConfidence = Math.min(
        0.95,
        (existingConfidence * existingDataPoints +
          baseConfidence * analyses.length) /
          totalDataPoints,
      )
    }

    // Adjust based on personalization parameters
    let paramAdjustment = 0

    if (params) {
      // More complete personalization parameters increase confidence
      if (params.demographics?.age) {
        paramAdjustment += 0.02
      }
      if (params.demographics?.culture) {
        paramAdjustment += 0.03
      }
      if (params.personalFactors?.communicationStyle) {
        paramAdjustment += 0.03
      }
      if (params.personalFactors?.mentalHealthConditions?.length) {
        paramAdjustment += 0.04
      }
      if (params.environmentalContext?.setting) {
        paramAdjustment += 0.02
      }
    }

    // Final confidence score
    return Math.min(0.95, baseConfidence + paramAdjustment)
  }
}
