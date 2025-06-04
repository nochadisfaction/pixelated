import {
  detectQuadrantTransitions,
  analyzeQuadrantTransitions,
} from '../quadrantTransitions'
import { detectTemporalPatterns, analyzePatterns } from '../patternDetection'
import type { DimensionalEmotionMap } from '../../emotions/dimensionalTypes'

/**
 * Example demonstrating quadrant transition detection and analysis
 */
export function demonstrateQuadrantTransitions() {
  console.log('======== Quadrant Transition Detection Example ========')

  // Sample emotional journey data
  const emotionalJourney: DimensionalEmotionMap[] =
    generateSampleEmotionalJourney()

  console.log(
    `Generated sample emotional journey with ${emotionalJourney.length} data points`,
  )

  // Direct usage of quadrant transition detection
  console.log('\n---- Direct Quadrant Transition Detection ----')
  const transitions = detectQuadrantTransitions(emotionalJourney)
  console.log(`Detected ${transitions.length} quadrant transitions:`)

  transitions.forEach((transition, index) => {
    console.log(`\nTransition ${index + 1}:`)
    console.log(
      `- From: ${transition.fromQuadrant} to ${transition.toQuadrant}`,
    )
    console.log(`- Strength: ${(transition.strength * 100).toFixed(1)}%`)
    console.log(
      `- Time: ${transition.startTime.toISOString()} to ${transition.endTime.toISOString()}`,
    )
    console.log(`- Description: ${transition.description}`)
    console.log(
      `- Clinical Interpretation: ${transition.clinicalInterpretation || 'None'}`,
    )
  })

  // Clinical analysis of transitions
  console.log('\n---- Clinical Analysis of Quadrant Transitions ----')
  const insights = analyzeQuadrantTransitions(transitions)
  console.log('Clinical Insights:')
  insights.forEach((insight, index) => {
    console.log(`${index + 1}. ${insight}`)
  })

  // Integration with the broader pattern detection system
  console.log('\n---- Integration with Pattern Detection System ----')
  const allPatterns = detectTemporalPatterns(emotionalJourney)
  const quadrantPatterns = allPatterns.filter(
    (p) => p.type === 'quadrant_transition',
  )
  console.log(
    `Detected ${allPatterns.length} total patterns, including ${quadrantPatterns.length} quadrant transitions`,
  )

  // Comprehensive pattern analysis
  console.log('\n---- Comprehensive Pattern Analysis ----')
  const comprehensiveInsights = analyzePatterns(allPatterns)
  console.log('Comprehensive Pattern Insights:')
  comprehensiveInsights.forEach((insight, index) => {
    console.log(`${index + 1}. ${insight}`)
  })

  return { transitions, insights, allPatterns, comprehensiveInsights }
}

/**
 * Generate realistic emotional journey data following a therapeutic narrative
 *
 * This example shows a client starting in a stressed state (Q4),
 * gradually moving to a depressed state (Q3),
 * then showing signs of emotional improvement and fluctuation during therapy,
 * and ending in a more positive and relaxed state (Q2)
 */
function generateSampleEmotionalJourney(): DimensionalEmotionMap[] {
  // Create a therapeutic emotional journey
  const journey: DimensionalEmotionMap[] = []
  const startDate = new Date('2025-01-01T10:00:00Z')
  // Define session duration but we'll use direct time calculations instead
  const _sessionDuration = 50 * 60 * 1000 // 50 minutes in milliseconds

  // Phase 1: Initial Assessment - Client presents with anxiety (Q4)
  for (let i = 0; i < 5; i++) {
    journey.push(
      createEmotionMap(
        new Date(startDate.getTime() + i * 60000),
        -0.6 - Math.random() * 0.2, // Strong negative valence
        0.7 + Math.random() * 0.2, // High arousal/activation
        -0.3 - Math.random() * 0.3, // Low sense of control
      ),
    )
  }

  // Phase 2: Session 2 - Deeper exploration, moving from anxiety to depression (Q4 -> Q3)
  const session2Date = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000) // 1 week later
  for (let i = 0; i < 5; i++) {
    journey.push(
      createEmotionMap(
        new Date(session2Date.getTime() + i * 60000),
        -0.6 - Math.random() * 0.3,
        0.5 - i * 0.2, // Decreasing arousal over session
        -0.4,
      ),
    )
  }

  // Phase 3: Session 3 - Depressive state (Q3)
  const session3Date = new Date(
    session2Date.getTime() + 7 * 24 * 60 * 60 * 1000,
  )
  for (let i = 0; i < 5; i++) {
    journey.push(
      createEmotionMap(
        new Date(session3Date.getTime() + i * 60000),
        -0.7 - Math.random() * 0.2,
        -0.5 - Math.random() * 0.3,
        -0.5,
      ),
    )
  }

  // Phase 4: Session 4 - Beginning of improvement (Q3 -> Q2)
  const session4Date = new Date(
    session3Date.getTime() + 7 * 24 * 60 * 60 * 1000,
  )
  for (let i = 0; i < 5; i++) {
    journey.push(
      createEmotionMap(
        new Date(session4Date.getTime() + i * 60000),
        -0.3 + i * 0.15, // Increasing valence
        -0.6 + i * 0.05, // Slightly increasing arousal
        -0.3 + i * 0.1, // Increasing sense of control
      ),
    )
  }

  // Phase 5: Session 5 - Fluctuation between positive and negative states (Q1 <-> Q4)
  const session5Date = new Date(
    session4Date.getTime() + 7 * 24 * 60 * 60 * 1000,
  )
  journey.push(
    createEmotionMap(new Date(session5Date.getTime()), 0.3, 0.4, 0.1),
  )
  journey.push(
    createEmotionMap(
      new Date(session5Date.getTime() + 10 * 60000),
      -0.2,
      0.5,
      -0.1,
    ),
  )
  journey.push(
    createEmotionMap(
      new Date(session5Date.getTime() + 20 * 60000),
      0.4,
      0.3,
      0.2,
    ),
  )
  journey.push(
    createEmotionMap(
      new Date(session5Date.getTime() + 30 * 60000),
      -0.3,
      0.6,
      -0.2,
    ),
  )
  journey.push(
    createEmotionMap(
      new Date(session5Date.getTime() + 40 * 60000),
      0.5,
      0.4,
      0.3,
    ),
  )

  // Phase 6: Session 6 - Stabilizing in a more positive and calm state (Q2)
  const session6Date = new Date(
    session5Date.getTime() + 7 * 24 * 60 * 60 * 1000,
  )
  for (let i = 0; i < 5; i++) {
    journey.push(
      createEmotionMap(
        new Date(session6Date.getTime() + i * 60000),
        0.5 + Math.random() * 0.2,
        -0.3 - Math.random() * 0.2,
        0.4 + Math.random() * 0.2,
      ),
    )
  }

  return journey
}

