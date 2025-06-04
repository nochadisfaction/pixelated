import type { DimensionalEmotionMap } from '../emotions/dimensionalTypes'
import type {
  MultidimensionalPattern,
  OscillationPattern,
  ProgressionPattern,
} from './types'
import {
  detectQuadrantTransitions,
  analyzeQuadrantTransitions,
} from './quadrantTransitions'
import { detectOscillations } from './oscillations'

/**
 * Detects progression patterns in a dimension
 */
function detectProgressions(
  emotionMaps: DimensionalEmotionMap[],
  dimension: 'valence' | 'arousal' | 'dominance',
  minProgressionStrength = 0.2, // Minimum strength to consider a progression significant
  minConsistencyRatio = 0.7, // Minimum ratio of changes in same direction to consider a consistent trend
): MultidimensionalPattern[] {
  if (emotionMaps.length < 3) {
    // Need at least 3 points to detect a meaningful progression
    return []
  }

  // Extract dimension values and timestamps
  const values: number[] = []
  const timestamps: Date[] = []

  for (const map of emotionMaps) {
    // Handle both legacy and new data formats
    let value = 0

    // Direct access to dimension (legacy format)
    if (dimension in map) {
      value = map[dimension as keyof DimensionalEmotionMap] as number
    }
    // Access through primaryVector (newer format)
    else if (map.primaryVector && dimension in map.primaryVector) {
      value = map.primaryVector[dimension]
    }

    values.push(value)
    timestamps.push(
      new Date(
        typeof map.timestamp === 'string'
          ? map.timestamp
          : map.timestamp.toISOString(),
      ),
    )
  }

  // Calculate changes between consecutive points
  const changes: number[] = []
  for (let i = 1; i < values.length; i++) {
    changes.push(values[i] - values[i - 1])
  }

  // Count positive and negative changes
  let positiveChanges = 0
  let negativeChanges = 0

  for (const change of changes) {
    if (change > 0) {
      positiveChanges++
    } else if (change < 0) {
      negativeChanges++
    }
  }

  const totalChanges = positiveChanges + negativeChanges

  // No changes detected
  if (totalChanges === 0) {
    return []
  }

  // Calculate consistency ratio (how consistent are changes in one direction)
  const consistencyRatio =
    Math.max(positiveChanges, negativeChanges) / totalChanges

  // If not consistent enough, no significant progression pattern
  if (consistencyRatio < minConsistencyRatio) {
    return []
  }

  // Calculate overall change
  const overallChange = values[values.length - 1] - values[0]
  const strength = Math.min(1, Math.abs(overallChange))

  // If change is not significant enough, no significant progression pattern
  if (strength < minProgressionStrength) {
    return []
  }

  // Determine direction of progression
  const direction = overallChange > 0 ? 'increasing' : 'decreasing'

  // Create progression pattern
  const progression: ProgressionPattern = {
    type: 'progression',
    dimension,
    direction,
    strength,
    startTime: timestamps[0],
    endTime: timestamps[timestamps.length - 1],
    description: `Consistent ${direction} trend in ${dimension} (${(strength * 100).toFixed(1)}% change)`,
  }

  return [progression]
}

/**
 * Detects dimension dominance patterns (one dimension consistently stronger than others)
 *
 * A dimension is considered dominant if it consistently has a higher absolute value
 * than the other dimensions across multiple time points.
 */
function detectDimensionDominance(
  emotionMaps: DimensionalEmotionMap[],
  minDominanceStrength = 0.25, // Minimum strength to consider dominance significant
  minDominanceRatio = 0.7, // Minimum ratio of points where dimension is dominant
  minPoints = 3, // Minimum number of points required for detection
): MultidimensionalPattern[] {
  if (!emotionMaps || emotionMaps.length < minPoints) {
    return []
  }

  // Count dominance for each dimension
  const dimensions: Array<'valence' | 'arousal' | 'dominance'> = [
    'valence',
    'arousal',
    'dominance',
  ]
  const dominanceCounts: Record<string, number> = {
    valence: 0,
    arousal: 0,
    dominance: 0,
  }

  // For each emotion map, determine which dimension has the highest absolute value
  for (const map of emotionMaps) {
    const dimensionValues = new Map<string, number>()

    // Extract dimension values from the correct location based on data format
    for (const dim of dimensions) {
      let value = 0
      // Direct access (legacy format)
      if (dim in map) {
        value = Math.abs(map[dim as keyof DimensionalEmotionMap] as number)
      }
      // Access through primaryVector (newer format)
      else if (map.primaryVector && dim in map.primaryVector) {
        value = Math.abs(map.primaryVector[dim])
      }
      dimensionValues.set(dim, value)
    }

    // Find the dimension with the highest absolute value
    let maxDim = dimensions[0]
    let maxValue = dimensionValues.get(maxDim) || 0

    for (let i = 1; i < dimensions.length; i++) {
      const dim = dimensions[i]
      const value = dimensionValues.get(dim) || 0
      if (value > maxValue) {
        maxDim = dim
        maxValue = value
      }
    }

    // Only count if the max value is significant (above threshold)
    if (maxValue >= minDominanceStrength) {
      dominanceCounts[maxDim]++
    }
  }

  const patterns: MultidimensionalPattern[] = []
  const totalPoints = emotionMaps.length

  // Check each dimension for dominance
  for (const dimension of dimensions) {
    const count = dominanceCounts[dimension]
    const ratio = count / totalPoints

    // If the dimension is dominant in a significant portion of points
    if (ratio >= minDominanceRatio && count >= minPoints) {
      // Calculate the average strength of this dimension across all points
      let totalStrength = 0
      let validPoints = 0

      for (const map of emotionMaps) {
        let value = 0
        // Direct access (legacy format)
        if (dimension in map) {
          value = Math.abs(
            map[dimension as keyof DimensionalEmotionMap] as number,
          )
        }
        // Access through primaryVector (newer format)
        else if (map.primaryVector && dimension in map.primaryVector) {
          value = Math.abs(map.primaryVector[dimension])
        }

        if (value > 0) {
          totalStrength += value
          validPoints++
        }
      }

      const avgStrength = validPoints > 0 ? totalStrength / validPoints : 0
      // Scale strength based on both ratio and average value
      const strength = Math.min(1, avgStrength * ratio)

      if (strength >= minDominanceStrength) {
        // Create the pattern object
        patterns.push({
          type: 'dimension_dominance',
          dimension,
          strength,
          startTime: new Date(
            typeof emotionMaps[0].timestamp === 'string'
              ? emotionMaps[0].timestamp
              : emotionMaps[0].timestamp.toISOString(),
          ),
          endTime: new Date(
            typeof emotionMaps[emotionMaps.length - 1].timestamp === 'string'
              ? emotionMaps[emotionMaps.length - 1].timestamp
              : emotionMaps[emotionMaps.length - 1].timestamp.toISOString(),
          ),
          description: `${dimension.charAt(0).toUpperCase() + dimension.slice(1)} is consistently the strongest emotional dimension (${(strength * 100).toFixed(1)}% strength)`,
        })
      }
    }
  }

  return patterns
}

