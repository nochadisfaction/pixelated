import type { EmotionType } from './types'

/**
 * A vector in emotional dimension space
 * Represents a point in the 3D space of valence-arousal-dominance
 */
export interface EmotionVector {
  /**
   * The emotion type (optional, only present for specific emotions)
   */
  type?: EmotionType

  /**
   * Valence dimension (pleasure-displeasure)
   * Range: -1 (highly negative) to 1 (highly positive)
   */
  valence: number

  /**
   * Arousal dimension (activation-deactivation)
   * Range: -1 (very calm/relaxed) to 1 (very excited/stimulated)
   */
  arousal: number

  /**
   * Dominance dimension (control-lack of control)
   * Range: -1 (feeling controlled/submissive) to 1 (feeling in control/dominant)
   */
  dominance: number

  /**
   * Intensity of the emotion (optional)
   * Range: 0-1
   */
  intensity?: number

  /**
   * Confidence in the emotion reading (optional)
   * Range: 0-1
   */
  confidence?: number
}

/**
 * A dimension of emotion with strength and polarity indicators
 */
export interface EmotionDimension {
  /**
   * The name of the dimension (valence, arousal, dominance)
   */
  name: 'valence' | 'arousal' | 'dominance'

  /**
   * The dimensional value
   * Range: -1 to 1
   */
  value: number

  /**
   * The polarity of the dimension
   */
  polarity: 'positive' | 'negative' | 'high' | 'low'

  /**
   * The strength of the dimension
   */
  strength: 'weak' | 'moderate' | 'strong'
}

/**
 * Distribution of emotion across different dimensional polarities
 */
export interface DimensionalDistribution {
  valence: {
    positive: number
    negative: number
  }
  arousal: {
    high: number
    low: number
  }
  dominance: {
    high: number
    low: number
  }
}

/**
 * Comprehensive mapping of an emotional state in dimensional space
 */
export interface DimensionalEmotionMap {
  /**
   * Timestamp when the emotion was recorded
   */
  timestamp: Date

  /**
   * The primary emotion vector (weighted average of all emotions)
   */
  primaryVector: EmotionVector

  /**
   * Individual emotion vectors
   */
  emotionVectors: EmotionVector[]

  /**
   * The emotional quadrant label (e.g., "high-arousal positive-valence low-dominance")
   */
  quadrant: string

  /**
   * Overall emotional intensity (0-1)
   */
  intensity: number

  /**
   * Distribution of emotions across dimensions
   */
  dimensionalDistribution: DimensionalDistribution

  /**
   * The dominant dimensions in the emotional state (sorted by strength)
   */
  dominantDimensions: EmotionDimension[]

  /**
   * The mapped categorical emotion name
   */
  mappedEmotion?: string
}

/**
 * Result from a dimensional emotion mapping operation
 */
export interface DimensionalMappingResult {
  /**
   * The dimensional mapping
   */
  dimensionalMap: DimensionalEmotionMap

  /**
   * Textual interpretation of the dimensional mapping
   */
  interpretation: {
    /**
     * Brief summary of the emotional state
     */
    summary: string

    /**
     * More detailed analysis of the emotional state
     */
    analysis: string

    /**
     * Key insights about the emotional state
     */
    insights: string[]
  }
}
