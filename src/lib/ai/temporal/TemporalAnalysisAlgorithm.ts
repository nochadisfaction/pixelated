import { createLogger } from '../../../utils/logger'
import type {
  EmotionAnalysis,
  EmotionData,
  EmotionType,
} from '../emotions/types'
import type {
  CriticalPoint,
  DimensionalRelationship,
  EmotionTrend,
  EmotionTransition,
  MultidimensionalPattern,
  ProgressionAnalysis,
} from './types'
import type { DimensionalEmotionMap } from '../emotions/dimensionalTypes'

const logger = createLogger({ context: 'TemporalAnalysisAlgorithm' })

/**
 * Utility class providing algorithms for temporal emotion analysis
 */
export class TemporalAnalysisAlgorithm {
  /**
   * Calculate linear trendlines for emotional dimensions
   */
  static calculateTrendlines(
    emotionData: EmotionAnalysis[],
  ): Record<EmotionType, EmotionTrend> {
    try {
      if (emotionData.length < 2) {
        logger.warn('Insufficient data for trendline calculation', {
          dataPointCount: emotionData.length,
        })
        return {} as Record<EmotionType, EmotionTrend>
      }

      const trendlines = {} as Record<EmotionType, EmotionTrend>
      const emotions = this.extractEmotionsByType(emotionData)

      // Calculate trendline for each emotion type
      for (const [type, data] of Object.entries(emotions)) {
        const emotionType = type as EmotionType

        // Need at least 2 data points to calculate trend
        if (data.length < 2) {
          continue
        }

        // Calculate linear regression
        const { slope, intercept, correlation } = this.linearRegression(
          data.map((d, i) => i), // x values (time indices)
          data.map((d) => d.intensity), // y values (intensity)
        )

        // Calculate start and end points for visualization
        const startIntensity = intercept
        const endIntensity = slope * (data.length - 1) + intercept

        // Determine trend direction
        let direction: 'increasing' | 'decreasing' | 'stable' = 'stable'
        if (slope > 0.01) {
          direction = 'increasing'
        } else if (slope < -0.01) {
          direction = 'decreasing'
        }

        // Calculate strength based on correlation coefficient
        const strength = Math.abs(correlation)

        // Store trendline data
        trendlines[emotionType] = {
          direction,
          slope,
          intercept,
          correlation,
          strength: this.categorizeStrength(strength),
          startValue: startIntensity,
          endValue: endIntensity,
          confidenceInterval: this.calculateConfidenceInterval(
            data.map((d) => d.intensity),
          ),
        }
      }

      logger.debug('Calculated trendlines', {
        emotionTypes: Object.keys(trendlines),
      })
      return trendlines
    } catch (error) {
      logger.error('Error calculating trendlines', { error })
      return {} as Record<EmotionType, EmotionTrend>
    }
  }

  /**
   * Calculate volatility (variance) of emotions over time
   */
  static calculateVolatility(
    emotionData: EmotionAnalysis[],
    windowSize: number = 5,
  ): Record<EmotionType, number> {
    try {
      if (emotionData.length < windowSize) {
        logger.warn('Insufficient data for volatility calculation', {
          dataPointCount: emotionData.length,
          requiredPoints: windowSize,
        })
        return {} as Record<EmotionType, number>
      }

      const volatility = {} as Record<EmotionType, number>
      const emotions = this.extractEmotionsByType(emotionData)

      // Calculate volatility for each emotion type
      for (const [type, data] of Object.entries(emotions)) {
        const emotionType = type as EmotionType

        // Need sufficient data for volatility
        if (data.length < windowSize) {
          continue
        }

        // Calculate moving standard deviation
        const movingStdDevs: number[] = []

        for (let i = 0; i <= data.length - windowSize; i++) {
          const window = data.slice(i, i + windowSize).map((d) => d.intensity)
          const stdDev = this.standardDeviation(window)
          movingStdDevs.push(stdDev)
        }

        // Average the moving standard deviations
        volatility[emotionType] = this.mean(movingStdDevs)
      }

      logger.debug('Calculated emotion volatility', {
        emotionTypes: Object.keys(volatility),
      })
      return volatility
    } catch (error) {
      logger.error('Error calculating volatility', { error })
      return {} as Record<EmotionType, number>
    }
  }

