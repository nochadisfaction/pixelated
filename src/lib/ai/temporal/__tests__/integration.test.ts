import { detectOscillations } from '../oscillations'
import { detectTemporalPatterns, analyzePatterns } from '../patternDetection'
import type {
  DimensionalEmotionMap,
  EmotionVector,
  EmotionDimension,
} from '../../emotions/dimensionalTypes'

function generateOscillatingData(
  dimension: 'valence' | 'arousal' | 'dominance',
  amplitude: number,
  frequency: number,
  numPoints: number,
): DimensionalEmotionMap[] {
  const data: DimensionalEmotionMap[] = []
  const startTime = new Date('2023-01-01T00:00:00Z')

  for (let i = 0; i < numPoints; i++) {
    const timestamp = new Date(startTime.getTime() + i * 60000) // 1 minute intervals
    const value =
      amplitude * Math.sin((2 * Math.PI * frequency * i) / numPoints)

    const primaryVector: EmotionVector = {
      valence: dimension === 'valence' ? value : 0,
      arousal: dimension === 'arousal' ? value : 0,
      dominance: dimension === 'dominance' ? value : 0,
    }

    const dominantDimension: EmotionDimension = {
      name: dimension,
      value: value,
      polarity: value >= 0 ? 'positive' : 'negative',
      strength: value >= 0.7 ? 'strong' : value >= 0.3 ? 'moderate' : 'weak',
    }

    data.push({
      timestamp,
      primaryVector,
      emotionVectors: [],
      quadrant: 'neutral',
      intensity: Math.abs(value),
      dominantDimensions: [dominantDimension],
      dimensionalDistribution: {
        valence: {
          positive: value >= 0 ? value : 0,
          negative: value < 0 ? Math.abs(value) : 0,
        },
        arousal: { high: 0.5, low: 0.5 },
        dominance: { high: 0.5, low: 0.5 },
      },
    })
  }

  return data
}

describe('Oscillation Detection', () => {
  it('should detect simple oscillation patterns', () => {
    const data = generateOscillatingData('valence', 0.5, 1, 60)
    const patterns = detectOscillations(data, 'valence')

    expect(patterns.length).toBeGreaterThan(0)
    expect(patterns[0].type).toBe('oscillation')
    expect(patterns[0].dimension).toBe('valence')
    expect(patterns[0].strength).toBeGreaterThan(0)
  })

  it('should not detect patterns with insufficient amplitude', () => {
    const data = generateOscillatingData('valence', 0.1, 1, 60)
    const patterns = detectOscillations(data, 'valence', 0.2)

    expect(patterns.length).toBe(0)
  })

  it('should detect patterns with different frequencies', () => {
    const data = generateOscillatingData('valence', 0.5, 2, 60)
    const patterns = detectOscillations(data, 'valence')

    expect(patterns.length).toBeGreaterThan(0)
    expect(patterns[0].strength).toBeGreaterThan(0)
  })

  it('should handle multiple dimensions', () => {
    const arousalData = generateOscillatingData('arousal', 0.5, 1, 60)
    const arousalPatterns = detectOscillations(arousalData, 'arousal')

    const dominanceData = generateOscillatingData('dominance', 0.5, 1, 60)
    const dominancePatterns = detectOscillations(dominanceData, 'dominance')

    expect(arousalPatterns.length).toBeGreaterThan(0)
    expect(dominancePatterns.length).toBeGreaterThan(0)
    expect(arousalPatterns[0].dimension).toBe('arousal')
    expect(dominancePatterns[0].dimension).toBe('dominance')
  })
})

