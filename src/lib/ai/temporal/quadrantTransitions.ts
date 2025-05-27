import type { DimensionalEmotionMap } from '../emotions/dimensionalTypes'
import type { QuadrantTransitionPattern } from './types'

/**
 * Represents a quadrant in the PAD (Pleasure-Arousal-Dominance) model space
 */
interface PADQuadrant {
  id: string
  name: string
  description: string
  bounds: {
    pleasure: [number, number]
    arousal: [number, number]
    dominance: [number, number]
  }
  clinicalMeaning: string
}

/**
 * Defines the quadrants in PAD space
 * Each quadrant represents a distinct emotional region with clinical meaning
 */
const PAD_QUADRANTS: PADQuadrant[] = [
  {
    id: 'Q1',
    name: 'High Pleasure, High Arousal',
    description: 'Excited, Elated, Enthusiastic',
    bounds: {
      pleasure: [0, 1],
      arousal: [0, 1],
      dominance: [-1, 1],
    },
    clinicalMeaning: 'Active positive engagement, potentially heightened mood',
  },
  {
    id: 'Q2',
    name: 'High Pleasure, Low Arousal',
    description: 'Relaxed, Content, Serene',
    bounds: {
      pleasure: [0, 1],
      arousal: [-1, 0],
      dominance: [-1, 1],
    },
    clinicalMeaning:
      'Calm positive state, reduced reactivity with satisfaction',
  },
  {
    id: 'Q3',
    name: 'Low Pleasure, Low Arousal',
    description: 'Depressed, Bored, Fatigued',
    bounds: {
      pleasure: [-1, 0],
      arousal: [-1, 0],
      dominance: [-1, 1],
    },
    clinicalMeaning:
      'Potential emotional withdrawal, reduced motivation or energy',
  },
  {
    id: 'Q4',
    name: 'Low Pleasure, High Arousal',
    description: 'Frustrated, Anxious, Stressed',
    bounds: {
      pleasure: [-1, 0],
      arousal: [0, 1],
      dominance: [-1, 1],
    },
    clinicalMeaning:
      'Distress activation, heightened negative emotional arousal',
  },
]

/**
 * Common transition patterns with clinical interpretations
 */
const CLINICAL_TRANSITION_PATTERNS = {
  'Q1->Q2': 'Shift from excitement to contentment (emotional settling)',
  'Q2->Q1': 'Shift from contentment to excitement (emotional activation)',
  'Q1->Q4':
    'Shift from positive to negative high arousal (mood deterioration with continued activation)',
  'Q4->Q1':
    'Shift from negative to positive high arousal (emotional improvement with maintained energy)',
  'Q2->Q3':
    'Shift from contentment to depression (mood deterioration with low energy)',
  'Q3->Q2':
    'Shift from depression to contentment (emotional improvement with maintained calmness)',
  'Q3->Q4': 'Shift from depression to anxiety (increased distress activation)',
  'Q4->Q3':
    'Shift from anxiety to depression (emotional deactivation while maintaining negative valence)',
  'Q1->Q3':
    'Major shift from positive-activated to negative-deactivated (significant mood deterioration)',
  'Q3->Q1':
    'Major shift from negative-deactivated to positive-activated (significant mood improvement)',
  'Q2->Q4':
    'Shift from relaxed to distressed (significant mood deterioration with arousal increase)',
  'Q4->Q2':
    'Shift from distressed to relaxed (significant emotional improvement with arousal decrease)',
}

/**
 * Determines which quadrant a point in PAD space belongs to
 * Handles both legacy and new data formats
 */
function getQuadrant(point: DimensionalEmotionMap): PADQuadrant {
  // Extract pleasure/valence value considering both formats
  let pleasure = 0
  if ('pleasure' in point) {
    pleasure = point.pleasure as number
  } else if ('valence' in point) {
    pleasure = point.valence as number
  } else if (point.primaryVector && 'pleasure' in point.primaryVector) {
    pleasure = point.primaryVector.pleasure
  } else if (point.primaryVector && 'valence' in point.primaryVector) {
    pleasure = point.primaryVector.valence
  }

  // Extract arousal value considering both formats
  let arousal = 0
  if ('arousal' in point) {
    arousal = point.arousal as number
  } else if (point.primaryVector && 'arousal' in point.primaryVector) {
    arousal = point.primaryVector.arousal
  }

  return (
    PAD_QUADRANTS.find(
      (quadrant) =>
        pleasure >= quadrant.bounds.pleasure[0] &&
        pleasure <= quadrant.bounds.pleasure[1] &&
        arousal >= quadrant.bounds.arousal[0] &&
        arousal <= quadrant.bounds.arousal[1],
    ) || PAD_QUADRANTS[0]
  ) // Default to Q1 if no match (shouldn't happen with proper bounds)
}