  /**
   * Detect significant emotional transitions
   */
  static detectTransitions(
    emotionData: EmotionAnalysis[],
  ): EmotionTransition[] {
    try {
      if (emotionData.length < 3) {
        logger.warn('Insufficient data for transition detection', {
          dataPointCount: emotionData.length,
        })
        return []
      }

      const transitions: EmotionTransition[] = []
      const emotions = this.extractEmotionsByType(emotionData)

      // Threshold for significant change (configurable)
      const intensityThreshold = 0.3
      const minDuration = 2 // Minimum consecutive points to confirm a transition

      // Detect transitions for each emotion type
      for (const [type, data] of Object.entries(emotions)) {
        const emotionType = type as EmotionType

        // Need sufficient data for transition detection
        if (data.length < 3) {
          continue
        }

        let transitionStart = -1
        let previousIntensity = data[0].intensity
        let increasingCount = 0
        let decreasingCount = 0

        // Detect periods of consistent increase or decrease
        for (let i = 1; i < data.length; i++) {
          const currentIntensity = data[i].intensity
          const change = currentIntensity - previousIntensity

          // Check for increasing trend
          if (change > 0) {
            increasingCount++
            decreasingCount = 0

            // Mark potential transition start
            if (transitionStart === -1) {
              transitionStart = i - 1
            }

            // If we have a sustained increase and significant total change
            if (
              increasingCount >= minDuration &&
              data[i].intensity - data[transitionStart].intensity >=
                intensityThreshold
            ) {
              // Record the transition
              transitions.push({
                emotionType,
                startIndex: transitionStart,
                endIndex: i,
                startTime: new Date(emotionData[transitionStart].timestamp),
                endTime: new Date(emotionData[i].timestamp),
                startIntensity: data[transitionStart].intensity,
                endIntensity: data[i].intensity,
                direction: 'increasing',
                magnitude: data[i].intensity - data[transitionStart].intensity,
              })

              // Reset for finding next transition
              transitionStart = -1
              increasingCount = 0
            }
          }
          // Check for decreasing trend
          else if (change < 0) {
            decreasingCount++
            increasingCount = 0

            // Mark potential transition start
            if (transitionStart === -1) {
              transitionStart = i - 1
            }

            // If we have a sustained decrease and significant total change
            if (
              decreasingCount >= minDuration &&
              data[transitionStart].intensity - data[i].intensity >=
                intensityThreshold
            ) {
              // Record the transition
              transitions.push({
                emotionType,
                startIndex: transitionStart,
                endIndex: i,
                startTime: new Date(emotionData[transitionStart].timestamp),
                endTime: new Date(emotionData[i].timestamp),
                startIntensity: data[transitionStart].intensity,
                endIntensity: data[i].intensity,
                direction: 'decreasing',
                magnitude: data[transitionStart].intensity - data[i].intensity,
              })

              // Reset for finding next transition
              transitionStart = -1
              decreasingCount = 0
            }
          }
          // No significant change
          else {
            increasingCount = 0
            decreasingCount = 0
            transitionStart = -1
          }

          previousIntensity = currentIntensity
        }
      }

      // Sort transitions by start time
      transitions.sort((a, b) => a.startTime.getTime() - b.startTime.getTime())

      logger.debug('Detected emotional transitions', {
        count: transitions.length,
      })
      return transitions
    } catch (error) {
      logger.error('Error detecting transitions', { error })
      return []
    }
  }