describe('Pattern Detection Integration', () => {
  const generateOscillatingData = (
    dimension: 'valence' | 'arousal' | 'dominance',
    startTime: Date,
    count: number,
    amplitude: number = 0.4,
  ): DimensionalEmotionMap[] => {
    return Array.from({ length: count }, (_, i) => {
      const primaryVector: EmotionVector = {
        valence:
          dimension === 'valence'
            ? 0.5 + amplitude * Math.sin(i * Math.PI)
            : 0.5,
        arousal:
          dimension === 'arousal'
            ? 0.5 + amplitude * Math.sin(i * Math.PI)
            : 0.5,
        dominance:
          dimension === 'dominance'
            ? 0.5 + amplitude * Math.sin(i * Math.PI)
            : 0.5,
      }

      const value = primaryVector[dimension]
      const dominantDimension: EmotionDimension = {
        name: dimension,
        value,
        polarity:
          dimension === 'arousal' || dimension === 'dominance'
            ? value > 0
              ? 'high'
              : 'low'
            : value > 0
              ? 'positive'
              : 'negative',
        strength: 'moderate',
      }

      return {
        timestamp: new Date(startTime.getTime() + i * 30 * 60 * 1000),
        primaryVector,
        emotionVectors: [primaryVector],
        quadrant: 'neutral',
        intensity: Math.abs(amplitude * Math.sin(i * Math.PI)),
        dimensionalDistribution: {
          valence: { positive: 0.5, negative: 0.5 },
          arousal: { high: 0.5, low: 0.5 },
          dominance: { high: 0.5, low: 0.5 },
        },
        dominantDimensions: [dominantDimension],
      }
    })
  }

  describe('Oscillation Detection Integration', () => {
    it('should detect oscillations consistently between both systems', () => {
      const startTime = new Date('2025-01-01T10:00:00Z')
      const points = generateOscillatingData('valence', startTime, 6)

      // Direct oscillation detection
      const oscillations = detectOscillations(points, 'valence')

      // Pattern detection system
      const patterns = detectTemporalPatterns(points)
      const patternOscillations = patterns.filter(
        (p) => p.type === 'oscillation' && p.dimension === 'valence',
      )

      expect(oscillations.length).toBeGreaterThan(0)
      expect(patternOscillations.length).toBeGreaterThan(0)
      expect(oscillations.length).toBe(patternOscillations.length)
    })

    it('should detect multi-dimensional oscillations', () => {
      const startTime = new Date('2025-01-01T10:00:00Z')
      const valencePoints = generateOscillatingData('valence', startTime, 6)
      const arousalPoints = generateOscillatingData('arousal', startTime, 6)

      // Combine oscillations in both dimensions
      const points = valencePoints.map((point, i) => ({
        ...point,
        primaryVector: {
          ...point.primaryVector,
          arousal: arousalPoints[i].primaryVector.arousal,
        },
      }))

      const patterns = detectTemporalPatterns(points)
      const oscillations = patterns.filter((p) => p.type === 'oscillation')

      expect(oscillations.length).toBe(2) // One for each dimension
      expect(oscillations.map((o) => o.dimension)).toContain('valence')
      expect(oscillations.map((o) => o.dimension)).toContain('arousal')
    })
  })

  describe('Pattern Analysis Integration', () => {
    it('should generate insights that reflect detected oscillations', () => {
      const startTime = new Date('2025-01-01T10:00:00Z')
      const points = generateOscillatingData('valence', startTime, 6)

      const oscillations = detectOscillations(points, 'valence')
      const patterns = detectTemporalPatterns(points)
      const analysis = analyzePatterns(patterns)

      expect(oscillations.length).toBeGreaterThan(0)
      expect(
        analysis.some(
          (i) => i.includes('valence') && i.includes('oscillation'),
        ),
      ).toBe(true)
    })

    it('should reflect oscillation characteristics in insights', () => {
      const startTime = new Date('2025-01-01T10:00:00Z')
      const points = generateOscillatingData('valence', startTime, 6, 0.8) // High amplitude

      const patterns = detectTemporalPatterns(points)
      const analysis = analyzePatterns(patterns)

      // Should mention high amplitude/intensity in insights
      expect(
        analysis.some(
          (i) =>
            i.includes('valence') &&
            (i.includes('strong') ||
              i.includes('high') ||
              i.includes('intense')),
        ),
      ).toBe(true)
    })

    it('should handle multiple pattern types together', () => {
      const startTime = new Date('2025-01-01T10:00:00Z')
      const points = [
        ...generateOscillatingData('valence', startTime, 3),
        // Add a clear quadrant transition
        {
          timestamp: new Date(startTime.getTime() + 4 * 30 * 60 * 1000),
          primaryVector: { valence: 0.8, arousal: 0.8, dominance: 0.5 },
          emotionVectors: [{ valence: 0.8, arousal: 0.8, dominance: 0.5 }],
          quadrant: 'high-arousal positive-valence',
          intensity: 0.8,
          dimensionalDistribution: {
            valence: { positive: 0.8, negative: 0.2 },
            arousal: { high: 0.8, low: 0.2 },
            dominance: { high: 0.5, low: 0.5 },
          },
          dominantDimensions: [
            {
              name: 'valence',
              value: 0.8,
              polarity: 'positive',
              strength: 'strong',
            } as EmotionDimension,
            {
              name: 'arousal',
              value: 0.8,
              polarity: 'high',
              strength: 'strong',
            } as EmotionDimension,
          ],
        } as DimensionalEmotionMap,
      ]

      const patterns = detectTemporalPatterns(points)
      const analysis = analyzePatterns(patterns)

      // Should have insights about both oscillations and transitions
      expect(analysis.some((i) => i.includes('oscillation'))).toBe(true)
      expect(analysis.some((i) => i.includes('transition'))).toBe(true)
    })
  })
})
