/**
 * Progression Pattern Detection Example
 *
 * This example demonstrates how to use the progression pattern detection
 * to identify consistent emotional trends over time.
 */

import { detectTemporalPatterns, analyzePatterns } from '../patternDetection'
import type { DimensionalEmotionMap } from '../../emotions/dimensionalTypes'
import { getLogger } from '../../../logging'

const logger = getLogger({ prefix: 'progression-pattern-example' })

/**
 * Creates sample data with a progression pattern in the given dimension
 */
function createProgressionExampleData(
  dimension: 'valence' | 'arousal' | 'dominance',
  direction: 'increasing' | 'decreasing',
): DimensionalEmotionMap[] {
  const timestamp = new Date('2025-05-01T10:00:00Z')
  const points: DimensionalEmotionMap[] = []
  const pointCount = 6

  // Default values for each dimension
  const defaultValues = {
    valence: 0.5,
    arousal: 0.5,
    dominance: 0.5,
  }

  // Create data points with progression in the specified dimension
  for (let i = 0; i < pointCount; i++) {
    const dataPoint = {
      timestamp: new Date(
        timestamp.getTime() + i * 30 * 60 * 1000,
      ).toISOString(),
      valence: defaultValues.valence,
      arousal: defaultValues.arousal,
      dominance: defaultValues.dominance,
    }

    // Apply progression based on direction
    if (direction === 'increasing') {
      dataPoint[dimension] = 0.2 + (i * 0.6) / (pointCount - 1)
    } else {
      dataPoint[dimension] = 0.8 - (i * 0.6) / (pointCount - 1)
    }

    points.push(dataPoint as DimensionalEmotionMap)
  }

  return points
}

/**
 * Run the progression pattern detection example
 */
export async function runProgressionPatternExample(): Promise<void> {
  logger.info('Starting progression pattern detection example')

  // Create example data with increasing valence trend
  logger.info('Example 1: Detecting increasing valence trend')
  const increasingValenceData = createProgressionExampleData(
    'valence',
    'increasing',
  )
  const increasingPatterns = detectTemporalPatterns(increasingValenceData)
  const increasingInsights = analyzePatterns(increasingPatterns)

  logger.info('Increasing valence example results:')
  const increasingProgressions = increasingPatterns.filter(
    (p) => p.type === 'progression',
  )
  logger.info(`Found ${increasingProgressions.length} progression patterns`)
  increasingProgressions.forEach((p) => {
    logger.info(
      `- ${p.dimension} ${p.direction} (strength: ${p.strength.toFixed(2)})`,
    )
  })
  logger.info('Analysis insights:')
  increasingInsights.forEach((insight) => {
    logger.info(`- ${insight}`)
  })

  // Create example data with decreasing arousal trend
  logger.info('\nExample 2: Detecting decreasing arousal trend')
  const decreasingArousalData = createProgressionExampleData(
    'arousal',
    'decreasing',
  )
  const decreasingPatterns = detectTemporalPatterns(decreasingArousalData)
  const decreasingInsights = analyzePatterns(decreasingPatterns)

  logger.info('Decreasing arousal example results:')
  const decreasingProgressions = decreasingPatterns.filter(
    (p) => p.type === 'progression',
  )
  logger.info(`Found ${decreasingProgressions.length} progression patterns`)
  decreasingProgressions.forEach((p) => {
    logger.info(
      `- ${p.dimension} ${p.direction} (strength: ${p.strength.toFixed(2)})`,
    )
  })
  logger.info('Analysis insights:')
  decreasingInsights.forEach((insight) => {
    logger.info(`- ${insight}`)
  })

  // Create more complex example with multiple dimensions changing
  logger.info('\nExample 3: Multiple dimension changes')
  const timestamp = new Date('2025-05-01T10:00:00Z')
  const complexData: DimensionalEmotionMap[] = []

  for (let i = 0; i < 6; i++) {
    complexData.push({
      timestamp: new Date(
        timestamp.getTime() + i * 30 * 60 * 1000,
      ).toISOString(),
      valence: 0.3 + (i * 0.4) / 5, // Increasing valence
      arousal: 0.7 - (i * 0.5) / 5, // Decreasing arousal
      dominance: 0.5, // Stable dominance
    } as DimensionalEmotionMap)
  }

  const complexPatterns = detectTemporalPatterns(complexData)
  const complexInsights = analyzePatterns(complexPatterns)

  logger.info('Complex example results:')
  const complexProgressions = complexPatterns.filter(
    (p) => p.type === 'progression',
  )
  logger.info(`Found ${complexProgressions.length} progression patterns`)
  complexProgressions.forEach((p) => {
    logger.info(
      `- ${p.dimension} ${p.direction} (strength: ${p.strength.toFixed(2)})`,
    )
  })
  logger.info('Analysis insights:')
  complexInsights.forEach((insight) => {
    logger.info(`- ${insight}`)
  })

  logger.info('\nProgression pattern detection example completed')
}

// Run the example if this file is executed directly
if (require.main === module) {
  runProgressionPatternExample()
    .then(() => {
      console.log('Example completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Example failed:', error)
      process.exit(1)
    })
}