  /**
   * Find critical points in emotion data (peaks, valleys, inflection points)
   */
  static findCriticalPoints(
    emotionData: EmotionAnalysis[],
    sessionIds: string[],
    percentileThreshold: number = 90,
  ): CriticalPoint[] {
    try {
      if (emotionData.length < 3) {
        logger.warn('Insufficient data for critical point detection', {
          dataPointCount: emotionData.length,
        })
        return []
      }

      const criticalPoints: CriticalPoint[] = []
      const emotions = this.extractEmotionsByType(emotionData)

      // Find critical points for each emotion type
      for (const [type, data] of Object.entries(emotions)) {
        const emotionType = type as EmotionType

        // Need sufficient data to find critical points
        if (data.length < 3) {
          continue
        }

        // Get intensities
        const intensities = data.map((d) => d.intensity)

        // Calculate percentile threshold for peak detection
        const threshold = this.percentile(intensities, percentileThreshold)

        // Detect peaks and valleys
        for (let i = 1; i < data.length - 1; i++) {
          const prev = data[i - 1].intensity
          const curr = data[i].intensity
          const next = data[i + 1].intensity

          // Peak detection
          if (curr > prev && curr > next && curr >= threshold) {
            criticalPoints.push({
              type: 'peak',
              emotionType,
              index: i,
              timestamp: new Date(emotionData[i].timestamp),
              intensity: curr,
              sessionId: sessionIds[i] || 'unknown',
            })
          }

          // Valley detection
          if (curr < prev && curr < next) {
            criticalPoints.push({
              type: 'valley',
              emotionType,
              index: i,
              timestamp: new Date(emotionData[i].timestamp),
              intensity: curr,
              sessionId: sessionIds[i] || 'unknown',
            })
          }

          // Inflection point detection (where trend changes)
          if ((prev < curr && curr > next) || (prev > curr && curr < next)) {
            criticalPoints.push({
              type: 'inflection',
              emotionType,
              index: i,
              timestamp: new Date(emotionData[i].timestamp),
              intensity: curr,
              sessionId: sessionIds[i] || 'unknown',
            })
          }
        }
      }

      // Sort critical points by timestamp
      criticalPoints.sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
      )

      logger.debug('Detected critical points', { count: criticalPoints.length })
      return criticalPoints
    } catch (error) {
      logger.error('Error finding critical points', { error })
      return []
    }
  }

  /**
   * Calculate emotional progression metrics
   */
  static calculateProgression(
    startData: EmotionAnalysis[],
    endData: EmotionAnalysis[],
  ): ProgressionAnalysis {
    try {
      if (startData.length === 0 || endData.length === 0) {
        logger.warn('Insufficient data for progression analysis', {
          startDataPoints: startData.length,
          endDataPoints: endData.length,
        })
        return {
          overallImprovement: 0,
          stabilityChange: 0,
          positiveEmotionChange: 0,
          negativeEmotionChange: 0,
        }
      }

      // Extract emotion data by type
      const startEmotions = this.extractEmotionsByType(startData)
      const endEmotions = this.extractEmotionsByType(endData)

      // Identify positive and negative emotions
      const positiveEmotions = [
        'joy',
        'trust',
        'anticipation',
        'acceptance',
        'contentment',
        'excitement',
        'calmness',
      ] as EmotionType[]

      const negativeEmotions = [
        'anger',
        'fear',
        'sadness',
        'disgust',
        'apprehension',
        'anxiety',
        'confusion',
      ] as EmotionType[]

      // Calculate average intensity for positive emotions
      let startPositiveAvg = this.calculateTypeGroupAverage(
        startEmotions,
        positiveEmotions,
      )
      let endPositiveAvg = this.calculateTypeGroupAverage(
        endEmotions,
        positiveEmotions,
      )

      // Calculate average intensity for negative emotions
      let startNegativeAvg = this.calculateTypeGroupAverage(
        startEmotions,
        negativeEmotions,
      )
      let endNegativeAvg = this.calculateTypeGroupAverage(
        endEmotions,
        negativeEmotions,
      )

      // Calculate volatility for start and end periods
      const startVolatility: number[] = []
      const endVolatility: number[] = []

      for (const [, data] of Object.entries(startEmotions)) {
        if (data.length >= 2) {
          startVolatility.push(
            this.standardDeviation(data.map((d) => d.intensity)),
          )
        }
      }

      for (const [, data] of Object.entries(endEmotions)) {
        if (data.length >= 2) {
          endVolatility.push(
            this.standardDeviation(data.map((d) => d.intensity)),
          )
        }
      }

      // Average volatility
      const startAvgVolatility =
        startVolatility.length > 0 ? this.mean(startVolatility) : 0
      const endAvgVolatility =
        endVolatility.length > 0 ? this.mean(endVolatility) : 0

      // Calculate progression metrics
      const progression: ProgressionAnalysis = {
        // Overall emotional improvement (more positive, less negative)
        overallImprovement:
          endPositiveAvg -
          startPositiveAvg -
          (endNegativeAvg - startNegativeAvg),

        // Emotional stability change (negative value means more stable)
        stabilityChange: endAvgVolatility - startAvgVolatility,

        // Change in positive emotions
        positiveEmotionChange: endPositiveAvg - startPositiveAvg,

        // Change in negative emotions (negative value means reduction in negative emotions)
        negativeEmotionChange: endNegativeAvg - startNegativeAvg,
      }

      logger.debug('Calculated progression metrics', { progression })
      return progression
    } catch (error) {
      logger.error('Error calculating progression', { error })
      return {
        overallImprovement: 0,
        stabilityChange: 0,
        positiveEmotionChange: 0,
        negativeEmotionChange: 0,
      }
    }
  }

  /**
   * Analyze relationships between different emotional dimensions
   */
  static analyzeDimensionalRelationships(
    emotionData: EmotionAnalysis[],
  ): DimensionalRelationship[] {
    try {
      if (emotionData.length < 5) {
        logger.warn('Insufficient data for dimensional relationship analysis', {
          dataPointCount: emotionData.length,
        })
        return []
      }

      const relationships: DimensionalRelationship[] = []
      const emotions = this.extractEmotionsByType(emotionData)

      // Get all emotion types that have sufficient data
      const types = Object.entries(emotions)
        .filter(([_, data]) => data.length >= 5)
        .map(([type, _]) => type as EmotionType)

      // Calculate correlations between each pair of emotions
      for (let i = 0; i < types.length; i++) {
        for (let j = i + 1; j < types.length; j++) {
          const type1 = types[i]
          const type2 = types[j]

          const data1 = emotions[type1].map((d) => d.intensity)
          const data2 = emotions[type2].map((d) => d.intensity)

          // If the data arrays are different lengths, use the overlap
          const minLength = Math.min(data1.length, data2.length)
          const series1 = data1.slice(0, minLength)
          const series2 = data2.slice(0, minLength)

          // Calculate correlation
          const correlation = this.correlationCoefficient(series1, series2)

          // Determine relationship type
          let relationshipType: 'positive' | 'negative' | 'independent' =
            'independent'

          if (correlation > 0.3) {
            relationshipType = 'positive'
          } else if (correlation < -0.3) {
            relationshipType = 'negative'
          }

          // Only include significant relationships
          if (relationshipType !== 'independent') {
            relationships.push({
              emotion1: type1,
              emotion2: type2,
              correlationStrength: Math.abs(correlation),
              relationshipType,
              description: this.generateRelationshipDescription(
                type1,
                type2,
                relationshipType,
              ),
            })
          }
        }
      }

      logger.debug('Analyzed dimensional relationships', {
        count: relationships.length,
      })
      return relationships
    } catch (error) {
      logger.error('Error analyzing dimensional relationships', { error })
      return []
    }
  }

  /**
   * Analyze multi-dimensional emotion patterns over time
   */
  static analyzeMultidimensionalPatterns(
    emotionData: EmotionAnalysis[],
    dimensionalMaps: DimensionalEmotionMap[],
  ): MultidimensionalPattern[] {
    try {
      if (emotionData.length < 5 || dimensionalMaps.length < 5) {
        logger.warn('Insufficient data for multidimensional pattern analysis', {
          dataPointCount: emotionData.length,
          dimensionalMapCount: dimensionalMaps.length,
        })
        return []
      }

      const patterns: MultidimensionalPattern[] = []

      // Ensure timestamp alignment between emotion data and dimensional maps
      const alignedData = this.alignDimensionalDataWithEmotions(
        emotionData,
        dimensionalMaps,
      )

      if (alignedData.length < 5) {
        logger.warn(
          'Insufficient aligned data for multidimensional pattern analysis',
        )
        return []
      }

      // Track dimension movement patterns
      const dimensionMovements = this.trackDimensionMovements(alignedData)

      // Find oscillation patterns (repeated back-and-forth movement in a dimension)
      const oscillationPatterns =
        this.detectOscillationPatterns(dimensionMovements)
      patterns.push(...oscillationPatterns)

      // Find progression patterns (consistent movement in one direction)
      const progressionPatterns =
        this.detectProgressionPatterns(dimensionMovements)
      patterns.push(...progressionPatterns)

      // Find quadrant transitions (movement between different emotional quadrants)
      const quadrantPatterns = this.detectQuadrantTransitions(alignedData)
      patterns.push(...quadrantPatterns)

      // Find dimension dominance patterns (when one dimension consistently dominates)
      const dominancePatterns =
        this.detectDimensionDominancePatterns(alignedData)
      patterns.push(...dominancePatterns)

      logger.debug('Analyzed multidimensional patterns', {
        count: patterns.length,
      })
      return patterns
    } catch (error) {
      logger.error('Error analyzing multidimensional patterns', { error })
      return []
    }
  }

  /**
   * Align dimensional maps with emotion analysis data by timestamp
   */
  private static alignDimensionalDataWithEmotions(
    emotionData: EmotionAnalysis[],
    dimensionalMaps: DimensionalEmotionMap[],
  ): Array<EmotionAnalysis & { dimensionalMap: DimensionalEmotionMap }> {
    const aligned: Array<
      EmotionAnalysis & { dimensionalMap: DimensionalEmotionMap }
    > = []

    // Create map of timestamps to dimensional maps for quick lookup
    const dimensionalMapsByTime = new Map<number, DimensionalEmotionMap>()
    dimensionalMaps.forEach((map) => {
      dimensionalMapsByTime.set(new Date(map.timestamp).getTime(), map)
    })

    // Match emotion data with dimensional maps
    emotionData.forEach((emotion) => {
      const timestamp = new Date(emotion.timestamp).getTime()
      const dimensionalMap = dimensionalMapsByTime.get(timestamp)

      if (dimensionalMap) {
        aligned.push({
          ...emotion,
          dimensionalMap,
        })
      }
    })

    return aligned
  }

  /**
   * Track movements in each emotion dimension over time
   */
  private static trackDimensionMovements(
    alignedData: Array<
      EmotionAnalysis & { dimensionalMap: DimensionalEmotionMap }
    >,
  ): Record<string, Array<{ time: Date; value: number; change: number }>> {
    const movements: Record<
      string,
      Array<{ time: Date; value: number; change: number }>
    > = {
      valence: [],
      arousal: [],
      dominance: [],
    }

    // Track each dimension's value and change over time
    for (let i = 0; i < alignedData.length; i++) {
      const current = alignedData[i].dimensionalMap.primaryVector
      const time = new Date(alignedData[i].timestamp)

      // For the first point, we don't have a change value
      if (i === 0) {
        movements.valence.push({ time, value: current.valence, change: 0 })
        movements.arousal.push({ time, value: current.arousal, change: 0 })
        movements.dominance.push({ time, value: current.dominance, change: 0 })
        continue
      }

      const previous = alignedData[i - 1].dimensionalMap.primaryVector

      // Calculate change since previous point
      movements.valence.push({
        time,
        value: current.valence,
        change: current.valence - previous.valence,
      })

      movements.arousal.push({
        time,
        value: current.arousal,
        change: current.arousal - previous.arousal,
      })

      movements.dominance.push({
        time,
        value: current.dominance,
        change: current.dominance - previous.dominance,
      })
    }

    return movements
  }

  /**
   * Detect oscillation patterns in emotion dimensions
   */
  private static detectOscillationPatterns(
    dimensionMovements: Record<
      string,
      Array<{ time: Date; value: number; change: number }>
    >,
  ): MultidimensionalPattern[] {
    const patterns: MultidimensionalPattern[] = []
    const dimensions = ['valence', 'arousal', 'dominance']

    dimensions.forEach((dimension) => {
      const movements = dimensionMovements[dimension]
      if (movements.length < 5) {
        return
      }

      let directionChanges = 0
      let previousDirection: 'increasing' | 'decreasing' | null = null

      // Count how many times the direction changes
      for (let i = 1; i < movements.length; i++) {
        const currentDirection =
          movements[i].change > 0 ? 'increasing' : 'decreasing'

        if (previousDirection && currentDirection !== previousDirection) {
          directionChanges++
        }

        previousDirection = currentDirection
      }

      // If we have enough direction changes in a short period, it's oscillation
      if (directionChanges >= 3 && movements.length <= 10) {
        patterns.push({
          type: 'oscillation',
          dimension: dimension as 'valence' | 'arousal' | 'dominance',
          strength: this.calculateOscillationStrength(movements),
          startTime: movements[0].time,
          endTime: movements[movements.length - 1].time,
          description: `Oscillating ${dimension} with ${directionChanges} direction changes`,
        })
      }
    })

    return patterns
  }

  /**
   * Calculate the strength of an oscillation pattern
   */
  private static calculateOscillationStrength(
    movements: Array<{ time: Date; value: number; change: number }>,
  ): number {
    // Calculate variance of changes
    const changes = movements.map((m) => m.change)
    const mean =
      changes.reduce((sum, change) => sum + change, 0) / changes.length
    const variance =
      changes.reduce((sum, change) => sum + Math.pow(change - mean, 2), 0) /
      changes.length

    // Normalize to 0-1 range (higher variance = stronger oscillation)
    return Math.min(1, Math.sqrt(variance) * 5)
  }

  /**
   * Detect progression patterns in emotion dimensions
   */
  private static detectProgressionPatterns(
    dimensionMovements: Record<
      string,
      Array<{ time: Date; value: number; change: number }>
    >,
  ): MultidimensionalPattern[] {
    const patterns: MultidimensionalPattern[] = []
    const dimensions = ['valence', 'arousal', 'dominance']

    dimensions.forEach((dimension) => {
      const movements = dimensionMovements[dimension]
      if (movements.length < 5) {
        return
      }

      // Calculate consistent direction ratio
      let positiveChanges = 0
      let negativeChanges = 0

      for (let i = 0; i < movements.length; i++) {
        if (movements[i].change > 0) {
          positiveChanges++
        } else if (movements[i].change < 0) {
          negativeChanges++
        }
      }

      const totalChanges = positiveChanges + negativeChanges
      if (totalChanges === 0) {
        return
      }

      const consistentRatio =
        Math.max(positiveChanges, negativeChanges) / totalChanges

      // If we have consistent direction in at least 70% of the changes
      if (consistentRatio >= 0.7) {
        const direction =
          positiveChanges > negativeChanges ? 'increasing' : 'decreasing'
        const totalChange =
          movements[movements.length - 1].value - movements[0].value

        patterns.push({
          type: 'progression',
          dimension: dimension as 'valence' | 'arousal' | 'dominance',
          direction,
          strength: Math.min(1, Math.abs(totalChange)),
          startTime: movements[0].time,
          endTime: movements[movements.length - 1].time,
          description: `Consistent ${direction} trend in ${dimension}`,
        })
      }
    })

    return patterns
  }

  /**
   * Detect transitions between emotional quadrants
   */
  private static detectQuadrantTransitions(
    alignedData: Array<
      EmotionAnalysis & { dimensionalMap: DimensionalEmotionMap }
    >,
  ): MultidimensionalPattern[] {
    const patterns: MultidimensionalPattern[] = []

    // Need enough data for meaningful transitions
    if (alignedData.length < 3) {
      return patterns
    }

    // Track quadrant changes
    let previousQuadrant = alignedData[0].dimensionalMap.quadrant
    let startIndex = 0

    for (let i = 1; i < alignedData.length; i++) {
      const currentQuadrant = alignedData[i].dimensionalMap.quadrant

      // If quadrant changed, record a transition
      if (currentQuadrant !== previousQuadrant) {
        patterns.push({
          type: 'quadrant_transition',
          fromQuadrant: previousQuadrant,
          toQuadrant: currentQuadrant,
          startTime: new Date(alignedData[startIndex].timestamp),
          endTime: new Date(alignedData[i].timestamp),
          strength: this.calculateTransitionStrength(
            alignedData[startIndex].dimensionalMap,
            alignedData[i].dimensionalMap,
          ),
          description: `Transition from ${previousQuadrant} to ${currentQuadrant}`,
        })

        previousQuadrant = currentQuadrant
        startIndex = i
      }
    }

    return patterns
  }

  /**
   * Calculate the strength of a quadrant transition
   */
  private static calculateTransitionStrength(
    fromMap: DimensionalEmotionMap,
    toMap: DimensionalEmotionMap,
  ): number {
    // Calculate Euclidean distance between the two primary vectors
    const from = fromMap.primaryVector
    const to = toMap.primaryVector

    const distance = Math.sqrt(
      Math.pow(to.valence - from.valence, 2) +
        Math.pow(to.arousal - from.arousal, 2) +
        Math.pow(to.dominance - from.dominance, 2),
    )

    // Normalize to 0-1 range (maximum theoretical distance is √6)
    return Math.min(1, distance / Math.sqrt(6))
  }

  /**
   * Detect patterns where one dimension dominates the emotional state
   */
  private static detectDimensionDominancePatterns(
    alignedData: Array<
      EmotionAnalysis & { dimensionalMap: DimensionalEmotionMap }
    >,
  ): MultidimensionalPattern[] {
    const patterns: MultidimensionalPattern[] = []

    // Need enough data points for a pattern
    if (alignedData.length < 5) {
      return patterns
    }

    // Count dominant dimensions
    const dominanceCount = {
      valence: 0,
      arousal: 0,
      dominance: 0,
    }

    // Count how often each dimension is dominant
    alignedData.forEach((data) => {
      if (data.dimensionalMap.dominantDimensions.length > 0) {
        const topDimension = data.dimensionalMap.dominantDimensions[0].name
        dominanceCount[topDimension]++
      }
    })

    // If a dimension is dominant in at least 70% of the data points
    Object.entries(dominanceCount).forEach(([dimension, count]) => {
      const dominanceRatio = count / alignedData.length

      if (dominanceRatio >= 0.7) {
        // Find average strength of this dimension
        let totalStrength = 0
        let strengthCount = 0

        alignedData.forEach((data) => {
          const dim = data.dimensionalMap.dominantDimensions.find(
            (d) => d.name === dimension,
          )

          if (dim) {
            totalStrength += Math.abs(dim.value)
            strengthCount++
          }
        })

        const avgStrength =
          strengthCount > 0 ? totalStrength / strengthCount : 0

        patterns.push({
          type: 'dimension_dominance',
          dimension: dimension as 'valence' | 'arousal' | 'dominance',
          strength: avgStrength,
          startTime: new Date(alignedData[0].timestamp),
          endTime: new Date(alignedData[alignedData.length - 1].timestamp),
          description: `${dimension} dominates emotional state (${(dominanceRatio * 100).toFixed(0)}% of measurements)`,
        })
      }
    })

    return patterns
  }

  // ========================
  // Utility methods
  // ========================

  /**
   * Extract emotion data grouped by emotion type
   */
  private static extractEmotionsByType(
    emotionData: EmotionAnalysis[],
  ): Record<EmotionType, Array<{ intensity: number; timestamp: Date }>> {
    const result = {} as Record<
      EmotionType,
      Array<{ intensity: number; timestamp: Date }>
    >

    // Initialize empty arrays for each emotion type
    emotionData.forEach((data) => {
      data.emotions.forEach((emotion: EmotionData) => {
        const emotionType = emotion.type as unknown as EmotionType
        if (!result[emotionType]) {
          result[emotionType] = []
        }
      })
    })

    // Populate with data
    emotionData.forEach((data) => {
      data.emotions.forEach((emotion: EmotionData) => {
        const emotionType = emotion.type as unknown as EmotionType
        result[emotionType].push({
          intensity: emotion.intensity,
          timestamp: new Date(data.timestamp),
        })
      })
    })

    return result
  }

  /**
   * Generate a human-readable description of the relationship between two emotions
   */
  private static generateRelationshipDescription(
    emotion1: EmotionType,
    emotion2: EmotionType,
    relationshipType: 'positive' | 'negative' | 'independent',
  ): string {
    if (relationshipType === 'positive') {
      return `${emotion1} and ${emotion2} tend to increase and decrease together`
    } else if (relationshipType === 'negative') {
      return `${emotion1} tends to increase when ${emotion2} decreases, and vice versa`
    } else {
      return `${emotion1} and ${emotion2} appear to vary independently`
    }
  }

  /**
   * Calculate average intensity for a group of emotion types
   */
  private static calculateTypeGroupAverage(
    emotions: Record<
      EmotionType,
      Array<{ intensity: number; timestamp: Date }>
    >,
    types: EmotionType[],
  ): number {
    let sum = 0
    let count = 0

    for (const type of types) {
      if (emotions[type]) {
        const intensities = emotions[type].map((d) => d.intensity)
        sum += this.sum(intensities)
        count += intensities.length
      }
    }

    return count > 0 ? sum / count : 0
  }

  /**
   * Categorize correlation strength into qualitative descriptions
   */
  private static categorizeStrength(
    value: number,
  ): 'weak' | 'moderate' | 'strong' {
    if (value < 0.3) {
      return 'weak'
    }
    if (value < 0.7) {
      return 'moderate'
    }
    return 'strong'
  }

  /**
   * Calculate linear regression coefficients
   */
  private static linearRegression(
    x: number[],
    y: number[],
  ): { slope: number; intercept: number; correlation: number } {
    const n = x.length

    // Calculate means
    const xMean = this.mean(x)
    const yMean = this.mean(y)

    // Calculate sums for slope and intercept
    let numerator = 0
    let denominator = 0

    for (let i = 0; i < n; i++) {
      const xDiff = x[i] - xMean
      const yDiff = y[i] - yMean
      numerator += xDiff * yDiff
      denominator += xDiff * xDiff
    }

    // Calculate slope and intercept
    const slope = denominator !== 0 ? numerator / denominator : 0
    const intercept = yMean - slope * xMean

    // Calculate correlation coefficient
    const correlation = this.correlationCoefficient(x, y)

    return { slope, intercept, correlation }
  }

  /**
   * Calculate Pearson correlation coefficient
   */
  private static correlationCoefficient(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length)

    if (n < 2) {
      return 0
    }

    // Calculate means
    const xMean = this.mean(x.slice(0, n))
    const yMean = this.mean(y.slice(0, n))

    // Calculate correlation coefficient
    let numerator = 0
    let denomX = 0
    let denomY = 0

    for (let i = 0; i < n; i++) {
      const xDiff = x[i] - xMean
      const yDiff = y[i] - yMean
      numerator += xDiff * yDiff
      denomX += xDiff * xDiff
      denomY += yDiff * yDiff
    }

    const denominator = Math.sqrt(denomX * denomY)

    return denominator !== 0 ? numerator / denominator : 0
  }

  /**
   * Calculate the mean of an array of numbers
   */
  private static mean(values: number[]): number {
    if (values.length > 0) {
      return this.sum(values) / values.length
    }
    return 0
  }

  /**
   * Calculate the sum of an array of numbers
   */
  private static sum(values: number[]): number {
    return values.reduce((acc, val) => acc + val, 0)
  }

  /**
   * Calculate the standard deviation of an array of numbers
   */
  private static standardDeviation(values: number[]): number {
    if (values.length < 2) {
      return 0
    }

    const avg = this.mean(values)
    const squareDiffs = values.map((value) => {
      const diff = value - avg
      return diff * diff
    })

    const variance = this.sum(squareDiffs) / (values.length - 1)
    return Math.sqrt(variance)
  }

  /**
   * Calculate confidence interval
   */
  private static calculateConfidenceInterval(
    values: number[],
  ): [number, number] {
    if (values.length < 2) {
      return [0, 0]
    }

    const avg = this.mean(values)
    const stdDev = this.standardDeviation(values)
    const marginOfError = (1.96 * stdDev) / Math.sqrt(values.length)

    return [avg - marginOfError, avg + marginOfError]
  }

  /**
   * Calculate a percentile value
   */
  private static percentile(values: number[], percentile: number): number {
    if (values.length === 0) {
      return 0
    }

    // Sort values
    const sorted = [...values].sort((a, b) => a - b)

    // Calculate index
    const index = (percentile / 100) * (sorted.length - 1)

    // If index is an integer, return the value at that index
    if (index % 1 === 0) {
      return sorted[index]
    }

    // Otherwise, interpolate between the two nearest values
    const lower = Math.floor(index)
    const upper = Math.ceil(index)
    const weight = index - lower

    return sorted[lower] * (1 - weight) + sorted[upper] * weight
  }
}
