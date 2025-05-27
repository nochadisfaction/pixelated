/**
 * Dimension Dominance Pattern Detection Example
 *
 * This example demonstrates how to detect when one emotional dimension (valence, arousal, dominance)
 * consistently dominates the others across multiple time points.
 */

import { detectTemporalPatterns, analyzePatterns } from '../patternDetection'
import type { DimensionalEmotionMap } from '../../emotions/dimensionalTypes'
import { getLogger } from '../../../logging'

const logger = getLogger({ prefix: 'dimension-dominance-example' })

/**
 * Creates sample data with a dominant emotional dimension
 */
function createDominanceExampleData(
  dominantDimension: 'valence' | 'arousal' | 'dominance',
  strength = 0.8,
  points = 6,
): DimensionalEmotionMap[] {
  const timestamp = new Date('2025-05-01T10:00:00Z')
  const data: DimensionalEmotionMap[] = []

  // Value for the dominant dimension
  const dominantValue = strength
  // Value for non-dominant dimensions (significantly lower)
  const otherValue = strength * 0.4

  for (let i = 0; i < points; i++) {
    // Create a map with all dimensions having the lower value by default
    const map: Partial<DimensionalEmotionMap> = {
      timestamp: new Date(
        timestamp.getTime() + i * 30 * 60 * 1000,
      ).toISOString(),
      valence: otherValue,
      arousal: otherValue,
      dominance: otherValue,
    }

    // Set the dominant dimension to the higher value
    map[dominantDimension] = dominantValue

    // Add slight variations to make the data more realistic
    const variation = Math.random() * 0.1 - 0.05 // -0.05 to +0.05
    if (map[dominantDimension]) {
      map[dominantDimension] = Math.min(
        1,
        Math.max(0, (map[dominantDimension] as number) + variation),
      )
    }

    data.push(map as DimensionalEmotionMap)
  }

  return data
}

/**
 * Run the dimension dominance detection example
 */
export async function runDimensionDominanceExample(): Promise<void> {
  logger.info('Starting dimension dominance detection example')

  // Example 1: Valence Dominance (focus on emotional positivity/negativity)
  logger.info('\nExample 1: Valence Dominance')
  const valenceData = createDominanceExampleData('valence')
  const valencePatterns = detectTemporalPatterns(valenceData)
  const valenceDominance = valencePatterns.filter(
    (p) => p.type === 'dimension_dominance',
  )
  const valenceInsights = analyzePatterns(valencePatterns)

  logger.info('Valence dominance detection results:')
  if (valenceDominance.length > 0) {
    logger.info(
      `Found ${valenceDominance.length} dimension dominance patterns:`,
    )
    valenceDominance.forEach((p) => {
      logger.info(
        `- ${p.dimension} dominance (strength: ${p.strength.toFixed(2)})`,
      )
      logger.info(`  Description: ${p.description}`)
    })
  } else {
    logger.info('No dimension dominance patterns detected')
  }

  logger.info('Analysis insights:')
  valenceInsights.forEach((insight) => {
    logger.info(`- ${insight}`)
  })

  // Example 2: Arousal Dominance (focus on energy/activation level)
  logger.info('\nExample 2: Arousal Dominance')
  const arousalData = createDominanceExampleData('arousal')
  const arousalPatterns = detectTemporalPatterns(arousalData)
  const arousalDominance = arousalPatterns.filter(
    (p) => p.type === 'dimension_dominance',
  )
  const arousalInsights = analyzePatterns(arousalPatterns)

  logger.info('Arousal dominance detection results:')
  if (arousalDominance.length > 0) {
    logger.info(
      `Found ${arousalDominance.length} dimension dominance patterns:`,
    )
    arousalDominance.forEach((p) => {
      logger.info(
        `- ${p.dimension} dominance (strength: ${p.strength.toFixed(2)})`,
      )
      logger.info(`  Description: ${p.description}`)
    })
  } else {
    logger.info('No dimension dominance patterns detected')
  }

  logger.info('Analysis insights:')
  arousalInsights.forEach((insight) => {
    logger.info(`- ${insight}`)
  })

  // Example 3: Dominance Dimension (focus on feelings of control)
  logger.info('\nExample 3: Dominance Dimension')
  const dominanceData = createDominanceExampleData('dominance')
  const dominancePatterns = detectTemporalPatterns(dominanceData)
  const dominanceDominance = dominancePatterns.filter(
    (p) => p.type === 'dimension_dominance',
  )
  const dominanceInsights = analyzePatterns(dominancePatterns)

  logger.info('Dominance dimension detection results:')
  if (dominanceDominance.length > 0) {
    logger.info(
      `Found ${dominanceDominance.length} dimension dominance patterns:`,
    )
    dominanceDominance.forEach((p) => {
      logger.info(
        `- ${p.dimension} dominance (strength: ${p.strength.toFixed(2)})`,
      )
      logger.info(`  Description: ${p.description}`)
    })
  } else {
    logger.info('No dimension dominance patterns detected')
  }

  logger.info('Analysis insights:')
  dominanceInsights.forEach((insight) => {
    logger.info(`- ${insight}`)
  })

  // Example 4: No Dominance (balanced dimensions)
  logger.info('\nExample 4: No Dominance (balanced dimensions)')

  const balancedData: DimensionalEmotionMap[] = []
  const startTime = new Date('2025-05-01T10:00:00Z')

  for (let i = 0; i < 6; i++) {
    balancedData.push({
      timestamp: new Date(
        startTime.getTime() + i * 30 * 60 * 1000,
      ).toISOString(),
      valence: 0.5 + (Math.random() * 0.2 - 0.1), // 0.4-0.6
      arousal: 0.5 + (Math.random() * 0.2 - 0.1), // 0.4-0.6
      dominance: 0.5 + (Math.random() * 0.2 - 0.1), // 0.4-0.6
    } as DimensionalEmotionMap)
  }

  const balancedPatterns = detectTemporalPatterns(balancedData)
  const balancedDominance = balancedPatterns.filter(
    (p) => p.type === 'dimension_dominance',
  )
  const balancedInsights = analyzePatterns(balancedPatterns)

  logger.info('Balanced dimensions detection results:')
  if (balancedDominance.length > 0) {
    logger.info(
      `Found ${balancedDominance.length} dimension dominance patterns:`,
    )
    balancedDominance.forEach((p) => {
      logger.info(
        `- ${p.dimension} dominance (strength: ${p.strength.toFixed(2)})`,
      )
      logger.info(`  Description: ${p.description}`)
    })
  } else {
    logger.info(
      'No dimension dominance patterns detected (expected for balanced dimensions)',
    )
  }

  logger.info('Analysis insights:')
  if (balancedInsights.length > 0) {
    balancedInsights.forEach((insight) => {
      logger.info(`- ${insight}`)
    })
  } else {
    logger.info('No significant insights found for balanced dimensions')
  }

  logger.info('\nDimension dominance detection example completed')
}

// Run the example if this file is executed directly
if (require.main === module) {
  runDimensionDominanceExample()
    .then(() => {
      console.log('Example completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Example failed:', error)
      process.exit(1)
    })
}
