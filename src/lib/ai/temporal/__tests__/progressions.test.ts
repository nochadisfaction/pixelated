import { detectTemporalPatterns, analyzePatterns } from '../patternDetection'
import type { DimensionalEmotionMap } from '../../emotions/dimensionalTypes'

describe('Progression Pattern Detection', () => {
  describe('detectTemporalPatterns - progressions', () => {
    it('should detect increasing trends in valence', () => {
      const points: DimensionalEmotionMap[] = [
        {
          timestamp: new Date('2025-01-01T10:00:00Z').toISOString(),
          valence: 0.2,
          arousal: 0.5,
          dominance: 0.5,
        },
        {
          timestamp: new Date('2025-01-01T10:30:00Z').toISOString(),
          valence: 0.4,
          arousal: 0.5,
          dominance: 0.5,
        },
        {
          timestamp: new Date('2025-01-01T11:00:00Z').toISOString(),
          valence: 0.6,
          arousal: 0.5,
          dominance: 0.5,
        },
        {
          timestamp: new Date('2025-01-01T11:30:00Z').toISOString(),
          valence: 0.8,
          arousal: 0.5,
          dominance: 0.5,
        },
      ]

      const patterns = detectTemporalPatterns(points)
      const progressions = patterns.filter((p) => p.type === 'progression')

      expect(progressions.length).toBeGreaterThan(0)

      const valenceProgressions = progressions.filter(
        (p) => p.dimension === 'valence',
      )
      expect(valenceProgressions.length).toBe(1)
      expect(valenceProgressions[0].direction).toBe('increasing')
      expect(valenceProgressions[0].strength).toBeGreaterThan(0.5)
    })

    it('should detect decreasing trends in arousal', () => {
      const points: DimensionalEmotionMap[] = [
        {
          timestamp: new Date('2025-01-01T10:00:00Z').toISOString(),
          valence: 0.5,
          arousal: 0.8,
          dominance: 0.5,
        },
        {
          timestamp: new Date('2025-01-01T10:30:00Z').toISOString(),
          valence: 0.5,
          arousal: 0.6,
          dominance: 0.5,
        },
        {
          timestamp: new Date('2025-01-01T11:00:00Z').toISOString(),
          valence: 0.5,
          arousal: 0.4,
          dominance: 0.5,
        },
        {
          timestamp: new Date('2025-01-01T11:30:00Z').toISOString(),
          valence: 0.5,
          arousal: 0.2,
          dominance: 0.5,
        },
      ]

      const patterns = detectTemporalPatterns(points)
      const progressions = patterns.filter((p) => p.type === 'progression')

      expect(progressions.length).toBeGreaterThan(0)

      const arousalProgressions = progressions.filter(
        (p) => p.dimension === 'arousal',
      )
      expect(arousalProgressions.length).toBe(1)
      expect(arousalProgressions[0].direction).toBe('decreasing')
      expect(arousalProgressions[0].strength).toBeGreaterThan(0.5)
    })

    it('should not detect progression when trend is inconsistent', () => {
      const points: DimensionalEmotionMap[] = [
        {
          timestamp: new Date('2025-01-01T10:00:00Z').toISOString(),
          valence: 0.2,
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
          valence: 0.4,
          arousal: 0.5,
          dominance: 0.5,
        },
        {
          timestamp: new Date('2025-01-01T11:30:00Z').toISOString(),
          valence: 0.8,
          arousal: 0.5,
          dominance: 0.5,
        },
      ]

      const patterns = detectTemporalPatterns(points)
      const progressions = patterns.filter((p) => p.type === 'progression')
      const valenceProgressions = progressions.filter(
        (p) => p.dimension === 'valence',
      )

      // Should not detect progression if there isn't consistent direction
      expect(valenceProgressions.length).toBe(0)
    })

    it('should not detect progression when change is too small', () => {
      const points: DimensionalEmotionMap[] = [
        {
          timestamp: new Date('2025-01-01T10:00:00Z').toISOString(),
          valence: 0.5,
          arousal: 0.5,
          dominance: 0.5,
        },
        {
          timestamp: new Date('2025-01-01T10:30:00Z').toISOString(),
          valence: 0.52,
          arousal: 0.5,
          dominance: 0.5,
        },
        {
          timestamp: new Date('2025-01-01T11:00:00Z').toISOString(),
          valence: 0.54,
          arousal: 0.5,
          dominance: 0.5,
        },
        {
          timestamp: new Date('2025-01-01T11:30:00Z').toISOString(),
          valence: 0.56,
          arousal: 0.5,
          dominance: 0.5,
        },
      ]

      const patterns = detectTemporalPatterns(points)
      const progressions = patterns.filter((p) => p.type === 'progression')
      const valenceProgressions = progressions.filter(
        (p) => p.dimension === 'valence',
      )

      // Should not detect progression if overall change is too small (below 0.2 default threshold)
      expect(valenceProgressions.length).toBe(0)
    })

    it('should detect the right progression with primaryVector format', () => {
      const points: DimensionalEmotionMap[] = [
        {
          timestamp: new Date('2025-01-01T10:00:00Z').toISOString(),
          primaryVector: { valence: 0.2, arousal: 0.5, dominance: 0.5 },
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
          primaryVector: { valence: 0.4, arousal: 0.5, dominance: 0.5 },
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
          primaryVector: { valence: 0.6, arousal: 0.5, dominance: 0.5 },
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
          primaryVector: { valence: 0.8, arousal: 0.5, dominance: 0.5 },
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
      const progressions = patterns.filter((p) => p.type === 'progression')

      expect(progressions.length).toBeGreaterThan(0)

      const valenceProgressions = progressions.filter(
        (p) => p.dimension === 'valence',
      )
      expect(valenceProgressions.length).toBe(1)
      expect(valenceProgressions[0].direction).toBe('increasing')
      expect(valenceProgressions[0].strength).toBeGreaterThan(0.5)
    })
  })

  describe('analyzePatterns - progressions', () => {
    it('should generate insights for progression patterns', () => {
      const points: DimensionalEmotionMap[] = [
        {
          timestamp: new Date('2025-01-01T10:00:00Z').toISOString(),
          valence: 0.2,
          arousal: 0.5,
          dominance: 0.5,
        },
        {
          timestamp: new Date('2025-01-01T10:30:00Z').toISOString(),
          valence: 0.4,
          arousal: 0.5,
          dominance: 0.5,
        },
        {
          timestamp: new Date('2025-01-01T11:00:00Z').toISOString(),
          valence: 0.6,
          arousal: 0.5,
          dominance: 0.5,
        },
        {
          timestamp: new Date('2025-01-01T11:30:00Z').toISOString(),
          valence: 0.8,
          arousal: 0.5,
          dominance: 0.5,
        },
      ]

      const patterns = detectTemporalPatterns(points)
      const insights = analyzePatterns(patterns)

      expect(insights.length).toBeGreaterThan(0)
      expect(
        insights.some((i) => i.includes('trend') && i.includes('valence')),
      ).toBe(true)
    })
  })
})
