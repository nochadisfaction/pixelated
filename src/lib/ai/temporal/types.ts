import type { EmotionType } from '../emotions/types'

/**
 * Critical point in emotion data
 */
export interface CriticalPoint {
  type: 'peak' | 'valley' | 'inflection'
  emotionType: EmotionType
  index: number
  timestamp: Date
  intensity: number
  sessionId: string
}

/**
 * Emotional trend analysis
 */
export interface EmotionTrend {
  direction: 'increasing' | 'decreasing' | 'stable'
  slope: number
  intercept: number
  correlation: number
  strength: 'weak' | 'moderate' | 'strong'
  startValue: number
  endValue: number
  confidenceInterval: [number, number]
}

/**
 * Emotional transition between states
 */
export interface EmotionTransition {
  emotionType: EmotionType
  startIndex: number
  endIndex: number
  startTime: Date
  endTime: Date
  startIntensity: number
  endIntensity: number
  direction: 'increasing' | 'decreasing'
  magnitude: number
}

/**
 * Analysis of emotional progression
 */
export interface ProgressionAnalysis {
  overallImprovement: number
  stabilityChange: number
  positiveEmotionChange: number
  negativeEmotionChange: number
}

/**
 * Relationship between different emotional dimensions
 */
export interface DimensionalRelationship {
  emotion1: EmotionType
  emotion2: EmotionType
  correlationStrength: number
  relationshipType: 'positive' | 'negative' | 'independent'
  description: string
}

/**
 * Multi-dimensional emotion pattern in temporal data
 */
export type MultidimensionalPattern =
  | OscillationPattern
  | ProgressionPattern
  | QuadrantTransitionPattern
  | DimensionDominancePattern

/**
 * Pattern of back-and-forth movement in an emotion dimension
 */
export interface OscillationPattern {
  type: 'oscillation'
  dimension: 'valence' | 'arousal' | 'dominance'
  strength: number
  startTime: Date
  endTime: Date
  description: string
}

/**
 * Pattern of consistent movement in an emotion dimension
 */
export interface ProgressionPattern {
  type: 'progression'
  dimension: 'valence' | 'arousal' | 'dominance'
  direction: 'increasing' | 'decreasing'
  strength: number
  startTime: Date
  endTime: Date
  description: string
}

/**
 * Pattern of transition between emotional quadrants
 */
export interface QuadrantTransitionPattern {
  type: 'quadrant_transition'
  fromQuadrant: string
  toQuadrant: string
  strength: number
  startTime: Date
  endTime: Date
  description: string
  clinicalInterpretation?: string
}

/**
 * Pattern of one dimension consistently dominating
 */
export interface DimensionDominancePattern {
  type: 'dimension_dominance'
  dimension: 'valence' | 'arousal' | 'dominance'
  strength: number
  startTime: Date
  endTime: Date
  description: string
}
