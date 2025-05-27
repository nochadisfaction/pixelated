import { createLogger } from '../../../utils/logger'
import type { EmotionAnalysis, EmotionType } from './types'
import type {
  DimensionalEmotionMap,
  EmotionDimension,
  EmotionVector,
} from './dimensionalTypes'

const logger = createLogger({ context: 'MultidimensionalEmotionMapper' })

/**
 * Maps emotions to multi-dimensional space using established models like
 * the Circumplex Model (valence-arousal) and PAD Model (pleasure-arousal-dominance)
 */
export class MultidimensionalEmotionMapper {
  /**
   * Maps basic emotions to dimensional coordinates in the valence-arousal space
   * Based on Russell's Circumplex Model of Affect
   */
  private static readonly EMOTION_COORDINATES: Record<
    EmotionType,
    EmotionVector
  > = {
    joy: { valence: 0.8, arousal: 0.6, dominance: 0.7 },
    sadness: { valence: -0.7, arousal: -0.5, dominance: -0.5 },
    anger: { valence: -0.6, arousal: 0.8, dominance: 0.4 },
    fear: { valence: -0.8, arousal: 0.7, dominance: -0.7 },
    disgust: { valence: -0.7, arousal: 0.1, dominance: 0.2 },
    surprise: { valence: 0.1, arousal: 0.8, dominance: -0.1 },
    trust: { valence: 0.6, arousal: -0.1, dominance: 0.4 },
    anticipation: { valence: 0.3, arousal: 0.5, dominance: 0.3 },
    acceptance: { valence: 0.5, arousal: 0.3, dominance: 0.2 },
    apprehension: { valence: -0.4, arousal: 0.4, dominance: -0.3 },
    anxiety: { valence: -0.6, arousal: 0.6, dominance: -0.6 },
    confusion: { valence: -0.3, arousal: 0.2, dominance: -0.4 },
    contentment: { valence: 0.7, arousal: -0.3, dominance: 0.5 },
    excitement: { valence: 0.7, arousal: 0.7, dominance: 0.5 },
    calmness: { valence: 0.5, arousal: -0.6, dominance: 0.3 },
    neutral: { valence: 0.0, arousal: 0.0, dominance: 0.0 },
    mixed: { valence: 0.0, arousal: 0.1, dominance: 0.0 },
    other: { valence: 0.0, arousal: 0.0, dominance: 0.0 },
  }

  /**
   * Creates a multi-dimensional mapping of emotions from emotion analysis
   *
   * @param emotionAnalysis The emotion analysis result
   * @returns A multi-dimensional mapping of emotions
   */
  public mapEmotionsToDimensions(
    emotionAnalysis: EmotionAnalysis,
  ): DimensionalEmotionMap {
    try {
      logger.debug('Mapping emotions to dimensions', {
        emotionCount: emotionAnalysis.emotions.length,
      })

      // Initialize with neutral values
      const dimensionalMap: DimensionalEmotionMap = {
        timestamp: new Date(emotionAnalysis.timestamp),
        primaryVector: { valence: 0, arousal: 0, dominance: 0 },
        emotionVectors: [],
        quadrant: 'neutral',
        intensity: 0,
        dimensionalDistribution: {
          valence: { positive: 0, negative: 0 },
          arousal: { high: 0, low: 0 },
          dominance: { high: 0, low: 0 },
        },
        dominantDimensions: [],
      }

      // Early return if no emotions
      if (!emotionAnalysis.emotions || emotionAnalysis.emotions.length === 0) {
        logger.debug('No emotions found in analysis')
        return dimensionalMap
      }

      // Map each emotion to its dimensional vector and store
      const emotionVectors: EmotionVector[] = []

      emotionAnalysis.emotions.forEach((emotion) => {
        const emotionType = emotion.type as EmotionType
        const baseCoordinates =
          MultidimensionalEmotionMapper.EMOTION_COORDINATES[emotionType]

        if (!baseCoordinates) {
          logger.warn(
            `No dimensional mapping for emotion type: ${emotion.type}`,
          )
          return
        }

        // Scale the base coordinates by the emotion intensity
        const vector: EmotionVector = {
          type: emotionType,
          valence: baseCoordinates.valence * emotion.intensity,
          arousal: baseCoordinates.arousal * emotion.intensity,
          dominance: baseCoordinates.dominance * emotion.intensity,
          intensity: emotion.intensity,
          confidence: emotion.confidence,
        }

        emotionVectors.push(vector)
      })

      dimensionalMap.emotionVectors = emotionVectors

      // Calculate the primary vector (weighted average of all emotion vectors)
      if (emotionVectors.length > 0) {
        const primaryVector = this.calculatePrimaryVector(emotionVectors)
        dimensionalMap.primaryVector = primaryVector

        // Determine quadrant (e.g., "high-arousal positive-valence")
        dimensionalMap.quadrant = this.determineQuadrant(primaryVector)

        // Calculate overall intensity
        dimensionalMap.intensity =
          this.calculateOverallIntensity(emotionVectors)

        // Calculate dimensional distributions
        dimensionalMap.dimensionalDistribution =
          this.calculateDimensionalDistribution(emotionVectors)

        // Determine dominant dimensions
        dimensionalMap.dominantDimensions =
          this.identifyDominantDimensions(primaryVector)
      }

      return dimensionalMap
    } catch (error) {
      logger.error('Error mapping emotions to dimensions', { error })
      throw error
    }
  }