/**
 * Calculates the strength of a transition based on the distance between points
 * and the clinical significance of the transition type
 */
function calculateTransitionStrength(
  point1: DimensionalEmotionMap,
  point2: DimensionalEmotionMap,
  fromQuadrant: PADQuadrant,
  toQuadrant: PADQuadrant,
): number {
  // Calculate distance component (Euclidean distance in 3D space)
  const getValueSafely = (
    point: DimensionalEmotionMap,
    dimension: string,
  ): number => {
    if (dimension in point) {
      return point[dimension as keyof DimensionalEmotionMap] as number
    } else if (point.primaryVector && dimension in point.primaryVector) {
      return point.primaryVector[dimension as keyof typeof point.primaryVector]
    }
    return 0
  }

  const p1 = getValueSafely(point1, 'pleasure')
  const p2 = getValueSafely(point2, 'pleasure')
  const a1 = getValueSafely(point1, 'arousal')
  const a2 = getValueSafely(point2, 'arousal')
  const d1 = getValueSafely(point1, 'dominance')
  const d2 = getValueSafely(point2, 'dominance')

  const distance = Math.sqrt(
    Math.pow(p2 - p1, 2) + Math.pow(a2 - a1, 2) + Math.pow(d2 - d1, 2),
  )

  // Normalize to [0,1] range assuming max possible distance is sqrt(12) (corners of PAD cube)
  const distanceComponent = Math.min(distance / Math.sqrt(12), 1)

  // Calculate clinical significance component
  const transitionKey = `${fromQuadrant.id}->${toQuadrant.id}`
  // Clinical significance multiplier is higher for clinically meaningful transitions
  const clinicalSignificance = CLINICAL_TRANSITION_PATTERNS[transitionKey]
    ? 1.2
    : 1

  // Emotional diagonal transitions (Q1->Q3 or Q2->Q4) are particularly significant
  const diagonalMultiplier =
    (fromQuadrant.id === 'Q1' && toQuadrant.id === 'Q3') ||
    (fromQuadrant.id === 'Q3' && toQuadrant.id === 'Q1') ||
    (fromQuadrant.id === 'Q2' && toQuadrant.id === 'Q4') ||
    (fromQuadrant.id === 'Q4' && toQuadrant.id === 'Q2')
      ? 1.3
      : 1

  // Final strength is a combination of distance and clinical factors, capped at 1.0
  return Math.min(
    distanceComponent * clinicalSignificance * diagonalMultiplier,
    1,
  )
}

/**
 * Generates a clinical interpretation for a given transition
 */
function getClinicalInterpretation(
  fromQuadrant: PADQuadrant,
  toQuadrant: PADQuadrant,
): string {
  const transitionKey = `${fromQuadrant.id}->${toQuadrant.id}`

  if (transitionKey in CLINICAL_TRANSITION_PATTERNS) {
    return CLINICAL_TRANSITION_PATTERNS[transitionKey]
  }

  // Generic interpretation if no specific pattern is found
  return (
    `Transition from ${fromQuadrant.description} to ${toQuadrant.description}, ` +
    `moving from ${fromQuadrant.clinicalMeaning} to ${toQuadrant.clinicalMeaning}`
  )
}

/**
 * Detects quadrant transitions in a sequence of PAD points
 */