/**
 * Helper function to create a DimensionalEmotionMap with proper structure
 */
function createEmotionMap(
  timestamp: Date,
  valence: number,
  arousal: number,
  dominance: number,
): DimensionalEmotionMap {
  // Create the primary vector with the given dimensions
  const primaryVector = {
    valence,
    arousal,
    dominance,
    intensity:
      Math.sqrt(valence * valence + arousal * arousal + dominance * dominance) /
      Math.sqrt(3),
  }

  // Determine the quadrant based on dimensions
  let quadrant = ''
  if (valence >= 0 && arousal >= 0) {
    quadrant = 'high-arousal positive-valence'
  } else if (valence >= 0 && arousal < 0) {
    quadrant = 'low-arousal positive-valence'
  } else if (valence < 0 && arousal < 0) {
    quadrant = 'low-arousal negative-valence'
  } else {
    quadrant = 'high-arousal negative-valence'
  }

  if (dominance >= 0) {
    quadrant += ' high-dominance'
  } else {
    quadrant += ' low-dominance'
  }

  // Create the dimensional distribution
  const dimensionalDistribution = {
    valence: {
      positive: valence > 0 ? valence : 0,
      negative: valence < 0 ? -valence : 0,
    },
    arousal: {
      high: arousal > 0 ? arousal : 0,
      low: arousal < 0 ? -arousal : 0,
    },
    dominance: {
      high: dominance > 0 ? dominance : 0,
      low: dominance < 0 ? -dominance : 0,
    },
  }

  // Create dominant dimensions
  const dimensionStrength = (value: number): 'weak' | 'moderate' | 'strong' => {
    const absValue = Math.abs(value)
    if (absValue < 0.3) {
      return 'weak'
    }
    if (absValue < 0.7) {
      return 'moderate'
    }
    return 'strong'
  }

  const dimensionPolarity = (
    name: 'valence' | 'arousal' | 'dominance',
    value: number,
  ): 'positive' | 'negative' | 'high' | 'low' => {
    if (name === 'valence') {
      return value >= 0 ? 'positive' : 'negative'
    }
    return value >= 0 ? 'high' : 'low'
  }

  const createDimension = (
    name: 'valence' | 'arousal' | 'dominance',
    value: number,
  ) => ({
    name,
    value,
    polarity: dimensionPolarity(name, value),
    strength: dimensionStrength(value),
  })

  const dominantDimensions = [
    createDimension('valence', valence),
    createDimension('arousal', arousal),
    createDimension('dominance', dominance),
  ].sort((a, b) => Math.abs(b.value) - Math.abs(a.value))

  return {
    timestamp,
    primaryVector,
    emotionVectors: [primaryVector],
    quadrant,
    intensity: primaryVector.intensity,
    dimensionalDistribution,
    dominantDimensions,
    // Optionally map to a categorical emotion
    mappedEmotion: determineMappedEmotion(valence, arousal, dominance),
  }
}

/**
 * Helper function to map dimensional values to a categorical emotion
 */
function determineMappedEmotion(
  valence: number,
  arousal: number,
  _dominance: number,
): string {
  // Simplified emotion mapping based on quadrant
  if (valence >= 0.4 && arousal >= 0.4) {
    return 'Joy'
  }
  if (valence >= 0.4 && arousal < 0) {
    return 'Contentment'
  }
  if (valence < 0 && arousal >= 0.4) {
    return 'Anger'
  }
  if (valence < 0 && arousal < 0 && valence > -0.5) {
    return 'Sadness'
  }
  if (valence <= -0.5 && arousal <= -0.3) {
    return 'Depression'
  }
  if (valence < 0 && arousal >= 0 && arousal < 0.4) {
    return 'Frustration'
  }

  // Default mapping if no specific pattern is matched
  return 'Neutral'
}

// Uncomment to run the example directly
// if (typeof window === 'undefined') {
//   demonstrateQuadrantTransitions()
// }

export default demonstrateQuadrantTransitions