  /**
   * Calculate the primary emotion vector by taking the weighted average of all emotion vectors
   */
  private calculatePrimaryVector(
    emotionVectors: EmotionVector[],
  ): EmotionVector {
    if (emotionVectors.length === 0) {
      return { valence: 0, arousal: 0, dominance: 0 }
    }

    let totalValence = 0
    let totalArousal = 0
    let totalDominance = 0
    let totalWeight = 0

    emotionVectors.forEach((vector) => {
      const intensity = vector.intensity || 0
      const weight = intensity * (vector.confidence || 1)
      totalValence += vector.valence * weight
      totalArousal += vector.arousal * weight
      totalDominance += vector.dominance * weight
      totalWeight += weight
    })

    // Normalize by total weight
    return {
      valence: totalWeight > 0 ? totalValence / totalWeight : 0,
      arousal: totalWeight > 0 ? totalArousal / totalWeight : 0,
      dominance: totalWeight > 0 ? totalDominance / totalWeight : 0,
    }
  }

  /**
   * Determine the emotion quadrant based on valence and arousal
   */
  private determineQuadrant(vector: EmotionVector): string {
    const valenceLabel =
      vector.valence > 0
        ? 'positive'
        : vector.valence < 0
          ? 'negative'
          : 'neutral'
    const arousalLabel =
      vector.arousal > 0 ? 'high' : vector.arousal < 0 ? 'low' : 'neutral'
    const dominanceLabel =
      vector.dominance > 0 ? 'high' : vector.dominance < 0 ? 'low' : 'neutral'

    return `${arousalLabel}-arousal ${valenceLabel}-valence ${dominanceLabel}-dominance`
  }

  /**
   * Calculate the overall emotional intensity
   */
  private calculateOverallIntensity(emotionVectors: EmotionVector[]): number {
    if (emotionVectors.length === 0) {
      return 0
    }

    // Calculate the magnitude of the primary vector
    const primaryVector = this.calculatePrimaryVector(emotionVectors)
    const magnitude = Math.sqrt(
      primaryVector.valence * primaryVector.valence +
        primaryVector.arousal * primaryVector.arousal +
        primaryVector.dominance * primaryVector.dominance,
    )

    // Normalize to 0-1 range (maximum theoretical magnitude is √3)
    return Math.min(1, magnitude / Math.sqrt(3))
  }

  /**
   * Calculate the distribution of emotions across dimensions
   */
  private calculateDimensionalDistribution(
    emotionVectors: EmotionVector[],
  ): DimensionalEmotionMap['dimensionalDistribution'] {
    const distribution = {
      valence: { positive: 0, negative: 0 },
      arousal: { high: 0, low: 0 },
      dominance: { high: 0, low: 0 },
    }

    let totalWeight = 0

    emotionVectors.forEach((vector) => {
      const intensity = vector.intensity || 0
      const weight = intensity * (vector.confidence || 1)
      totalWeight += weight

      // Valence
      if (vector.valence > 0) {
        distribution.valence.positive += weight
      } else if (vector.valence < 0) {
        distribution.valence.negative += weight
      }

      // Arousal
      if (vector.arousal > 0) {
        distribution.arousal.high += weight
      } else if (vector.arousal < 0) {
        distribution.arousal.low += weight
      }

      // Dominance
      if (vector.dominance > 0) {
        distribution.dominance.high += weight
      } else if (vector.dominance < 0) {
        distribution.dominance.low += weight
      }
    })

    // Normalize by total weight
    if (totalWeight > 0) {
      distribution.valence.positive /= totalWeight
      distribution.valence.negative /= totalWeight
      distribution.arousal.high /= totalWeight
      distribution.arousal.low /= totalWeight
      distribution.dominance.high /= totalWeight
      distribution.dominance.low /= totalWeight
    }

    return distribution
  }

  /**
   * Identify the dominant emotional dimensions
   */
  private identifyDominantDimensions(
    vector: EmotionVector,
  ): EmotionDimension[] {
    const dimensions: EmotionDimension[] = []

    // Use absolute values for comparison
    const absValence = Math.abs(vector.valence)
    const absArousal = Math.abs(vector.arousal)
    const absDominance = Math.abs(vector.dominance)

    // Threshold for considering a dimension dominant
    const threshold = 0.3

    if (absValence > threshold) {
      dimensions.push({
        name: 'valence',
        value: vector.valence,
        polarity: vector.valence > 0 ? 'positive' : 'negative',
        strength: this.getStrengthLabel(absValence),
      })
    }

    if (absArousal > threshold) {
      dimensions.push({
        name: 'arousal',
        value: vector.arousal,
        polarity: vector.arousal > 0 ? 'high' : 'low',
        strength: this.getStrengthLabel(absArousal),
      })
    }

    if (absDominance > threshold) {
      dimensions.push({
        name: 'dominance',
        value: vector.dominance,
        polarity: vector.dominance > 0 ? 'high' : 'low',
        strength: this.getStrengthLabel(absDominance),
      })
    }

    // Sort by absolute value (strongest first)
    return dimensions.sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
  }

  /**
   * Get a label for the strength of an emotion dimension
   */
  private getStrengthLabel(value: number): 'weak' | 'moderate' | 'strong' {
    const absValue = Math.abs(value)
    if (absValue > 0.7) {
      return 'strong'
    }
    if (absValue > 0.4) {
      return 'moderate'
    }
    return 'weak'
  }
}