export function detectQuadrantTransitions(
  emotionMaps: DimensionalEmotionMap[],
  minTransitionStrength = 0.2, // Minimum strength threshold to consider a transition significant
): QuadrantTransitionPattern[] {
  if (!emotionMaps || emotionMaps.length < 2) {
    return []
  }

  const transitions: QuadrantTransitionPattern[] = []
  let currentQuadrant = getQuadrant(emotionMaps[0])

  for (let i = 1; i < emotionMaps.length; i++) {
    const newQuadrant = getQuadrant(emotionMaps[i])

    // If quadrant changed, record the transition
    if (newQuadrant.id !== currentQuadrant.id) {
      const strength = calculateTransitionStrength(
        emotionMaps[i - 1],
        emotionMaps[i],
        currentQuadrant,
        newQuadrant,
      )

      // Only record significant transitions
      if (strength >= minTransitionStrength) {
        const clinicalInterpretation = getClinicalInterpretation(
          currentQuadrant,
          newQuadrant,
        )

        // Create timestamp objects, handling both string and Date formats
        const startTime = new Date(
          typeof emotionMaps[i - 1].timestamp === 'string'
            ? emotionMaps[i - 1].timestamp
            : emotionMaps[i - 1].timestamp.toISOString(),
        )

        const endTime = new Date(
          typeof emotionMaps[i].timestamp === 'string'
            ? emotionMaps[i].timestamp
            : emotionMaps[i].timestamp.toISOString(),
        )

        transitions.push({
          type: 'quadrant_transition',
          fromQuadrant: currentQuadrant.id,
          toQuadrant: newQuadrant.id,
          strength,
          startTime,
          endTime,
          description: `Transition from ${currentQuadrant.description} to ${newQuadrant.description}`,
          clinicalInterpretation,
        })
      }
    }

    currentQuadrant = newQuadrant
  }

  return transitions
}

/**
 * Analyzes a collection of quadrant transitions to identify significant patterns
 */
export function analyzeQuadrantTransitions(
  transitions: QuadrantTransitionPattern[],
): string[] {
  if (!transitions || transitions.length === 0) {
    return []
  }

  const insights: string[] = []

  // Find the most significant transition
  const mostSignificant = transitions.reduce((prev, current) =>
    current.strength > prev.strength ? current : prev,
  )

  insights.push(
    `Most significant emotional transition: ${mostSignificant.description} ` +
      `(${(mostSignificant.strength * 100).toFixed(1)}% strength).`,
  )

  if (mostSignificant.clinicalInterpretation) {
    insights.push(
      `Clinical significance: ${mostSignificant.clinicalInterpretation}`,
    )
  }

  // Count transitions between each quadrant pair
  const transitionCounts: Record<string, number> = {}

  for (const transition of transitions) {
    const key = `${transition.fromQuadrant}->${transition.toQuadrant}`
    transitionCounts[key] = (transitionCounts[key] || 0) + 1
  }

  // Identify frequent transitions (occurring more than once)
  const frequentTransitions = Object.entries(transitionCounts)
    .filter(([_, count]) => count > 1)
    .sort(([_, countA], [__, countB]) => countB - countA)

  if (frequentTransitions.length > 0) {
    const [pattern, count] = frequentTransitions[0]
    const [fromQuadrant, toQuadrant] = pattern.split('->')

    const fromQuadrantInfo = PAD_QUADRANTS.find((q) => q.id === fromQuadrant)
    const toQuadrantInfo = PAD_QUADRANTS.find((q) => q.id === toQuadrant)

    if (fromQuadrantInfo && toQuadrantInfo) {
      insights.push(
        `Recurring pattern detected: ${count} transitions from ` +
          `${fromQuadrantInfo.description} to ${toQuadrantInfo.description}, ` +
          `suggesting emotional oscillation or sensitivity.`,
      )

      // Add clinical interpretation for recurring pattern
      if (pattern in CLINICAL_TRANSITION_PATTERNS) {
        insights.push(
          `This recurring pattern indicates: ${CLINICAL_TRANSITION_PATTERNS[pattern]}`,
        )
      }
    }
  }

  // Check for emotional volatility (many transitions in a short time)
  if (transitions.length >= 3) {
    const timeSpan =
      transitions[transitions.length - 1].endTime.getTime() -
      transitions[0].startTime.getTime()

    // Calculate transitions per hour
    const transitionsPerHour = (transitions.length / timeSpan) * 3600000

    if (transitionsPerHour >= 3) {
      insights.push(
        `High emotional volatility detected: ${transitions.length} quadrant transitions ` +
          `over ${(timeSpan / 60000).toFixed(1)} minutes, suggesting emotional instability.`,
      )
    }
  }

  return insights
}
