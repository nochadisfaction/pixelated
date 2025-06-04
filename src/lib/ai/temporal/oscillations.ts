import type { DimensionalEmotionMap } from '../emotions/dimensionalTypes'
import type { OscillationPattern } from './types'

interface Peak {
  index: number
  value: number
  timestamp: string
}

interface Valley {
  index: number
  value: number
  timestamp: string
}

interface Oscillation {
  peaks: Peak[]
  valleys: Valley[]
  averageAmplitude: number
  frequency: number // oscillations per hour
  startTime: Date
  endTime: Date
}

/**
 * Simple moving average to smooth noisy data
 */
function calculateMovingAverage(
  values: number[],
  windowSize: number,
): number[] {
  const result: number[] = []

  for (let i = 0; i < values.length; i++) {
    let sum = 0
    let count = 0

    for (
      let j = Math.max(0, i - Math.floor(windowSize / 2));
      j <= Math.min(values.length - 1, i + Math.floor(windowSize / 2));
      j++
    ) {
      sum += values[j]
      count++
    }

    result.push(sum / count)
  }

  return result
}

/**
 * Finds peaks and valleys in a dimension's values
 */
function findExtrema(
  values: number[],
  timestamps: string[],
  minAmplitude = 0.2,
): { peaks: Peak[]; valleys: Valley[] } {
  const peaks: Peak[] = []
  const valleys: Valley[] = []

  // Use moving average to smooth out noise
  const smoothedValues = calculateMovingAverage(values, 3)

  for (let i = 1; i < smoothedValues.length - 1; i++) {
    const prev = smoothedValues[i - 1]
    const curr = smoothedValues[i]
    const next = smoothedValues[i + 1]

    // Peak detection
    if (curr > prev && curr > next) {
      peaks.push({
        index: i,
        value: values[i],
        timestamp: timestamps[i],
      })
    }
    // Valley detection
    else if (curr < prev && curr < next) {
      valleys.push({
        index: i,
        value: values[i],
        timestamp: timestamps[i],
      })
    }
  }

  // Filter out insignificant oscillations
  const significantPeaks = peaks.filter((peak, i) => {
    if (i === 0) {
      return true
    }
    const prevValley = valleys.find((v) => v.index < peak.index)
    return prevValley && Math.abs(peak.value - prevValley.value) >= minAmplitude
  })

  const significantValleys = valleys.filter((valley, i) => {
    if (i === 0) {
      return true
    }
    const prevPeak = peaks.find((p) => p.index < valley.index)
    return prevPeak && Math.abs(valley.value - prevPeak.value) >= minAmplitude
  })

  return { peaks: significantPeaks, valleys: significantValleys }
}

/**
 * Analyzes oscillation characteristics
 */
function analyzeOscillation(
  peaks: Peak[],
  valleys: Valley[],
  startTime: Date,
  endTime: Date,
): Oscillation {
  // Calculate average amplitude
  let totalAmplitude = 0
  let oscillationCount = 0

  for (let i = 0; i < peaks.length; i++) {
    const peak = peaks[i]
    const prevValley = valleys.find((v) => v.index < peak.index)
    const nextValley = valleys.find((v) => v.index > peak.index)

    if (prevValley && nextValley) {
      totalAmplitude += Math.abs(peak.value - prevValley.value)
      totalAmplitude += Math.abs(peak.value - nextValley.value)
      oscillationCount += 2
    }
  }

  const averageAmplitude =
    oscillationCount > 0 ? totalAmplitude / oscillationCount : 0

  // Calculate frequency (oscillations per hour)
  const durationHours =
    (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)
  const frequency = peaks.length / durationHours

  return {
    peaks,
    valleys,
    averageAmplitude,
    frequency,
    startTime,
    endTime,
  }
}

/**
 * Helper to extract dimension value from emotion map, supporting both old and new formats
 */
function getDimensionValue(
  map: any,
  dimension: 'pleasure' | 'valence' | 'arousal' | 'dominance',
): number {
  // Handle legacy format with direct properties
  if (map[dimension] !== undefined) {
    return map[dimension]
  }

  // Handle newer format with primaryVector
  if (
    map.primaryVector &&
    map.primaryVector[convertLegacyDimension(dimension)] !== undefined
  ) {
    return map.primaryVector[convertLegacyDimension(dimension)]
  }

  // Handle case where value doesn't exist
  return 0
}

/**
 * Convert legacy dimension names to new format
 */
function convertLegacyDimension(
  dimension: 'pleasure' | 'valence' | 'arousal' | 'dominance',
): 'valence' | 'arousal' | 'dominance' {
  if (dimension === 'pleasure') {
    return 'valence'
  }
  return dimension
}

/**
 * Detects oscillation patterns in a dimension's values
 */
export function detectOscillations(
  emotionMaps: DimensionalEmotionMap[],
  dimensionInput: 'pleasure' | 'valence' | 'arousal' | 'dominance',
  minAmplitude = 0.2, // Minimum amplitude to consider as significant oscillation
  minOscillations = 2, // Minimum number of peaks to consider as an oscillation pattern
): OscillationPattern[] {
  if (emotionMaps.length < 3) {
    // Need at least 3 points to detect oscillation
    return []
  }

  // Convert legacy dimension name if needed
  const dimension = convertLegacyDimension(dimensionInput)

  // Extract dimension values and timestamps
  const values = emotionMaps.map((map) =>
    getDimensionValue(map, dimensionInput),
  )
  const timestamps = emotionMaps.map((map) =>
    typeof map.timestamp === 'string'
      ? map.timestamp
      : map.timestamp.toISOString(),
  )

  // Find peaks and valleys
  const { peaks, valleys } = findExtrema(values, timestamps, minAmplitude)

  // If not enough peaks, no significant oscillation pattern
  if (peaks.length < minOscillations) {
    return []
  }

  // Analyze oscillation characteristics
  const oscillation = analyzeOscillation(
    peaks,
    valleys,
    new Date(timestamps[0]),
    new Date(timestamps[timestamps.length - 1]),
  )

  // Convert to pattern format
  return [
    {
      type: 'oscillation',
      dimension,
      strength: Math.min(
        oscillation.averageAmplitude, // Normalized by amplitude
        Math.min(oscillation.frequency / 2, 1), // Normalized by frequency (cap at 2/hour)
      ),
      startTime: oscillation.startTime,
      endTime: oscillation.endTime,
      description:
        `${dimension} shows ${peaks.length} oscillations with average amplitude of ` +
        `${(oscillation.averageAmplitude * 100).toFixed(1)}% and frequency of ` +
        `${oscillation.frequency.toFixed(1)} per hour`,
    },
  ]
}
