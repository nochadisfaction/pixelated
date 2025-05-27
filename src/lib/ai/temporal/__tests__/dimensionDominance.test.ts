import { detectTemporalPatterns, analyzePatterns } from '../patternDetection'
import type { DimensionalEmotionMap } from '../../emotions/dimensionalTypes'

describe('Dimension Dominance Pattern Detection', () => {
  describe('detectTemporalPatterns - dimension dominance', () => {
    it('should detect valence dominance', () => {
      const points: DimensionalEmotionMap[] = [
        {
          timestamp: new Date('2025-01-01T10:00:00Z').toISOString(),
          valence: 0.8, // High valence (dominant)
          arousal: 0.3,
          dominance: 0.2,
        },
        {
          timestamp: new Date('2025-01-01T10:30:00Z').toISOString(),
          valence: 0.7, // High valence (dominant)
          arousal: 0.4,
          dominance: 0.3,
        },
        {
          timestamp: new Date('2025-01-01T11:00:00Z').toISOString(),
          valence: 0.9, // High valence (dominant)
          arousal: 0.5,
          dominance: 0.4,
        },
        {
          timestamp: new Date('2025-01-01T11:30:00Z').toISOString(),
          valence: 0.8, // High valence (dominant)
          arousal: 0.4,
          dominance: 0.3,
        },
      ]

      const patterns = detectTemporalPatterns(points)
      const dominancePatterns = patterns.filter(
        (p) => p.type === 'dimension_dominance',
      )

      expect(dominancePatterns.length).toBeGreaterThan(0)

      const valenceDominance = dominancePatterns.find(
        (p) => p.dimension === 'valence',
      )
      expect(valenceDominance).toBeDefined()
      expect(valenceDominance?.strength).toBeGreaterThan(0.5)
    })

    it('should detect arousal dominance', () => {
      const points: DimensionalEmotionMap[] = [
        {
          timestamp: new Date('2025-01-01T10:00:00Z').toISOString(),
          valence: 0.3,
          arousal: 0.8, // High arousal (dominant)
          dominance: 0.2,
        },
        {
          timestamp: new Date('2025-01-01T10:30:00Z').toISOString(),
          valence: 0.4,
          arousal: 0.7, // High arousal (dominant)
          dominance: 0.3,
        },
        {
          timestamp: new Date('2025-01-01T11:00:00Z').toISOString(),
          valence: 0.3,
          arousal: 0.9, // High arousal (dominant)
          dominance: 0.4,
        },
        {
          timestamp: new Date('2025-01-01T11:30:00Z').toISOString(),
          valence: 0.2,
          arousal: 0.8, // High arousal (dominant)
          dominance: 0.3,
        },
      ]

      const patterns = detectTemporalPatterns(points)
      const dominancePatterns = patterns.filter(
        (p) => p.type === 'dimension_dominance',
      )

      expect(dominancePatterns.length).toBeGreaterThan(0)

      const arousalDominance = dominancePatterns.find(
        (p) => p.dimension === 'arousal',
      )
      expect(arousalDominance).toBeDefined()
      expect(arousalDominance?.strength).toBeGreaterThan(0.5)
    })

    it('should not detect dominance when dimensions are balanced', () => {
      const points: DimensionalEmotionMap[] = [
        {
          timestamp: new Date('2025-01-01T10:00:00Z').toISOString(),
          valence: 0.5,
          arousal: 0.5,
          dominance: 0.5,
        },
        {
          timestamp: new Date('2025-01-01T10:30:00Z').toISOString(),
          valence: 0.6,
          arousal: 0.5,
          dominance: 0.5,
        },
        {
          timestamp: new Date('2025-01-01T11:00:00Z').toISOString(),
          valence: 0.5,
          arousal: 0.6,
          dominance: 0.5,
        },
        {
          timestamp: new Date('2025-01-01T11:30:00Z').toISOString(),
          valence: 0.5,
          arousal: 0.5,
          dominance: 0.6,
        },
      ]

      const patterns = detectTemporalPatterns(points)
      const dominancePatterns = patterns.filter(
        (p) => p.type === 'dimension_dominance',
      )

      // No dimension should be dominant when they're balanced
      expect(dominancePatterns.length).toBe(0)
    })

    it('should detect dominance with primaryVector format', () => {
      const points: DimensionalEmotionMap[] = [
        {
          timestamp: new Date('2025-01-01T10:00:00Z').toISOString(),
          primaryVector: { valence: 0.3, arousal: 0.2, dominance: 0.8 },
          emotionVectors: [],
          quadrant: 'neutral',
          intensity: 0.5,
          dimensionalDistribution: {
            valence: { positive: 0.5, negative: 0.5 },
            arousal: { high: 0.5, low: 0.5 },
            dominance: { high: 0.5, low: 0.5 },
          },
          dominantDimensions: [],
        },
        {
          timestamp: new Date('2025-01-01T10:30:00Z').toISOString(),
          primaryVector: { valence: 0.3, arousal: 0.3, dominance: 0.7 },
          emotionVectors: [],
          quadrant: 'neutral',
          intensity: 0.5,
          dimensionalDistribution: {
            valence: { positive: 0.5, negative: 0.5 },
            arousal: { high: 0.5, low: 0.5 },
            dominance: { high: 0.5, low: 0.5 },
          },
          dominantDimensions: [],
        },
        {
          timestamp: new Date('2025-01-01T11:00:00Z').toISOString(),
          primaryVector: { valence: 0.4, arousal: 0.3, dominance: 0.9 },
          emotionVectors: [],
          quadrant: 'neutral',
          intensity: 0.5,
          dimensionalDistribution: {
            valence: { positive: 0.5, negative: 0.5 },
            arousal: { high: 0.5, low: 0.5 },
            dominance: { high: 0.5, low: 0.5 },
          },
          dominantDimensions: [],
        },
        {
          timestamp: new Date('2025-01-01T11:30:00Z').toISOString(),
          primaryVector: { valence: 0.2, arousal: 0.3, dominance: 0.8 },
          emotionVectors: [],
          quadrant: 'neutral',
          intensity: 0.5,
          dimensionalDistribution: {
            valence: { positive: 0.5, negative: 0.5 },
            arousal: { high: 0.5, low: 0.5 },
            dominance: { high: 0.5, low: 0.5 },
          },
          dominantDimensions: [],
        },
      ]

      const patterns = detectTemporalPatterns(points)
      const dominancePatterns = patterns.filter(
        (p) => p.type === 'dimension_dominance',
      )

      expect(dominancePatterns.length).toBeGreaterThan(0)

      const dominanceDominance = dominancePatterns.find(
        (p) => p.dimension === 'dominance',
      )
      expect(dominanceDominance).toBeDefined()
      expect(dominanceDominance?.strength).toBeGreaterThan(0.5)
    })
  })

  describe('analyzePatterns - dimension dominance', () => {
    it('should generate insights for dimension dominance patterns', () => {
      const points: DimensionalEmotionMap[] = [
        {
          timestamp: new Date('2025-01-01T10:00:00Z').toISOString(),
          valence: 0.3,
          arousal: 0.8,
          dominance: 0.2,
        },
        {
          timestamp: new Date('2025-01-01T10:30:00Z').toISOString(),
          valence: 0.4,
          arousal: 0.7,
          dominance: 0.3,
        },
        {
          timestamp: new Date('2025-01-01T11:00:00Z').toISOString(),
          valence: 0.3,
          arousal: 0.9,
          dominance: 0.4,
        },
        {
          timestamp: new Date('2025-01-01T11:30:00Z').toISOString(),
          valence: 0.2,
          arousal: 0.8,
          dominance: 0.3,
        },
      ]

      const patterns = detectTemporalPatterns(points)
      const insights = analyzePatterns(patterns)

      expect(insights.length).toBeGreaterThan(0)
      // Check for both the pattern description and the clinical insight
      expect(
        insights.some((i) => i.includes('strongest') && i.includes('arousal')),
      ).toBe(true)
      expect(
        insights.some((i) => i.includes('energy') || i.includes('activation')),
      ).toBe(true)
    })
  })
})