/**
 * Detects all temporal patterns in emotional data
 */
export function detectTemporalPatterns(
  emotionMaps: DimensionalEmotionMap[],
): MultidimensionalPattern[] {
  if (!emotionMaps.length) {
    return []
  }

  const patterns: MultidimensionalPattern[] = []

  // Detect quadrant transitions
  patterns.push(...detectQuadrantTransitions(emotionMaps))

  // Detect patterns in each dimension
  const dimensions: Array<'valence' | 'arousal' | 'dominance'> = [
    'valence',
    'arousal',
    'dominance',
  ]

  for (const dimension of dimensions) {
    patterns.push(...detectOscillations(emotionMaps, dimension))
    patterns.push(...detectProgressions(emotionMaps, dimension))
  }

  // Detect dimension dominance
  patterns.push(...detectDimensionDominance(emotionMaps))

  return patterns
}

/**
 * Analyzes patterns to generate insights
 */
export function analyzePatterns(patterns: MultidimensionalPattern[]): string[] {
  const insights: string[] = []

  // Group patterns by type
  const quadrantTransitions = patterns.filter(
    (p) => p.type === 'quadrant_transition',
  )
  const oscillations = patterns.filter((p) => p.type === 'oscillation')
  const progressions = patterns.filter((p) => p.type === 'progression')
  const dominancePatterns = patterns.filter(
    (p) => p.type === 'dimension_dominance',
  )

  // Analyze quadrant transitions
  if (quadrantTransitions.length > 0) {
    // Use the specialized quadrant transition analyzer for more detailed insights
    const transitionInsights = analyzeQuadrantTransitions(quadrantTransitions)
    insights.push(...transitionInsights)
  }

  // Analyze oscillations
  if (oscillations.length > 0) {
    // Group by dimension
    const dimensionOscillations = new Map<string, OscillationPattern[]>()
    oscillations.forEach((pattern) => {
      const existing = dimensionOscillations.get(pattern.dimension) || []
      dimensionOscillations.set(pattern.dimension, [...existing, pattern])
    })

    // Generate insights for each dimension
    dimensionOscillations.forEach((patterns) => {
      const strongestOscillation = patterns.reduce((prev, current) =>
        current.strength > prev.strength ? current : prev,
      )
      insights.push(strongestOscillation.description)
    })
  }

  // Analyze progressions
  if (progressions.length > 0) {
    // Group by dimension
    const dimensionProgressions = new Map<string, ProgressionPattern[]>()
    progressions.forEach((pattern) => {
      const existing = dimensionProgressions.get(pattern.dimension) || []
      dimensionProgressions.set(pattern.dimension, [
        ...existing,
        pattern as ProgressionPattern,
      ])
    })

    // Generate insights for each dimension
    dimensionProgressions.forEach((patterns) => {
      const strongestProgression = patterns.reduce((prev, current) =>
        current.strength > prev.strength ? current : prev,
      )
      insights.push(strongestProgression.description)
    })
  }

  // Analyze dimension dominance
  if (dominancePatterns.length > 0) {
    // Find strongest dimension dominance pattern
    const strongestDominance = dominancePatterns.reduce((prev, current) =>
      current.strength > prev.strength ? current : prev,
    )

    // Add insight about the dominant dimension
    insights.push(strongestDominance.description)

    // Add additional insight for clinical interpretation
    const dimensionInsights = {
      valence: 'Suggests consistent focus on emotional positivity/negativity',
      arousal:
        'Indicates persistent attentional focus on energy/activation level',
      dominance: 'Shows consistent emphasis on feelings of control/submission',
    }

    if (strongestDominance.dimension in dimensionInsights) {
      insights.push(
        dimensionInsights[
          strongestDominance.dimension as keyof typeof dimensionInsights
        ],
      )
    }
  }

  return insights
}
